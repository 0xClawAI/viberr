#!/usr/bin/env node

const { ethers } = require('ethers');

async function submitDeliverables() {
  const jobId = '7b0f0a4d-3c1b-449b-9a7e-8ff0b5cf2087';
  const privateKey = '0xbd587042e0ed7278d5e8c89aa03306970e66d7b7ed6eb91868c80be6b8277ee3';
  const wallet = new ethers.Wallet(privateKey);
  
  const timestamp = Date.now();
  const message = `Viberr Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  // Try different endpoints
  const endpoints = [
    `/api/jobs/${jobId}/deliverables`,
    `/api/jobs/${jobId}`,
  ];

  const deliverables = [
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
  ];

  // Try POST to /deliverables endpoint
  console.log('Trying POST /deliverables endpoint...');
  try {
    const response = await fetch(`https://api.viberr.fun${endpoints[0]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': wallet.address,
        'X-Signature': signature,
        'X-Message': message
      },
      body: JSON.stringify({ deliverables })
    });
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('Failed:', err.message);
  }

  // Try PUT to update the job with deliverables
  console.log('\nTrying PUT /jobs endpoint...');
  try {
    const response = await fetch(`https://api.viberr.fun${endpoints[1]}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': wallet.address,
        'X-Signature': signature,
        'X-Message': message
      },
      body: JSON.stringify({ deliverables })
    });
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('Failed:', err.message);
  }
}

submitDeliverables().catch(console.error);
