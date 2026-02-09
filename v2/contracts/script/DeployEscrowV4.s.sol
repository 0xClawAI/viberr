// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ViberrEscrow.sol";

/// @title DeployEscrowV4
/// @notice Deploys updated ViberrEscrow (createJob now pulls funds atomically)
/// @dev Reuses existing MockUSDC V3: 0x050981C543658C54F25Ffd881Be3290B31B79DD0
contract DeployEscrowV4 is Script {
    function run() external {
        address usdc = 0x050981C543658C54F25Ffd881Be3290B31B79DD0;
        address platformWallet = 0xD50406FcD7115cC55A88d77d3E62cE39c9fA99B1;
        address arbiterWallet = 0x7878084d8A7975a94B3eb6dA28b12206DED2C46f;
        
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ViberrEscrow escrow = new ViberrEscrow(usdc, platformWallet, arbiterWallet);
        console.log("ViberrEscrow V4 deployed:", address(escrow));
        
        vm.stopBroadcast();
        
        console.log("=====================================");
        console.log("  MockUSDC (existing):", usdc);
        console.log("  ViberrEscrow V4:", address(escrow));
        console.log("  Change: createJob now pulls USDC atomically");
        console.log("=====================================");
    }
}
