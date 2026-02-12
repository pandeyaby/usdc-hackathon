// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/SpamStake.sol";

contract DeploySpamStake is Script {
    // Ethereum Sepolia USDC (Circle's official test token)
    // https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SpamStake spamStake = new SpamStake(USDC_SEPOLIA);
        
        console.log("SpamStake deployed to:", address(spamStake));
        console.log("Stake token (USDC):", USDC_SEPOLIA);
        console.log("Min stake:", spamStake.minStake());
        console.log("Flag threshold:", spamStake.flagThreshold());
        
        vm.stopBroadcast();
    }
}
