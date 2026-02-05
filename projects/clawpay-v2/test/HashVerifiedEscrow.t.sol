// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/HashVerifiedEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10**6);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract HashVerifiedEscrowTest is Test {
    HashVerifiedEscrow public escrow;
    MockUSDC public usdc;
    
    address public client = address(0x1);
    address public worker = address(0x2);
    address public arbiter = address(0x3);
    address public feeRecipient = address(0x4);
    
    bytes32 public expectedHash = keccak256("expected output");
    bytes32 public correctHash = keccak256("expected output");
    bytes32 public wrongHash = keccak256("wrong output");
    
    uint256 public constant JOB_AMOUNT = 100 * 10**6; // 100 USDC
    uint256 public constant DEADLINE = 7 days;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    
    function setUp() public {
        usdc = new MockUSDC();
        escrow = new HashVerifiedEscrow(feeRecipient);
        
        // Give client funds
        usdc.transfer(client, 1000 * 10**6);
        
        // Grant arbiter role
        escrow.grantRole(escrow.ARBITER_ROLE(), arbiter);
    }
    
    // ============ Job Creation Tests ============
    
    function test_CreateJob() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        
        IHashVerifiedEscrow.JobParams memory params = IHashVerifiedEscrow.JobParams({
            worker: worker,
            token: address(usdc),
            amount: JOB_AMOUNT,
            expectedHash: expectedHash,
            deadline: block.timestamp + DEADLINE,
            disputeWindow: DISPUTE_WINDOW,
            metadataUri: "ipfs://job-spec"
        });
        
        uint256 jobId = escrow.createJob(params);
        vm.stopPrank();
        
        assertEq(jobId, 1);
        assertEq(usdc.balanceOf(address(escrow)), JOB_AMOUNT);
    }
    
    function test_CreateJob_OpenJob() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        
        IHashVerifiedEscrow.JobParams memory params = IHashVerifiedEscrow.JobParams({
            worker: address(0), // Open job
            token: address(usdc),
            amount: JOB_AMOUNT,
            expectedHash: expectedHash,
            deadline: block.timestamp + DEADLINE,
            disputeWindow: DISPUTE_WINDOW,
            metadataUri: "ipfs://job-spec"
        });
        
        uint256 jobId = escrow.createJob(params);
        vm.stopPrank();
        
        IHashVerifiedEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(IHashVerifiedEscrow.JobStatus.Open));
    }
    
    // ============ Work Submission Tests ============
    
    function test_SubmitWork_HashMatch() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        assertTrue(escrow.hashMatches(jobId));
    }
    
    function test_SubmitWork_HashMismatch() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, wrongHash, "ipfs://deliverable");
        
        assertFalse(escrow.hashMatches(jobId));
    }
    
    // ============ Release Tests ============
    
    function test_Release_AfterDisputeWindow() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        
        uint256 workerBalanceBefore = usdc.balanceOf(worker);
        
        // Anyone can call release
        escrow.release(jobId);
        
        // Worker should receive amount minus fee
        uint256 fee = (JOB_AMOUNT * escrow.protocolFeeBps()) / 10000;
        assertEq(usdc.balanceOf(worker), workerBalanceBefore + JOB_AMOUNT - fee);
    }
    
    function test_Release_Reverts_HashMismatch() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, wrongHash, "ipfs://deliverable");
        
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        
        vm.expectRevert("Hash mismatch");
        escrow.release(jobId);
    }
    
    function test_Release_Reverts_DisputeWindowActive() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        // Don't fast forward
        vm.expectRevert("Dispute window active");
        escrow.release(jobId);
    }
    
    // ============ Dispute Tests ============
    
    function test_Dispute_ByClient() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        vm.prank(client);
        escrow.dispute(jobId, "Work incomplete");
        
        IHashVerifiedEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(IHashVerifiedEscrow.JobStatus.Disputed));
    }
    
    function test_Dispute_Reverts_AfterWindow() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        
        vm.prank(client);
        vm.expectRevert("Dispute window closed");
        escrow.dispute(jobId, "Too late");
    }
    
    // ============ Escalation Tests ============
    
    function test_Escalate_WorkerProtection() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        
        // Worker escalates because client ghosted
        vm.prank(worker);
        escrow.escalate(jobId, "Client not releasing despite hash match");
        
        IHashVerifiedEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(IHashVerifiedEscrow.JobStatus.Disputed));
    }
    
    // ============ Emergency Release Tests ============
    
    function test_EmergencyRelease_ExtendedWindow() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, correctHash, "ipfs://deliverable");
        
        // Fast forward past 2x dispute window (extended window)
        vm.warp(block.timestamp + (DISPUTE_WINDOW * 2) + 1);
        
        uint256 workerBalanceBefore = usdc.balanceOf(worker);
        
        // Anyone can trigger emergency release
        escrow.emergencyRelease(jobId);
        
        uint256 fee = (JOB_AMOUNT * escrow.protocolFeeBps()) / 10000;
        assertEq(usdc.balanceOf(worker), workerBalanceBefore + JOB_AMOUNT - fee);
    }
    
    // ============ Dispute Resolution Tests ============
    
    function test_ResolveDispute_SplitFunds() public {
        uint256 jobId = _createJob();
        
        vm.prank(worker);
        escrow.submitWork(jobId, wrongHash, "ipfs://deliverable");
        
        vm.prank(client);
        escrow.dispute(jobId, "Wrong output");
        
        uint256 clientAmount = 60 * 10**6; // 60 USDC refund
        uint256 workerAmount = 40 * 10**6; // 40 USDC for partial work
        
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        uint256 workerBalanceBefore = usdc.balanceOf(worker);
        
        vm.prank(arbiter);
        escrow.resolveDispute(jobId, clientAmount, workerAmount);
        
        assertEq(usdc.balanceOf(client), clientBalanceBefore + clientAmount);
        assertEq(usdc.balanceOf(worker), workerBalanceBefore + workerAmount);
    }
    
    // ============ Cancel Tests ============
    
    function test_CancelJob_OpenJob() public {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        
        IHashVerifiedEscrow.JobParams memory params = IHashVerifiedEscrow.JobParams({
            worker: address(0),
            token: address(usdc),
            amount: JOB_AMOUNT,
            expectedHash: expectedHash,
            deadline: block.timestamp + DEADLINE,
            disputeWindow: DISPUTE_WINDOW,
            metadataUri: "ipfs://job-spec"
        });
        
        uint256 jobId = escrow.createJob(params);
        
        uint256 balanceBefore = usdc.balanceOf(client);
        escrow.cancelJob(jobId);
        
        assertEq(usdc.balanceOf(client), balanceBefore + JOB_AMOUNT);
        vm.stopPrank();
    }
    
    // ============ Fuzz Tests ============
    
    function testFuzz_CreateJob_Amount(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000 * 10**6);
        
        usdc.mint(client, amount);
        
        vm.startPrank(client);
        usdc.approve(address(escrow), amount);
        
        IHashVerifiedEscrow.JobParams memory params = IHashVerifiedEscrow.JobParams({
            worker: worker,
            token: address(usdc),
            amount: amount,
            expectedHash: keccak256(abi.encodePacked("fuzz-", amount)),
            deadline: block.timestamp + DEADLINE,
            disputeWindow: DISPUTE_WINDOW,
            metadataUri: ""
        });
        
        uint256 jobId = escrow.createJob(params);
        vm.stopPrank();
        
        IHashVerifiedEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.amount, amount);
    }
    
    // ============ Helper Functions ============
    
    function _createJob() internal returns (uint256) {
        vm.startPrank(client);
        usdc.approve(address(escrow), JOB_AMOUNT);
        
        IHashVerifiedEscrow.JobParams memory params = IHashVerifiedEscrow.JobParams({
            worker: worker,
            token: address(usdc),
            amount: JOB_AMOUNT,
            expectedHash: expectedHash,
            deadline: block.timestamp + DEADLINE,
            disputeWindow: DISPUTE_WINDOW,
            metadataUri: "ipfs://job-spec"
        });
        
        uint256 jobId = escrow.createJob(params);
        vm.stopPrank();
        
        return jobId;
    }
}
