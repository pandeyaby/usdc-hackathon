// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IHashVerifiedEscrow.sol";

/**
 * @title HashVerifiedEscrow
 * @notice Automated escrow with hash-based work verification
 * @dev Part of ClawPay v2 - enabling trustless agent-to-agent transactions
 * 
 * Flow:
 * 1. Client creates job with expected_hash (hash of desired output)
 * 2. Worker submits work with actual_hash
 * 3. If hashes match → auto-release after dispute window
 * 4. If mismatch or disputed → arbiter resolution
 */
contract HashVerifiedEscrow is IHashVerifiedEscrow, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    
    uint256 public constant MIN_DISPUTE_WINDOW = 1 hours;
    uint256 public constant MAX_DISPUTE_WINDOW = 30 days;
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 24 hours;
    
    // ============ State ============
    
    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(address => uint256[]) public clientJobs;
    mapping(address => uint256[]) public workerJobs;
    
    // Protocol fee (basis points, 100 = 1%)
    uint256 public protocolFeeBps = 100;  // 1%
    address public feeRecipient;
    
    // ============ Constructor ============
    
    constructor(address _feeRecipient) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITER_ROLE, msg.sender);
        feeRecipient = _feeRecipient;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Create a new escrow job with hash commitment
     */
    function createJob(JobParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 jobId) 
    {
        require(params.amount > 0, "Amount must be > 0");
        require(params.expectedHash != bytes32(0), "Hash required");
        require(params.deadline > block.timestamp, "Deadline must be future");
        
        uint256 disputeWindow = params.disputeWindow;
        if (disputeWindow == 0) {
            disputeWindow = DEFAULT_DISPUTE_WINDOW;
        }
        require(
            disputeWindow >= MIN_DISPUTE_WINDOW && 
            disputeWindow <= MAX_DISPUTE_WINDOW,
            "Invalid dispute window"
        );
        
        // Transfer tokens to escrow
        IERC20(params.token).safeTransferFrom(
            msg.sender,
            address(this),
            params.amount
        );
        
        jobId = nextJobId++;
        
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.client = msg.sender;
        job.worker = params.worker;
        job.token = params.token;
        job.amount = params.amount;
        job.expectedHash = params.expectedHash;
        job.createdAt = block.timestamp;
        job.deadline = params.deadline;
        job.status = params.worker == address(0) ? JobStatus.Open : JobStatus.InProgress;
        job.metadataUri = params.metadataUri;
        
        // Store dispute window in submittedAt temporarily (will be used when work submitted)
        // This is a gas optimization - we reuse the slot
        job.submittedAt = disputeWindow;
        
        clientJobs[msg.sender].push(jobId);
        if (params.worker != address(0)) {
            workerJobs[params.worker].push(jobId);
        }
        
        emit JobCreated(
            jobId,
            msg.sender,
            params.worker,
            params.amount,
            params.expectedHash,
            params.deadline
        );
    }
    
    /**
     * @notice Worker claims an open job
     */
    function claimJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Open, "Job not open");
        require(block.timestamp < job.deadline, "Job expired");
        
        job.worker = msg.sender;
        job.status = JobStatus.InProgress;
        workerJobs[msg.sender].push(jobId);
        
        emit WorkerAssigned(jobId, msg.sender);
    }
    
    /**
     * @notice Worker submits work with hash proof
     */
    function submitWork(
        uint256 jobId,
        bytes32 hash,
        string calldata proofUri
    ) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.worker == msg.sender, "Not the worker");
        require(job.status == JobStatus.InProgress, "Invalid status");
        require(block.timestamp <= job.deadline, "Deadline passed");
        require(hash != bytes32(0), "Hash required");
        
        // Retrieve dispute window (stored in submittedAt during creation)
        uint256 disputeWindow = job.submittedAt;
        
        job.submittedHash = hash;
        job.submittedAt = block.timestamp;
        job.disputeDeadline = block.timestamp + disputeWindow;
        job.status = JobStatus.Submitted;
        job.metadataUri = proofUri;  // Update with proof location
        
        bool matches = hash == job.expectedHash;
        
        emit WorkSubmitted(jobId, msg.sender, hash, matches);
    }
    
    /**
     * @notice Release funds after dispute window (if hash matches)
     * @dev Trustless - callable by anyone
     */
    function release(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Submitted, "Not submitted");
        require(block.timestamp > job.disputeDeadline, "Dispute window active");
        require(job.submittedHash == job.expectedHash, "Hash mismatch");
        
        job.status = JobStatus.Completed;
        
        // Calculate and transfer fees
        uint256 fee = (job.amount * protocolFeeBps) / 10000;
        uint256 workerAmount = job.amount - fee;
        
        IERC20(job.token).safeTransfer(job.worker, workerAmount);
        if (fee > 0) {
            IERC20(job.token).safeTransfer(feeRecipient, fee);
        }
        
        emit JobCompleted(jobId, job.worker, workerAmount);
    }
    
    /**
     * @notice Client disputes a submission
     */
    function dispute(uint256 jobId, string calldata reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.client == msg.sender, "Not the client");
        require(job.status == JobStatus.Submitted, "Not submitted");
        require(block.timestamp <= job.disputeDeadline, "Dispute window closed");
        
        job.status = JobStatus.Disputed;
        
        emit JobDisputed(jobId, msg.sender, reason);
    }
    
    /**
     * @notice Worker disputes a non-release (hash matched but client didn't release)
     * @dev Allows worker to escalate if hash matched and dispute window passed
     */
    function escalate(uint256 jobId, string calldata reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.worker == msg.sender, "Not the worker");
        require(job.status == JobStatus.Submitted, "Not submitted");
        require(block.timestamp > job.disputeDeadline, "Dispute window still active");
        require(job.submittedHash == job.expectedHash, "Hash mismatch - use dispute");
        
        // If hash matched and dispute window passed, worker can escalate
        // This prevents client ghosting after verified delivery
        job.status = JobStatus.Disputed;
        
        emit JobDisputed(jobId, msg.sender, reason);
    }
    
    /**
     * @notice Emergency release for hash-matched jobs after extended delay
     * @dev If hash matched, client didn't dispute, and extended window passed,
     *      anyone can trigger release. Prevents permanent lockup.
     */
    function emergencyRelease(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Submitted, "Not submitted");
        require(job.submittedHash == job.expectedHash, "Hash mismatch");
        // Extended window: 2x dispute deadline
        require(
            block.timestamp > job.disputeDeadline + (job.disputeDeadline - job.submittedAt),
            "Extended window not passed"
        );
        
        job.status = JobStatus.Completed;
        
        uint256 fee = (job.amount * protocolFeeBps) / 10000;
        uint256 workerAmount = job.amount - fee;
        
        IERC20(job.token).safeTransfer(job.worker, workerAmount);
        if (fee > 0) {
            IERC20(job.token).safeTransfer(feeRecipient, fee);
        }
        
        emit JobCompleted(jobId, job.worker, workerAmount);
    }
    
    /**
     * @notice Arbiter resolves a dispute
     */
    function resolveDispute(
        uint256 jobId,
        uint256 clientAmount,
        uint256 workerAmount
    ) external nonReentrant onlyRole(ARBITER_ROLE) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed, "Not disputed");
        require(clientAmount + workerAmount <= job.amount, "Amounts exceed escrow");
        
        job.status = JobStatus.Completed;
        
        if (clientAmount > 0) {
            IERC20(job.token).safeTransfer(job.client, clientAmount);
        }
        if (workerAmount > 0) {
            IERC20(job.token).safeTransfer(job.worker, workerAmount);
        }
        
        // Any remainder goes to protocol
        uint256 remainder = job.amount - clientAmount - workerAmount;
        if (remainder > 0) {
            IERC20(job.token).safeTransfer(feeRecipient, remainder);
        }
        
        emit DisputeResolved(jobId, clientAmount, workerAmount);
    }
    
    /**
     * @notice Client cancels an unclaimed/expired job
     */
    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.client == msg.sender, "Not the client");
        require(
            job.status == JobStatus.Open || 
            (job.status == JobStatus.InProgress && block.timestamp > job.deadline),
            "Cannot cancel"
        );
        
        job.status = JobStatus.Cancelled;
        
        IERC20(job.token).safeTransfer(job.client, job.amount);
        
        emit JobCancelled(jobId, msg.sender, job.amount);
    }
    
    // ============ View Functions ============
    
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
    
    function hashMatches(uint256 jobId) external view returns (bool) {
        Job storage job = jobs[jobId];
        return job.submittedHash != bytes32(0) && 
               job.submittedHash == job.expectedHash;
    }
    
    function canRelease(uint256 jobId) external view returns (bool) {
        Job storage job = jobs[jobId];
        return job.status == JobStatus.Submitted &&
               block.timestamp > job.disputeDeadline &&
               job.submittedHash == job.expectedHash;
    }
    
    function getClientJobs(address client) external view returns (uint256[] memory) {
        return clientJobs[client];
    }
    
    function getWorkerJobs(address worker) external view returns (uint256[] memory) {
        return workerJobs[worker];
    }
    
    // ============ Admin Functions ============
    
    function setProtocolFee(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        protocolFeeBps = _feeBps;
    }
    
    function setFeeRecipient(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
    }
}
