// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/ViberrEscrow.sol";

/// @title DeployV3
/// @notice Deploys fresh MockUSDC (with approveFor) and ViberrEscrow
contract DeployV3 is Script {
    function run() external {
        // Platform wallet receives fees
        address platformWallet = 0xD50406FcD7115cC55A88d77d3E62cE39c9fA99B1;
        
        // Arbiter wallet for dispute resolution
        address arbiterWallet = 0x7878084d8A7975a94B3eb6dA28b12206DED2C46f;
        
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC with approveFor function
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed:", address(usdc));
        
        // Deploy ViberrEscrow
        ViberrEscrow escrow = new ViberrEscrow(address(usdc), platformWallet, arbiterWallet);
        console.log("ViberrEscrow deployed:", address(escrow));
        
        vm.stopBroadcast();
        
        console.log("=====================================");
        console.log("Deployment Summary:");
        console.log("  MockUSDC (with approveFor):", address(usdc));
        console.log("  ViberrEscrow:", address(escrow));
        console.log("  Platform Wallet:", platformWallet);
        console.log("  Arbiter Wallet:", arbiterWallet);
        console.log("  USDC Owner (can approveFor):", vm.addr(deployerPrivateKey));
        console.log("=====================================");
    }
}
