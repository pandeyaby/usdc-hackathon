// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SpamStake
 * @notice Economic anti-spam: stake to post, lose stake if flagged as spam
 * @dev Deployed on Base with USDC
 */
contract SpamStake is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State ---
    IERC20 public immutable stakeToken;  // USDC on Base
    
    uint256 public minStake = 100000;     // 0.10 USDC (6 decimals)
    uint256 public flagThreshold = 3;     // Flags needed to slash
    uint256 public cooldownPeriod = 7 days;
    uint256 public flaggerRewardBps = 8000; // 80% to flaggers
    
    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 flagCount;
        bool slashed;
        mapping(address => bool) flaggedBy;
    }
    
    // postId => Stake
    mapping(bytes32 => Stake) public stakes;
    // postId => flaggers array
    mapping(bytes32 => address[]) public flaggers;
    // user => total staked (for reputation)
    mapping(address => uint256) public userTotalStaked;
    // user => successful flags (for flagger reputation)
    mapping(address => uint256) public userSuccessfulFlags;
    
    // --- Events ---
    event Staked(address indexed user, bytes32 indexed postId, uint256 amount);
    event Flagged(address indexed flagger, bytes32 indexed postId, uint256 flagCount);
    event Slashed(bytes32 indexed postId, uint256 amount, uint256 flaggerReward);
    event Withdrawn(address indexed user, bytes32 indexed postId, uint256 amount);
    
    // --- Constructor ---
    constructor(address _stakeToken) Ownable(msg.sender) {
        stakeToken = IERC20(_stakeToken);
    }
    
    // --- Core Functions ---
    
    /**
     * @notice Stake tokens to post content
     * @param postId Unique identifier for the post (hash of content or platform ID)
     * @param amount Amount to stake (must be >= minStake)
     */
    function stake(bytes32 postId, uint256 amount) external nonReentrant {
        require(amount >= minStake, "Below minimum stake");
        require(stakes[postId].amount == 0, "Post already staked");
        
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        
        Stake storage s = stakes[postId];
        s.amount = amount;
        s.stakedAt = block.timestamp;
        
        userTotalStaked[msg.sender] += amount;
        
        emit Staked(msg.sender, postId, amount);
    }
    
    /**
     * @notice Flag a post as spam
     * @param postId The post to flag
     */
    function flag(bytes32 postId) external nonReentrant {
        Stake storage s = stakes[postId];
        require(s.amount > 0, "Post not staked");
        require(!s.slashed, "Already slashed");
        require(!s.flaggedBy[msg.sender], "Already flagged by you");
        
        s.flaggedBy[msg.sender] = true;
        s.flagCount++;
        flaggers[postId].push(msg.sender);
        
        emit Flagged(msg.sender, postId, s.flagCount);
        
        // Auto-slash if threshold reached
        if (s.flagCount >= flagThreshold) {
            _slash(postId);
        }
    }
    
    /**
     * @notice Withdraw stake after cooldown (if not slashed)
     * @param postId The post to withdraw stake from
     */
    function withdraw(bytes32 postId) external nonReentrant {
        Stake storage s = stakes[postId];
        require(s.amount > 0, "No stake");
        require(!s.slashed, "Stake was slashed");
        require(block.timestamp >= s.stakedAt + cooldownPeriod, "Cooldown not passed");
        
        uint256 amount = s.amount;
        s.amount = 0;
        
        stakeToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, postId, amount);
    }
    
    // --- Internal ---
    
    function _slash(bytes32 postId) internal {
        Stake storage s = stakes[postId];
        s.slashed = true;
        
        uint256 totalStake = s.amount;
        uint256 flaggerReward = (totalStake * flaggerRewardBps) / 10000;
        uint256 perFlagger = flaggerReward / flaggers[postId].length;
        
        // Distribute to flaggers
        for (uint256 i = 0; i < flaggers[postId].length; i++) {
            address flagger = flaggers[postId][i];
            stakeToken.safeTransfer(flagger, perFlagger);
            userSuccessfulFlags[flagger]++;
        }
        
        // Remainder stays in contract (protocol fee)
        emit Slashed(postId, totalStake, flaggerReward);
    }
    
    // --- Admin ---
    
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }
    
    function setFlagThreshold(uint256 _threshold) external onlyOwner {
        flagThreshold = _threshold;
    }
    
    function setCooldownPeriod(uint256 _period) external onlyOwner {
        cooldownPeriod = _period;
    }
    
    // --- Views ---
    
    function getStake(bytes32 postId) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 flagCount,
        bool slashed
    ) {
        Stake storage s = stakes[postId];
        return (s.amount, s.stakedAt, s.flagCount, s.slashed);
    }
    
    function getFlaggers(bytes32 postId) external view returns (address[] memory) {
        return flaggers[postId];
    }
}
