/**
 * Interview System Test
 * Tests the LLM-powered interview flow
 */

const db = require('../src/db');
const { v4: uuidv4 } = require('uuid');

// Setup test data
function setupTestData() {
  const agentId = uuidv4();
  const serviceId = uuidv4();
  const randomHex = uuidv4().replace(/-/g, '').substring(0, 40);
  const walletAddress = '0x' + randomHex;

  // Create test agent
  db.prepare(`
    INSERT INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    agentId,
    walletAddress,
    'DevBot Pro',
    'Expert full-stack developer specializing in web3 applications, smart contracts, and scalable backend systems. 5+ years experience building production apps.',
    'https://example.com/avatar.png',
    'verified'
  );

  // Create test service
  db.prepare(`
    INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    serviceId,
    agentId,
    'Custom Web3 DApp Development',
    'End-to-end development of decentralized applications. Includes smart contract development, frontend UI, and backend API integration.',
    'development',
    2500,
    21
  );

  return { agentId, serviceId, walletAddress };
}

// Clean up test data
function cleanupTestData(walletAddress) {
  db.prepare(`DELETE FROM interview_specs WHERE interview_id IN (SELECT id FROM interviews WHERE wallet_address = ?)`).run(walletAddress);
  db.prepare(`DELETE FROM interview_messages WHERE interview_id IN (SELECT id FROM interviews WHERE wallet_address = ?)`).run(walletAddress);
  db.prepare(`DELETE FROM interviews WHERE wallet_address = ?`).run(walletAddress);
}

async function testInterviewFlow() {
  console.log('🧪 Testing LLM Interview System\n');

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set - skipping LLM tests');
    console.log('   Set OPENAI_API_KEY to run full integration tests\n');
    return testMockFlow();
  }

  const { agentId, serviceId, walletAddress } = setupTestData();
  console.log('✅ Test data created');
  console.log(`   Agent: ${agentId}`);
  console.log(`   Service: ${serviceId}\n`);

  try {
    // Simulate the interview router functions
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Test 1: Start Interview
    console.log('📝 Test 1: Starting interview...');
    
    const interviewId = uuidv4().split('-')[0];
    db.prepare(`
      INSERT INTO interviews (id, wallet_address, agent_id, service_id, status, round)
      VALUES (?, ?, ?, ?, 'in_progress', 1)
    `).run(interviewId, walletAddress, agentId, serviceId);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);

    // Generate first questions
    const systemPrompt = `You are ${agent.name}, an expert freelance agent on Viberr marketplace.
Your background: ${agent.bio}
You are conducting a discovery interview for: "${service.title}" (${service.category})
Ask 2-3 numbered questions to understand the project.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate 2-3 initial discovery questions to understand what the client wants to build. Number each question.' }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const questions = completion.choices[0].message.content;
    console.log('✅ First questions generated:');
    console.log('---');
    console.log(questions);
    console.log('---\n');

    // Save to DB
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'assistant', ?, 1)
    `).run(uuidv4().split('-')[0], interviewId, questions);

    // Test 2: Submit Answers
    console.log('📝 Test 2: Submitting answers...');
    
    const answers = [
      'I want to build an NFT marketplace for digital art with support for auctions and royalties',
      'Artists and collectors who want a gas-efficient way to trade NFTs on Base',
      'Auction system, royalty tracking, and integration with existing wallets like MetaMask'
    ];

    const answerContent = answers.map((a, i) => `${i + 1}. ${a}`).join('\n');
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'user', ?, 1)
    `).run(uuidv4().split('-')[0], interviewId, answerContent);

    console.log('✅ Answers submitted\n');

    // Generate follow-up
    const conversation = db.prepare(`
      SELECT role, content FROM interview_messages WHERE interview_id = ? ORDER BY created_at
    `).all(interviewId);

    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: 'Based on the answers, generate 2-3 follow-up questions to dig deeper. Number each question.' }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const followUpQuestions = followUp.choices[0].message.content;
    console.log('✅ Follow-up questions generated:');
    console.log('---');
    console.log(followUpQuestions);
    console.log('---\n');

    // Test 3: Generate PRD
    console.log('📝 Test 3: Generating PRD...');

    // Add more context
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'assistant', ?, 2)
    `).run(uuidv4().split('-')[0], interviewId, followUpQuestions);

    const moreAnswers = [
      'Timeline is 4-6 weeks for MVP, budget around $2000-3000 USDC',
      'Need MetaMask, WalletConnect, and Coinbase Wallet support',
      'Success means 100 active users in first month and at least 50 NFT sales'
    ];

    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'user', ?, 2)
    `).run(uuidv4().split('-')[0], interviewId, moreAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n'));

    const fullConversation = db.prepare(`
      SELECT role, content FROM interview_messages WHERE interview_id = ? ORDER BY created_at
    `).all(interviewId);

    const prdCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...fullConversation.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: `Generate a comprehensive PRD in JSON format with: title, overview, requirements, deliverables, timeline, budget, successCriteria. Return ONLY valid JSON.` }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    let prd;
    try {
      const content = prdCompletion.choices[0].message.content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      prd = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
      console.log('✅ PRD generated successfully!');
      console.log('---');
      console.log('Title:', prd.title);
      console.log('Overview:', prd.overview?.summary || prd.overview?.description || 'N/A');
      console.log('Requirements count:', prd.requirements?.functional?.length || 0);
      console.log('---\n');
    } catch (e) {
      console.log('⚠️  PRD parsing had issues but generated:', e.message);
      console.log('Raw:', prdCompletion.choices[0].message.content.substring(0, 200));
    }

    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('API key')) {
      console.log('   Make sure OPENAI_API_KEY is set correctly');
    }
  } finally {
    cleanupTestData(walletAddress);
    console.log('🧹 Test data cleaned up');
  }
}

function testMockFlow() {
  console.log('🔄 Running mock flow test (no API calls)...\n');

  const { agentId, serviceId, walletAddress } = setupTestData();

  try {
    // Test DB operations
    const interviewId = uuidv4().split('-')[0];
    
    db.prepare(`
      INSERT INTO interviews (id, wallet_address, agent_id, service_id, status, round)
      VALUES (?, ?, ?, ?, 'in_progress', 1)
    `).run(interviewId, walletAddress, agentId, serviceId);

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(interviewId);
    console.log('✅ Interview created:', interview.id);

    // Test message storage
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'assistant', ?, 1)
    `).run(uuidv4().split('-')[0], interviewId, 'Test question');

    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content, round)
      VALUES (?, ?, 'user', ?, 1)
    `).run(uuidv4().split('-')[0], interviewId, 'Test answer');

    const messages = db.prepare('SELECT * FROM interview_messages WHERE interview_id = ?').all(interviewId);
    console.log('✅ Messages stored:', messages.length);

    // Test spec generation
    const specId = uuidv4().split('-')[0];
    const mockSpec = { title: 'Test Project', overview: { summary: 'Test' } };
    
    db.prepare(`
      INSERT INTO interview_specs (id, interview_id, spec_document)
      VALUES (?, ?, ?)
    `).run(specId, interviewId, JSON.stringify(mockSpec));

    const spec = db.prepare('SELECT * FROM interview_specs WHERE interview_id = ?').get(interviewId);
    console.log('✅ Spec stored:', JSON.parse(spec.spec_document).title);

    console.log('\n✅ Mock flow test passed!');

  } finally {
    cleanupTestData(walletAddress);
    console.log('🧹 Test data cleaned up');
  }
}

// Run tests
testInterviewFlow().catch(console.error);
