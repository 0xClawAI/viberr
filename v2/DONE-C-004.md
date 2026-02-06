# C-004 Contract Deployment - COMPLETED

**Date:** 2026-02-04
**Network:** Base Sepolia (Chain ID: 84532)
**Deployer:** 0xD50406FcD7115cC55A88d77d3E62cE39c9fA99B1

## Deployed Contracts

| Contract | Address |
|----------|---------|
| MockUSDC | `0xbBBA474Bb2c04bfe726e3A734bD9F63feaC0E0a6` |
| ViberrRegistry | `0x9bdD19072252d930c9f1018115011efFD480F41F` |
| ViberrEscrow | `0xb8b8ED9d2F927A55772391B507BB978358310c9B` |

## Verification Links (Blockscout)

- **MockUSDC:** https://base-sepolia.blockscout.com/address/0xbbba474bb2c04bfe726e3a734bd9f63feac0e0a6
- **ViberrRegistry:** https://base-sepolia.blockscout.com/address/0x9bdd19072252d930c9f1018115011effd480f41f
- **ViberrEscrow:** https://base-sepolia.blockscout.com/address/0xb8b8ed9d2f927a55772391b507bb978358310c9b

## Test Transactions

### 1. registerAgent() on ViberrRegistry ✅
- **Tx:** `0xba0a9332e678be84d731c6482f2b30d31fe62e1e86009ab72bfcda7cc0210a42`
- Agent "TestAgent" successfully registered

### 2. createJob() on ViberrEscrow ✅  
- **Tx:** `0xf3dba117a7720c499447ca46566859c72f74afbd0ecd5cff38fcd4c565a30f19`
- Job ID 0 created for 100 USDC

## Configuration

- **Platform Fee:** 15% (1500 BPS) - 85/15 split
- **Platform Wallet:** 0xD50406FcD7115cC55A88d77d3E62cE39c9fA99B1
- **Registry linked to Escrow:** ✅

## Deployment Script

Created `script/Deploy.s.sol` which:
1. Deploys MockUSDC (mints 1M USDC to deployer)
2. Deploys ViberrRegistry
3. Deploys ViberrEscrow with USDC and platform wallet
4. Links Registry to Escrow via `setEscrowContract()`

## Test Criteria

- [x] Contracts deployed successfully
- [x] Both verified on Blockscout (source viewable)
- [x] Can call registerAgent() on registry
- [x] Can call createJob() on escrow

## Notes

- Verified on Blockscout (not BaseScan) as no BASESCAN_API_KEY was configured
- MockUSDC deployed for testnet use - has public `mint()` function for testing
- All contracts use OpenZeppelin v5.x (Ownable, ReentrancyGuard, SafeERC20)
