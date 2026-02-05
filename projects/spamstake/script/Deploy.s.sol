// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/SpamStake.sol";

contract DeploySpamStake is Script {
    // Base Sepolia USDC (test token)
    // Note: You may need to use a mock or the actual test USDC
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SpamStake spamStake = new SpamStake(USDC_BASE_SEPOLIA);
        
        console.log("SpamStake deployed to:", address(spamStake));
        console.log("Stake token (USDC):", USDC_BASE_SEPOLIA);
        console.log("Min stake:", spamStake.minStake());
        console.log("Flag threshold:", spamStake.flagThreshold());
        
        vm.stopBroadcast();
    }
}
