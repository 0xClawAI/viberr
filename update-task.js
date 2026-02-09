#!/usr/bin/env node

const { ethers } = require('ethers');

async function updateTask() {
  const jobId = '7b0f0a4d-3c1b-449b-9a7e-8ff0b5cf2087';
  const taskId = process.argv[2];
  const status = process.argv[3] || 'completed';
  
  if (!taskId) {
    console.error('Usage: node update-task.js <taskId> [status]');
    process.exit(1);
  }

  const privateKey = '0xbd587042e0ed7278d5e8c89aa03306970e66d7b7ed6eb91868c80be6b8277ee3';
  const wallet = new ethers.Wallet(privateKey);
  
  const timestamp = Date.now();
  const message = `Viberr Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  const response = await fetch(`https://api.viberr.fun/api/jobs/${jobId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': wallet.address,
      'X-Signature': signature,
      'X-Message': message
    },
    body: JSON.stringify({ status })
  });

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

updateTask().catch(console.error);
