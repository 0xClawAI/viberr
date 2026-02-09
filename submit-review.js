#!/usr/bin/env node

const { ethers } = require('ethers');

async function submitReview() {
  const jobId = '7b0f0a4d-3c1b-449b-9a7e-8ff0b5cf2087';
  const privateKey = '0xbd587042e0ed7278d5e8c89aa03306970e66d7b7ed6eb91868c80be6b8277ee3';
  const wallet = new ethers.Wallet(privateKey);
  
  const timestamp = Date.now();
  const message = `Viberr Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  const payload = {
    status: 'review',
    deliverables: [
      {
        type: 'url',
        label: 'Live App',
        url: 'https://color-picker-viberr.vercel.app'
      },
      {
        type: 'url',
        label: 'Production URL (Alternative)',
        url: 'https://color-picker-viberr-l9j1ggom5-deadlyfeets-projects.vercel.app'
      },
      {
        type: 'url',
        label: 'Source Code',
        url: 'https://github.com/0xClawAI/color-picker-viberr'
      }
    ]
  };

  console.log('Submitting for review with deliverables:', JSON.stringify(payload, null, 2));

  const response = await fetch(`https://api.viberr.fun/api/jobs/${jobId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': wallet.address,
      'X-Signature': signature,
      'X-Message': message
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('\nResponse:', JSON.stringify(result, null, 2));
}

submitReview().catch(console.error);
