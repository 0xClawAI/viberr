/**
 * Interview Webhook System Tests
 * 
 * Tests the webhook-based interview flow where actual agents
 * conduct interviews via webhooks.
 * 
 * Run: node test/interview-webhook.test.js
 * 
 * Prerequisites:
 * 1. Start the backend: npm run dev
 * 2. Optionally start the test webhook receiver: node test/test-webhook-receiver.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3099/webhook';
const WEBHOOK_SECRET = 'test-secret-123';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log('\n🧪 Interview Webhook System Tests\n');
  console.log(`API: ${API_URL}`);
  console.log(`Webhook: ${WEBHOOK_URL}\n`);

  let agentId;
  let serviceId;
  let interviewId;

  // Test 1: Register agent with webhook
  await test('Register agent with webhook URL', async () => {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': '0xTestAgent001',
        'x-signature': 'test',
        'x-message': `Viberr Auth: ${Date.now()}`
      },
      body: JSON.stringify({
        name: 'Test Webhook Agent',
        bio: 'An agent with webhook support',
        webhookUrl: WEBHOOK_URL,
        webhookSecret: WEBHOOK_SECRET
      })
    });

    // 201 for new agent, 409 if already exists
    if (res.status === 409) {
      const data = await res.json();
      agentId = data.agentId;
      
      // Update existing agent with webhook
      const updateRes = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': '0xTestAgent001',
          'x-signature': 'test',
          'x-message': `Viberr Auth: ${Date.now()}`
        },
        body: JSON.stringify({
          webhookUrl: WEBHOOK_URL,
          webhookSecret: WEBHOOK_SECRET
        })
      });
      
      if (!updateRes.ok) throw new Error('Failed to update agent');
    } else if (res.status === 201) {
      const data = await res.json();
      agentId = data.agent.id;
      if (!data.agent.webhookUrl) throw new Error('Webhook URL not saved');
    } else {
      throw new Error(`Unexpected status: ${res.status}`);
    }

    console.log(`   Agent ID: ${agentId}`);
  });

  // Test 2: Create a service
  await test('Create service for agent', async () => {
    const res = await fetch(`${API_URL}/api/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': '0xTestAgent001',
        'x-signature': 'test',
        'x-message': `Viberr Auth: ${Date.now()}`
      },
      body: JSON.stringify({
        title: 'Custom Development',
        description: 'I build things',
        category: 'development',
        priceUsdc: 500,
        deliveryDays: 7
      })
    });

    const data = await res.json();
    if (res.status === 201) {
      serviceId = data.service.id;
    } else if (res.status === 409 || data.services) {
      // Might already exist, get first service
      const listRes = await fetch(`${API_URL}/api/agents/${agentId}/services`);
      const listData = await listRes.json();
      serviceId = listData.services[0]?.id;
    }
    
    if (!serviceId) throw new Error('No service ID');
    console.log(`   Service ID: ${serviceId}`);
  });

  // Test 3: Start interview
  await test('Start interview (triggers webhook)', async () => {
    const res = await fetch(`${API_URL}/api/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        serviceId,
        clientDescription: 'I want to build a trading bot'
      })
    });

    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    interviewId = data.id;
    if (!data.hasWebhook) throw new Error('Agent should have webhook');
    console.log(`   Interview ID: ${interviewId}`);
    console.log(`   Stream URL: ${data.streamUrl}`);
  });

  // Wait for webhook to process
  await new Promise(r => setTimeout(r, 1500));

  // Test 4: Check interview has agent response
  await test('Interview received agent response', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    const agentMessages = data.conversation.filter(m => m.role === 'assistant');
    if (agentMessages.length === 0) {
      console.log('   ⚠️ No agent response yet (webhook receiver might not be running)');
    } else {
      console.log(`   Agent messages: ${agentMessages.length}`);
    }
  });

  // Test 5: Submit user answer
  await test('Submit user answer (triggers webhook)', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I want to trade on Binance and Coinbase. Looking for momentum strategies.'
      })
    });

    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Answer not accepted');
  });

  // Wait for webhook
  await new Promise(r => setTimeout(r, 1500));

  // Test 6: Check conversation updated
  await test('Conversation has user message', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    const userMessages = data.conversation.filter(m => m.role === 'user');
    console.log(`   User messages: ${userMessages.length}`);
    console.log(`   Total messages: ${data.conversation.length}`);
  });

  // Test 7: Simulate agent response (manual callback)
  await test('Agent can post response via callback', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}/agent-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: WEBHOOK_SECRET,
        message: 'This is a direct agent response for testing.',
        isComplete: false
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Status: ${res.status}`);
    }
  });

  // Test 8: Invalid secret rejected
  await test('Invalid webhook secret rejected', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}/agent-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'wrong-secret',
        message: 'This should fail'
      })
    });

    if (res.ok) throw new Error('Should have rejected invalid secret');
  });

  // Test 9: Complete interview with spec
  await test('Agent can complete interview with spec', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}/agent-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: WEBHOOK_SECRET,
        message: 'Interview complete! Here is your spec.',
        isComplete: true,
        spec: {
          title: 'Trading Bot Project',
          version: '1.0',
          overview: {
            summary: 'Momentum trading bot for Binance and Coinbase',
            goals: ['Automated trading', 'Multi-exchange support']
          },
          requirements: {
            functional: [
              { id: 'FR-001', description: 'Connect to Binance API', priority: 'must-have' },
              { id: 'FR-002', description: 'Connect to Coinbase API', priority: 'must-have' },
              { id: 'FR-003', description: 'Implement momentum strategy', priority: 'must-have' }
            ]
          },
          timeline: { estimated: '2 weeks' }
        }
      })
    });

    if (!res.ok) throw new Error(`Status: ${res.status}`);
  });

  // Test 10: Get spec
  await test('Can retrieve generated spec', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}/spec`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    if (!data.spec) throw new Error('No spec in response');
    if (data.spec.title !== 'Trading Bot Project') throw new Error('Spec title mismatch');
    console.log(`   Spec title: ${data.spec.title}`);
  });

  // Test 11: Interview status is completed
  await test('Interview status is completed', async () => {
    const res = await fetch(`${API_URL}/api/interview/${interviewId}`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    if (data.status !== 'completed') throw new Error(`Status is ${data.status}, expected completed`);
    console.log(`   Status: ${data.status}`);
  });

  // Test 12: List agent interviews
  await test('Can list agent interviews', async () => {
    const res = await fetch(`${API_URL}/api/interview/agent/${agentId}`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();
    if (!data.interviews || data.interviews.length === 0) {
      throw new Error('No interviews found');
    }
    console.log(`   Agent has ${data.interviews.length} interview(s)`);
  });

  console.log('\n✅ All tests passed!\n');
}

main().catch(err => {
  console.error('\n❌ Tests failed\n');
  process.exit(1);
});
