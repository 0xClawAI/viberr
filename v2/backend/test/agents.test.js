/**
 * Agent API Tests
 * Run with: node test/agents.test.js
 */

const { ethers } = require('ethers');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Generate a test wallet
const testWallet = ethers.Wallet.createRandom();
console.log('Test wallet:', testWallet.address);

let createdAgentId = null;

async function createAuthHeaders(wallet) {
  const timestamp = Date.now();
  const message = `Viberr Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);
  
  return {
    'Content-Type': 'application/json',
    'x-wallet-address': wallet.address,
    'x-signature': signature,
    'x-message': message
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('\n🧪 Running Agent API Tests\n');

  // Test 1: Health check
  await test('Health check', async () => {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check failed');
  });

  // Test 2: Register agent (no auth - should fail)
  await test('Register without auth fails', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Agent' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // Test 3: Register agent (with auth)
  await test('Register agent with wallet auth', async () => {
    const headers = await createAuthHeaders(testWallet);
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        name: 'Test Agent',
        bio: 'A test agent for verification'
      })
    });
    
    if (res.status !== 201) {
      const err = await res.json();
      throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
    }
    
    const data = await res.json();
    if (!data.agent?.id) throw new Error('No agent ID returned');
    if (data.agent.walletAddress.toLowerCase() !== testWallet.address.toLowerCase()) {
      throw new Error('Wallet address mismatch');
    }
    createdAgentId = data.agent.id;
  });

  // Test 4: Duplicate registration fails
  await test('Duplicate registration fails', async () => {
    const headers = await createAuthHeaders(testWallet);
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Duplicate Agent' })
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // Test 5: List agents
  await test('List agents', async () => {
    const res = await fetch(`${API_URL}/api/agents`);
    const data = await res.json();
    if (!Array.isArray(data.agents)) throw new Error('Expected agents array');
    if (data.agents.length === 0) throw new Error('Expected at least one agent');
  });

  // Test 6: Get agent by ID
  await test('Get agent by ID', async () => {
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}`);
    const data = await res.json();
    if (data.agent?.id !== createdAgentId) throw new Error('Agent ID mismatch');
  });

  // Test 7: Get agent by wallet address
  await test('Get agent by wallet address', async () => {
    const res = await fetch(`${API_URL}/api/agents/${testWallet.address}`);
    const data = await res.json();
    if (data.agent?.id !== createdAgentId) throw new Error('Agent ID mismatch');
  });

  // Test 8: Update agent (no auth - should fail)
  await test('Update without auth fails', async () => {
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // Test 9: Update agent (with auth)
  await test('Update agent with wallet auth', async () => {
    const headers = await createAuthHeaders(testWallet);
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ 
        name: 'Updated Test Agent',
        bio: 'Updated bio'
      })
    });
    
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(err)}`);
    }
    
    const data = await res.json();
    if (data.agent.name !== 'Updated Test Agent') throw new Error('Name not updated');
    if (data.agent.bio !== 'Updated bio') throw new Error('Bio not updated');
  });

  // Test 10: Update with wrong wallet fails
  await test('Update with wrong wallet fails', async () => {
    const wrongWallet = ethers.Wallet.createRandom();
    const headers = await createAuthHeaders(wrongWallet);
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name: 'Hacked Name' })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // Test 11: Initiate Twitter verification
  await test('Initiate Twitter verification', async () => {
    const headers = await createAuthHeaders(testWallet);
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}/verify-twitter`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ twitterHandle: '@testhandle' })
    });
    
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(err)}`);
    }
    
    const data = await res.json();
    if (!data.verification?.challengeCode) throw new Error('No challenge code');
    if (data.verification.twitterHandle !== 'testhandle') throw new Error('Handle mismatch');
  });

  // Test 12: Get agent services (empty)
  await test('Get agent services', async () => {
    const res = await fetch(`${API_URL}/api/agents/${createdAgentId}/services`);
    const data = await res.json();
    if (!Array.isArray(data.services)) throw new Error('Expected services array');
  });

  // Test 13: Auth with expired timestamp fails
  await test('Auth with expired timestamp fails', async () => {
    const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
    const message = `Viberr Auth: ${oldTimestamp}`;
    const signature = await testWallet.signMessage(message);
    
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': testWallet.address,
        'x-signature': signature,
        'x-message': message
      },
      body: JSON.stringify({ name: 'Expired Auth Agent' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  console.log('\n✨ All tests completed!\n');
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exitCode = 1;
});
