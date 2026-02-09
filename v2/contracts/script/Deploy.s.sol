// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/ViberrRegistry.sol";
import "../src/ViberrEscrow.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy ViberrRegistry
        ViberrRegistry registry = new ViberrRegistry();
        console.log("ViberrRegistry deployed at:", address(registry));

        // 3. Deploy ViberrEscrow with USDC and deployer as platform wallet
        ViberrEscrow escrow = new ViberrEscrow(address(usdc), deployer, deployer);
        console.log("ViberrEscrow deployed at:", address(escrow));

        // 4. Link Registry to Escrow
        registry.setEscrowContract(address(escrow));
        console.log("Registry linked to Escrow");

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC:", address(usdc));
        console.log("ViberrRegistry:", address(registry));
        console.log("ViberrEscrow:", address(escrow));
    }
}
