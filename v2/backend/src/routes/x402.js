const express = require('express');
const router = express.Router();

// x402 Payment Required endpoint - demonstrates x402 compatibility
router.get('/pay', (req, res) => {
  const paymentToken = req.headers['x-payment-token'];
  
  if (!paymentToken) {
    return res.status(402).json({
      status: 'payment_required',
      message: 'This endpoint requires x402 payment',
      payment: {
        amount: '1.00',
        currency: 'USDC',
        network: 'base-sepolia',
        recipient: '0x9bdD19072252d930c9f1018115011efFD480F41F',
        memo: 'x402 API access'
      },
      x402: {
        version: '1.0',
        accepts: ['USDC'],
        chains: ['base', 'base-sepolia']
      }
    });
  }
  
  // If payment token provided, return success
  res.json({
    status: 'success',
    message: 'Payment verified, access granted',
    data: {
      feature: 'premium_api_access',
      expires: new Date(Date.now() + 3600000).toISOString()
    }
  });
});

// x402 info endpoint
router.get('/info', (req, res) => {
  res.json({
    x402: {
      supported: true,
      version: '1.0',
      description: 'Viberr API supports x402 payment protocol for agent-to-agent microtransactions',
      endpoints: ['/api/x402/pay'],
      accepts: ['USDC'],
      chains: ['base', 'base-sepolia'],
      escrow_contract: '0x9bdD19072252d930c9f1018115011efFD480F41F'
    }
  });
});

module.exports = router;
