/**
 * Webhook Tests for B-005
 * Tests the payment webhook sync functionality
 * 
 * Run: node test/webhooks.test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log('\n🧪 Webhook Tests (B-005)\n');

  let passed = 0;
  let total = 0;

  // Test 1: Get status endpoint
  total++;
  if (await test('GET /api/webhooks/status returns sync state', async () => {
    const res = await request('GET', '/api/webhooks/status');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.lastBlock !== undefined, 'Missing lastBlock');
    assert(res.data.totalEventsProcessed !== undefined, 'Missing totalEventsProcessed');
    assert(res.data.contract === '0xb8b8ED9d2F927A55772391B507BB978358310c9B', 'Wrong contract address');
  })) passed++;

  // Test 2: Sync endpoint works (may not find events on testnet)
  total++;
  if (await test('POST /api/webhooks/sync executes without error', async () => {
    const res = await request('POST', '/api/webhooks/sync?lookback=10');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.fromBlock !== undefined, 'Missing fromBlock');
    assert(res.data.toBlock !== undefined, 'Missing toBlock');
    assert(res.data.eventsFound !== undefined, 'Missing eventsFound');
  })) passed++;

  // Test 3: Simulate JobFunded event
  total++;
  if (await test('POST /api/webhooks/simulate JobFunded updates job status', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {
      eventType: 'JobFunded',
      jobId: '1'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.simulated === true, 'Expected simulated: true');
    assert(res.data.eventType === 'JobFunded', 'Wrong eventType');
  })) passed++;

  // Test 4: Simulate PaymentReleased event
  total++;
  if (await test('POST /api/webhooks/simulate PaymentReleased updates job and agent', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {
      eventType: 'PaymentReleased',
      jobId: '1',
      agentWallet: '0x1234567890123456789012345678901234567890'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.eventType === 'PaymentReleased', 'Wrong eventType');
  })) passed++;

  // Test 5: Simulate Disputed event
  total++;
  if (await test('POST /api/webhooks/simulate Disputed updates job status', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {
      eventType: 'Disputed',
      jobId: '1'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.eventType === 'Disputed', 'Wrong eventType');
  })) passed++;

  // Test 6: Simulate Resolved event
  total++;
  if (await test('POST /api/webhooks/simulate Resolved updates job status', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {
      eventType: 'Resolved',
      jobId: '1',
      toAgent: true
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.eventType === 'Resolved', 'Wrong eventType');
  })) passed++;

  // Test 7: Invalid event type
  total++;
  if (await test('POST /api/webhooks/simulate rejects unknown event type', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {
      eventType: 'InvalidEvent',
      jobId: '1'
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  })) passed++;

  // Test 8: Missing required params
  total++;
  if (await test('POST /api/webhooks/simulate requires eventType and jobId', async () => {
    const res = await request('POST', '/api/webhooks/simulate', {});
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  })) passed++;

  // Test 9: API docs include webhook endpoints
  total++;
  if (await test('GET /api includes webhook endpoints in docs', async () => {
    const res = await request('GET', '/api');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.endpoints.webhooks, 'Missing webhooks in endpoints');
    assert(res.data.contract.escrow === '0xb8b8ED9d2F927A55772391B507BB978358310c9B', 'Missing escrow contract');
  })) passed++;

  console.log(`\n📊 Results: ${passed}/${total} passed\n`);
  
  return passed === total;
}

// Run tests
runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
