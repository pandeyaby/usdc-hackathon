// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHashVerifiedEscrow
 * @notice Interface for automated escrow with hash-based work verification
 * @dev Enables trustless settlement when deliverables are deterministic
 */
interface IHashVerifiedEscrow {
    
    // ============ Enums ============
    
    enum JobStatus {
        Open,           // Awaiting worker assignment
        InProgress,     // Worker assigned, work ongoing
        Submitted,      // Work submitted, in dispute window
        Completed,      // Hash verified, funds released
        Disputed,       // Under dispute resolution
        Cancelled,      // Job cancelled by client
        Expired         // Deadline passed without submission
    }
    
    // ============ Structs ============
    
    struct Job {
        uint256 id;
        address client;
        address worker;
        address token;          // Payment token (USDC)
        uint256 amount;
        bytes32 expectedHash;   // Hash commitment from client
        bytes32 submittedHash;  // Hash submitted by worker
        uint256 createdAt;
        uint256 deadline;
        uint256 submittedAt;
        uint256 disputeDeadline;
        JobStatus status;
        string metadataUri;     // IPFS link to job details
    }
    
    struct JobParams {
        address worker;         // Assigned worker (or address(0) for open)
        address token;          // Payment token
        uint256 amount;         // Payment amount
        bytes32 expectedHash;   // Expected deliverable hash
        uint256 deadline;       // Work deadline
        uint256 disputeWindow;  // Seconds for dispute after submission
        string metadataUri;     // Job description URI
    }
    
    // ============ Events ============
    
    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed worker,
        uint256 amount,
        bytes32 expectedHash,
        uint256 deadline
    );
    
    event WorkerAssigned(
        uint256 indexed jobId,
        address indexed worker
    );
    
    event WorkSubmitted(
        uint256 indexed jobId,
        address indexed worker,
        bytes32 submittedHash,
        bool hashMatches
    );
    
    event JobCompleted(
        uint256 indexed jobId,
        address indexed worker,
        uint256 amount
    );
    
    event JobDisputed(
        uint256 indexed jobId,
        address indexed disputant,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed jobId,
        uint256 clientAmount,
        uint256 workerAmount
    );
    
    event JobCancelled(
        uint256 indexed jobId,
        address indexed client,
        uint256 refundAmount
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Create a new escrow job with hash commitment
     * @param params Job creation parameters
     * @return jobId The ID of the created job
     */
    function createJob(JobParams calldata params) external returns (uint256 jobId);
    
    /**
     * @notice Worker claims an open job
     * @param jobId The job to claim
     */
    function claimJob(uint256 jobId) external;
    
    /**
     * @notice Worker submits work with hash proof
     * @param jobId The job ID
     * @param hash Hash of the submitted work
     * @param proofUri URI to the actual deliverable (for verification)
     */
    function submitWork(
        uint256 jobId,
        bytes32 hash,
        string calldata proofUri
    ) external;
    
    /**
     * @notice Release funds after dispute window (if hash matches)
     * @param jobId The job ID
     * @dev Callable by anyone - trustless release
     */
    function release(uint256 jobId) external;
    
    /**
     * @notice Client disputes a submission
     * @param jobId The job ID
     * @param reason Reason for dispute
     */
    function dispute(uint256 jobId, string calldata reason) external;
    
    /**
     * @notice Arbiter resolves a dispute
     * @param jobId The job ID
     * @param clientAmount Amount to return to client
     * @param workerAmount Amount to pay worker
     */
    function resolveDispute(
        uint256 jobId,
        uint256 clientAmount,
        uint256 workerAmount
    ) external;
    
    /**
     * @notice Client cancels an unclaimed job
     * @param jobId The job ID
     */
    function cancelJob(uint256 jobId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get job details
     * @param jobId The job ID
     * @return job The job struct
     */
    function getJob(uint256 jobId) external view returns (Job memory job);
    
    /**
     * @notice Check if hash matches expected
     * @param jobId The job ID
     * @return matches True if submitted hash equals expected hash
     */
    function hashMatches(uint256 jobId) external view returns (bool matches);
    
    /**
     * @notice Check if job can be released
     * @param jobId The job ID
     * @return releasable True if release conditions are met
     */
    function canRelease(uint256 jobId) external view returns (bool releasable);
    
    /**
     * @notice Get all jobs for a client
     * @param client The client address
     * @return jobIds Array of job IDs
     */
    function getClientJobs(address client) external view returns (uint256[] memory jobIds);
    
    /**
     * @notice Get all jobs for a worker
     * @param worker The worker address
     * @return jobIds Array of job IDs
     */
    function getWorkerJobs(address worker) external view returns (uint256[] memory jobIds);
}
