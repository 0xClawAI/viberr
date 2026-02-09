const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// Config - V3 contracts
const RPC_URL = 'https://sepolia.base.org';
const USDC_ADDRESS = '0x050981C543658C54F25Ffd881Be3290B31B79DD0';   // MockUSDC V3
const ESCROW_ADDRESS = '0x66cdf0431896c2c2ac38eaa716284e4d4159c05e'; // ViberrEscrow V3
const FAUCET_AMOUNT = 1000n * 10n ** 6n; // 1000 USDC (6 decimals)
const MAX_APPROVAL = BigInt(2) ** BigInt(256) - BigInt(1); // Max uint256
const MIN_BALANCE = 10n * 10n ** 6n; // Only mint if balance < 10 USDC

// Deployer wallet owns the contracts and can call mintAndApprove
const FAUCET_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.FAUCET_PRIVATE_KEY;

const USDC_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) view returns (uint256)',
  'function mintAndApprove(address to, uint256 amount, address spender, uint256 approveAmount) external',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Track recent mints to prevent spam (in-memory, resets on restart)
const recentMints = new Map(); // address -> timestamp
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
// No mutex - was causing stale locks

/**
 * POST /api/faucet/mint
 * Mint testnet USDC to a wallet address (backend pays gas)
 * Body: { address: "0x..." }
 */
router.post('/mint', async (req, res) => {
  const { address } = req.body;
  
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Valid address required' });
  }
  
  const normalizedAddress = address.toLowerCase();
  
  // Cooldown check — but skip if user still actually needs funding
  const lastMint = recentMints.get(normalizedAddress);
  if (lastMint && Date.now() - lastMint < COOLDOWN_MS) {
    // Quick check if they actually need anything before rejecting
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const [usdcBal, ethBal] = await Promise.all([
        usdc.balanceOf(address),
        provider.getBalance(address)
      ]);
      if (usdcBal >= MIN_BALANCE && ethBal >= ethers.parseEther('0.0005')) {
        return res.json({ success: true, alreadyFunded: true, balance: (Number(usdcBal) / 1e6).toFixed(2), message: 'Already funded' });
      }
      // Still needs funding — skip cooldown
    } catch { /* proceed anyway */ }
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Need private key
    if (!FAUCET_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: 'Faucet not configured',
        message: 'Server faucet wallet not set up. Ask admin to configure FAUCET_PRIVATE_KEY.'
      });
    }
    
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const usdcWithSigner = usdc.connect(wallet);
    
    // Always check and drip ETH if needed
    const ETH_DRIP = ethers.parseEther('0.001');
    const userEthBalance = await provider.getBalance(address);
    let ethTxHash = null;
    
    if (userEthBalance < ethers.parseEther('0.0005')) {
      console.log(`[Faucet] Sending 0.001 ETH to ${address} for gas`);
      try {
        const ethTx = await wallet.sendTransaction({ to: address, value: ETH_DRIP });
        const ethReceipt = await ethTx.wait();
        ethTxHash = ethReceipt.hash;
        console.log(`[Faucet] ETH sent! tx=${ethTxHash}`);
      } catch (ethErr) {
        console.error('[Faucet] ETH drip failed:', ethErr.message);
      }
    }
    
    // Check USDC balance
    const currentBalance = await usdc.balanceOf(address);
    
    if (currentBalance >= MIN_BALANCE) {
      // Record mint time even for ETH-only
      recentMints.set(normalizedAddress, Date.now());
      return res.json({
        success: true,
        alreadyFunded: true,
        ethTxHash,
        ethSent: ethTxHash ? '0.001' : '0',
        balance: (Number(currentBalance) / 1e6).toFixed(2),
        message: ethTxHash ? 'ETH sent for gas! USDC already funded.' : 'Wallet already funded'
      });
    }
    
    console.log(`[Faucet] Minting ${FAUCET_AMOUNT / 10n ** 6n} USDC to ${address} and approving escrow`);
    
    // Use mintAndApprove to both mint and set allowance in one tx
    const tx = await usdcWithSigner.mintAndApprove(
      address,           // to
      FAUCET_AMOUNT,     // amount to mint
      ESCROW_ADDRESS,    // spender (escrow contract)
      MAX_APPROVAL       // approve max amount
    );
    const receipt = await tx.wait();
    
    // Record mint time
    recentMints.set(normalizedAddress, Date.now());
    
    // Get new balance
    const newBalance = await usdc.balanceOf(address);
    
    console.log(`[Faucet] Minted + approved! tx=${receipt.hash}, balance=${Number(newBalance) / 1e6} USDC`);
    
    res.json({
      success: true,
      txHash: receipt.hash,
      ethTxHash,
      ethSent: ethTxHash ? '0.001' : '0',
      amount: '1000',
      balance: (Number(newBalance) / 1e6).toFixed(2),
      approved: true,
      message: ethTxHash 
        ? '1000 USDC minted, escrow approved, and 0.001 ETH sent for gas!' 
        : '1000 USDC minted and escrow approved!'
    });
    
  } catch (err) {
    console.error('[Faucet] Error:', err);
    
    if (err.message?.includes('insufficient funds')) {
      return res.status(500).json({
        error: 'Faucet out of gas',
        message: 'Faucet wallet needs ETH for gas. Contact admin.'
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/faucet/status
 * Check faucet status and get ETH faucet link
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    let faucetBalance = '0';
    let faucetAddress = null;
    
    if (FAUCET_PRIVATE_KEY) {
      const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
      faucetAddress = wallet.address;
      const ethBalance = await provider.getBalance(wallet.address);
      faucetBalance = ethers.formatEther(ethBalance);
    }
    
    res.json({
      active: !!FAUCET_PRIVATE_KEY,
      faucetAddress,
      faucetEthBalance: faucetBalance,
      usdcContract: USDC_ADDRESS,
      amountPerMint: '1000 USDC',
      cooldownMinutes: 60,
      ethFaucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
      message: 'Need ETH for gas? Use the Base Sepolia faucet link.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/faucet/balance/:address
 * Check USDC balance for an address
 */
router.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const balance = await usdc.balanceOf(address);
    const ethBalance = await provider.getBalance(address);
    
    res.json({
      address,
      usdc: (Number(balance) / 1e6).toFixed(2),
      eth: ethers.formatEther(ethBalance),
      needsUsdc: balance < MIN_BALANCE,
      needsEth: ethBalance < ethers.parseEther('0.0005'),
      needsFunding: balance < MIN_BALANCE || ethBalance < ethers.parseEther('0.0005'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
