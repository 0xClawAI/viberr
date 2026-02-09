// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice Mock USDC token for testnet deployment with admin functions
/// @dev Includes approveFor() to allow backend to set allowances for users (testnet only!)
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint 1,000,000 USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    /// @notice USDC uses 6 decimals
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Anyone can mint for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Admin can set approval on behalf of any address (TESTNET ONLY)
    /// @dev This allows the backend to approve escrow contract for users without them signing
    /// @param owner The address whose allowance to set
    /// @param spender The address allowed to spend (e.g., escrow contract)
    /// @param amount The amount to approve
    function approveFor(address owner, address spender, uint256 amount) external onlyOwner {
        _approve(owner, spender, amount);
    }

    /// @notice Batch mint and approve in one call (gas efficient for faucet)
    /// @param to Address to mint to
    /// @param amount Amount to mint
    /// @param spender Address to approve (e.g., escrow)
    /// @param approveAmount Amount to approve for spender
    function mintAndApprove(address to, uint256 amount, address spender, uint256 approveAmount) external onlyOwner {
        _mint(to, amount);
        _approve(to, spender, approveAmount);
    }
}
