const { ethers } = require('ethers');

/**
 * Wallet signature authentication middleware
 * 
 * Expects headers:
 * - x-wallet-address: The wallet address claiming to sign
 * - x-signature: The signature of the message
 * - x-message: The signed message (should include timestamp for replay protection)
 * 
 * Message format: "Viberr Auth: {timestamp}"
 * Timestamp must be within 5 minutes of current time
 */
function walletAuth(req, res, next) {
  // Agent internal auth — bypass wallet sig for agent-side updates
  const agentToken = req.headers['x-agent-token'];
  if (agentToken) {
    const db = require('../db');
    const agent = db.prepare('SELECT id, wallet_address FROM agents WHERE webhook_secret = ?').get(agentToken);
    if (agent) {
      req.walletAddress = agent.wallet_address;
      return next();
    }
    return res.status(401).json({ error: 'Invalid agent token' });
  }

  const walletAddress = req.headers['x-wallet-address'];
  const signature = req.headers['x-signature'];
  const message = req.headers['x-message'];

  if (!walletAddress || !signature || !message) {
    return res.status(401).json({
      error: 'Missing authentication headers',
      required: ['x-wallet-address', 'x-signature', 'x-message']
    });
  }

  try {
    // Verify timestamp (within 5 minutes)
    const match = message.match(/Viberr Auth: (\d+)/);
    if (!match) {
      return res.status(401).json({ error: 'Invalid message format. Expected: "Viberr Auth: {timestamp}"' });
    }

    const timestamp = parseInt(match[1], 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestamp) > fiveMinutes) {
      return res.status(401).json({ error: 'Message timestamp expired (must be within 5 minutes)' });
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Attach verified wallet to request
    req.walletAddress = ethers.getAddress(walletAddress); // Checksummed
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid signature', details: err.message });
  }
}

/**
 * Optional auth - sets req.walletAddress if valid, but doesn't require it
 */
function optionalWalletAuth(req, res, next) {
  const walletAddress = req.headers['x-wallet-address'];
  const signature = req.headers['x-signature'];
  const message = req.headers['x-message'];

  if (!walletAddress || !signature || !message) {
    return next(); // No auth provided, continue without
  }

  try {
    const match = message.match(/Viberr Auth: (\d+)/);
    if (!match) return next();

    const timestamp = parseInt(match[1], 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestamp) > fiveMinutes) return next();

    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
      req.walletAddress = ethers.getAddress(walletAddress);
    }
  } catch (err) {
    // Ignore errors for optional auth
  }

  next();
}

module.exports = { walletAuth, optionalWalletAuth };
