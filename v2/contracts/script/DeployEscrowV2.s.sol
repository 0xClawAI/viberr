// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ViberrEscrow.sol";

contract DeployEscrowV2 is Script {
    function run() external {
        // Existing MockUSDC on Base Sepolia
        address usdc = 0xbBBA474Bb2c04bfe726e3A734bD9F63feaC0E0a6;
        
        // Platform wallet (deployer)
        address platformWallet = vm.envAddress("DEPLOYER");
        
        // AI Arbiter wallet
        address arbiter = 0x7878084d8A7975a94B3eb6dA28b12206DED2C46f;
        
        vm.startBroadcast();
        
        ViberrEscrow escrow = new ViberrEscrow(usdc, platformWallet, arbiter);
        
        console.log("ViberrEscrow V2 deployed at:", address(escrow));
        console.log("Platform wallet:", platformWallet);
        console.log("Arbiter:", arbiter);
        
        vm.stopBroadcast();
    }
}
