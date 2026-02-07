const { ethers } = require('ethers');

const privateKey = '0xbd587042e0ed7278d5e8c89aa03306970e66d7b7ed6eb91868c80be6b8277ee3';
const wallet = new ethers.Wallet(privateKey);

const timestamp = Date.now();
const message = `Viberr Auth: ${timestamp}`;

wallet.signMessage(message).then(signature => {
  console.log(JSON.stringify({
    address: wallet.address,
    message: message,
    signature: signature,
    timestamp: timestamp
  }, null, 2));
});
