// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SpamStake.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SpamStakeTest is Test {
    SpamStake public spamStake;
    MockUSDC public usdc;
    
    address public poster = address(0x1);
    address public flagger1 = address(0x2);
    address public flagger2 = address(0x3);
    address public flagger3 = address(0x4);
    
    bytes32 public postId = keccak256("test-post-1");
    
    function setUp() public {
        usdc = new MockUSDC();
        spamStake = new SpamStake(address(usdc));
        
        // Distribute USDC
        usdc.transfer(poster, 10 * 10**6); // 10 USDC
        usdc.transfer(flagger1, 1 * 10**6);
        usdc.transfer(flagger2, 1 * 10**6);
        usdc.transfer(flagger3, 1 * 10**6);
    }
    
    function test_Stake() public {
        uint256 stakeAmount = 100000; // 0.10 USDC (min stake)
        
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        vm.stopPrank();
        
        (uint256 amount, , uint256 flagCount, bool slashed) = spamStake.getStake(postId);
        
        assertEq(amount, stakeAmount);
        assertEq(flagCount, 0);
        assertFalse(slashed);
    }
    
    function test_StakeBelowMinimum_Reverts() public {
        uint256 lowStake = 50000; // Below minimum
        
        vm.startPrank(poster);
        usdc.approve(address(spamStake), lowStake);
        vm.expectRevert("Below minimum stake");
        spamStake.stake(postId, lowStake);
        vm.stopPrank();
    }
    
    function test_Flag() public {
        // Setup: poster stakes
        uint256 stakeAmount = 100000;
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        vm.stopPrank();
        
        // Flagger1 flags
        vm.prank(flagger1);
        spamStake.flag(postId);
        
        (, , uint256 flagCount, ) = spamStake.getStake(postId);
        assertEq(flagCount, 1);
    }
    
    function test_AutoSlashOnThreshold() public {
        // Setup: poster stakes
        uint256 stakeAmount = 100000;
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        vm.stopPrank();
        
        uint256 flagger1BalanceBefore = usdc.balanceOf(flagger1);
        uint256 flagger2BalanceBefore = usdc.balanceOf(flagger2);
        uint256 flagger3BalanceBefore = usdc.balanceOf(flagger3);
        
        // 3 flaggers = threshold reached = auto-slash
        vm.prank(flagger1);
        spamStake.flag(postId);
        
        vm.prank(flagger2);
        spamStake.flag(postId);
        
        vm.prank(flagger3);
        spamStake.flag(postId);
        
        // Check slashed
        (, , , bool slashed) = spamStake.getStake(postId);
        assertTrue(slashed);
        
        // Check flagger rewards (80% of stake / 3 flaggers)
        uint256 expectedReward = (stakeAmount * 8000 / 10000) / 3;
        
        assertEq(usdc.balanceOf(flagger1), flagger1BalanceBefore + expectedReward);
        assertEq(usdc.balanceOf(flagger2), flagger2BalanceBefore + expectedReward);
        assertEq(usdc.balanceOf(flagger3), flagger3BalanceBefore + expectedReward);
    }
    
    function test_Withdraw_AfterCooldown() public {
        // Setup: poster stakes
        uint256 stakeAmount = 100000;
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        
        uint256 balanceBefore = usdc.balanceOf(poster);
        
        // Fast forward past cooldown (7 days)
        vm.warp(block.timestamp + 8 days);
        
        spamStake.withdraw(postId);
        vm.stopPrank();
        
        assertEq(usdc.balanceOf(poster), balanceBefore + stakeAmount);
    }
    
    function test_Withdraw_BeforeCooldown_Reverts() public {
        // Setup: poster stakes
        uint256 stakeAmount = 100000;
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        
        // Try to withdraw immediately
        vm.expectRevert("Cooldown not passed");
        spamStake.withdraw(postId);
        vm.stopPrank();
    }
    
    function test_CannotFlagTwice() public {
        // Setup: poster stakes
        uint256 stakeAmount = 100000;
        vm.startPrank(poster);
        usdc.approve(address(spamStake), stakeAmount);
        spamStake.stake(postId, stakeAmount);
        vm.stopPrank();
        
        // Flagger1 flags once
        vm.startPrank(flagger1);
        spamStake.flag(postId);
        
        // Try to flag again
        vm.expectRevert("Already flagged by you");
        spamStake.flag(postId);
        vm.stopPrank();
    }
    
    function testFuzz_StakeAmount(uint256 amount) public {
        // Bound to valid range
        amount = bound(amount, 100000, 1000 * 10**6); // 0.10 to 1000 USDC
        
        // Give poster enough USDC
        usdc.mint(poster, amount);
        
        vm.startPrank(poster);
        usdc.approve(address(spamStake), amount);
        
        bytes32 uniquePostId = keccak256(abi.encodePacked("fuzz-post-", amount));
        spamStake.stake(uniquePostId, amount);
        vm.stopPrank();
        
        (uint256 stakedAmount, , , ) = spamStake.getStake(uniquePostId);
        assertEq(stakedAmount, amount);
    }
}
