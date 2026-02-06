const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Interview system prompt - designed to WOW users
const SYSTEM_PROMPT = `You are an expert product discovery consultant for Viberr, a marketplace where AI agents build projects for clients. Your job is to conduct a professional, insightful interview to understand the client's project needs.

INTERVIEW STYLE:
- Be warm, professional, and genuinely curious
- Ask smart, probing questions that show you understand their domain
- Pick up on details they mention and ask follow-up questions
- Use their language and terminology back to them
- Make them feel like they're talking to someone who "gets it"

QUESTION APPROACH:
- Ask 1-2 focused questions at a time (not overwhelming)
- Start broad, then drill into specifics
- Uncover the WHY behind their requests
- Identify potential edge cases they might not have considered
- Help them clarify their own thinking

INTERVIEW PHASES:
1. Vision & Goals (1-2 exchanges): What are you building? Why? Who's it for?
2. Core Features (2-3 exchanges): What must it do? What's the main user flow?
3. Technical & Details (1-2 exchanges): Any specific tech preferences? Integrations? Timeline?
4. Wrap-up: Summarize understanding, offer to generate spec

TONE:
- Conversational but professional
- Enthusiastic about their project
- Helpful and consultative
- NOT robotic or formulaic

After 4-6 exchanges, naturally transition to: "I think I have a good picture now. Would you like me to generate a project spec based on our conversation?"

Remember: This interview sells Viberr. Make them think "Wow, this is better than talking to most human freelancers."`;

// Generate AI response for interview
async function generateAIResponse(messages, service, projectType) {
  const conversationHistory = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  // Build context about the service they selected
  const serviceContext = service 
    ? `The client selected the "${service.title}" service (${service.description}). Price: $${service.price_usdc} USDC, Delivery: ${service.delivery_days} days.`
    : `The client is interested in: ${projectType}`;

  const systemMessage = `${SYSTEM_PROMPT}\n\nCONTEXT: ${serviceContext}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Check if interview should wrap up
function shouldOfferSpec(messages) {
  const userMessages = messages.filter(m => m.role === 'user').length;
  return userMessages >= 4; // After 4+ user responses, consider wrapping up
}

/**
 * POST /api/demo-interview/start
 * Start a demo AI interview
 */
router.post('/start', async (req, res) => {
  try {
    const { serviceId, agentId, projectType, twitterHandle, description } = req.body;

    if (!projectType && !serviceId) {
      return res.status(400).json({ error: 'projectType or serviceId required' });
    }

    // Get service if provided
    let service = null;
    if (serviceId) {
      service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    }

    // Get agent if provided
    let agent = null;
    if (agentId) {
      agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    }

    const interviewId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // Create demo job
    db.prepare(`
      INSERT INTO jobs (id, client_wallet, agent_id, title, description, price_usdc, status, is_demo, submitter_twitter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      'demo-user',
      agentId || 'demo-agent',
      projectType || service?.title || 'Demo Project',
      description || '',
      0,
      'interviewing',
      1,
      twitterHandle || null
    );

    // Create interview record
    db.prepare(`
      INSERT INTO interviews (id, wallet_address, agent_id, service_id, status, is_demo, project_type, submitter_twitter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      interviewId,
      'demo-user',
      agentId || 'demo-agent',
      serviceId || null,
      'in_progress',
      1,
      projectType || service?.title,
      twitterHandle || null
    );

    // Generate initial AI greeting
    const greetingPrompt = description && description.trim() && !description.includes('project')
      ? `The client just started an interview. They described their project as: "${description}". 
         Greet them warmly, acknowledge what they've shared, and ask 1-2 thoughtful follow-up questions to dig deeper.
         Keep your response under 150 words. Be conversational, not formal.`
      : `The client just started an interview session. They haven't described their project yet.
         Greet them warmly and enthusiastically! Ask them what they'd like to build today.
         Be friendly and curious - make them excited to share their idea.
         Keep your response under 100 words. Be conversational, not formal.`;

    const greeting = await generateAIResponse(
      [{ role: 'user', content: greetingPrompt }],
      service,
      projectType
    );

    // Save AI greeting
    const msgId = crypto.randomUUID().split('-')[0];
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(msgId, interviewId, 'assistant', greeting);

    res.json({
      success: true,
      interviewId,
      jobId,
      message: {
        id: msgId,
        role: 'assistant',
        content: greeting
      },
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar_url,
        bio: agent.bio
      } : {
        id: 'viberr-ai',
        name: 'Viberr AI',
        avatar: '🤖',
        bio: 'AI-powered project discovery'
      }
    });

  } catch (error) {
    console.error('Demo interview start error:', error);
    res.status(500).json({ error: 'Failed to start interview', details: error.message });
  }
});

/**
 * POST /api/demo-interview/:id/respond
 * User sends message, AI responds
 */
router.post('/:id/respond', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Get interview
    const interview = db.prepare('SELECT * FROM interviews WHERE id = ? AND is_demo = 1').get(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Demo interview not found' });
    }

    // Get service context
    const service = interview.service_id 
      ? db.prepare('SELECT * FROM services WHERE id = ?').get(interview.service_id)
      : null;

    // Save user message
    const userMsgId = crypto.randomUUID().split('-')[0];
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(userMsgId, interviewId, 'user', message);

    // Get conversation history
    const messages = db.prepare(`
      SELECT role, content FROM interview_messages 
      WHERE interview_id = ? 
      ORDER BY created_at ASC
    `).all(interviewId);

    // Generate AI response
    const aiResponse = await generateAIResponse(messages, service, interview.project_type);

    // Save AI response
    const aiMsgId = crypto.randomUUID().split('-')[0];
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(aiMsgId, interviewId, 'assistant', aiResponse);

    // Check if we should offer to generate spec
    const readyForSpec = shouldOfferSpec(messages);

    res.json({
      success: true,
      message: {
        id: aiMsgId,
        role: 'assistant',
        content: aiResponse
      },
      readyForSpec,
      exchangeCount: messages.filter(m => m.role === 'user').length
    });

  } catch (error) {
    console.error('Demo interview respond error:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

/**
 * POST /api/demo-interview/:id/generate-spec
 * Generate project spec from interview
 */
router.post('/:id/generate-spec', async (req, res) => {
  try {
    const interviewId = req.params.id;

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ? AND is_demo = 1').get(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Demo interview not found' });
    }

    const messages = db.prepare(`
      SELECT role, content FROM interview_messages 
      WHERE interview_id = ? 
      ORDER BY created_at ASC
    `).all(interviewId);

    const service = interview.service_id 
      ? db.prepare('SELECT * FROM services WHERE id = ?').get(interview.service_id)
      : null;

    // Generate spec using GPT-4o
    const specPrompt = `Based on the following interview conversation, generate a professional project specification document.

CONVERSATION:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

Generate a spec with these sections:
1. **Project Overview** - What we're building and why
2. **Target Users** - Who this is for
3. **Core Features** - Must-have functionality (bulleted list)
4. **Technical Requirements** - Tech stack, integrations, etc.
5. **Success Criteria** - How we'll know it's done
6. **Timeline Estimate** - Rough phases

Keep it concise but comprehensive. Use markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a technical product manager writing clear, actionable project specifications.' },
        { role: 'user', content: specPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    const spec = completion.choices[0].message.content;

    // Save spec
    const specId = crypto.randomUUID().split('-')[0];
    db.prepare(`
      INSERT OR REPLACE INTO interview_specs (id, interview_id, spec_document)
      VALUES (?, ?, ?)
    `).run(specId, interviewId, spec);

    // Update interview status
    db.prepare(`UPDATE interviews SET status = 'spec_generated' WHERE id = ?`).run(interviewId);

    res.json({
      success: true,
      spec,
      specId,
      message: 'Project spec generated! Review it and let us know if you want to proceed.'
    });

  } catch (error) {
    console.error('Generate spec error:', error);
    res.status(500).json({ error: 'Failed to generate spec', details: error.message });
  }
});

/**
 * GET /api/demo-interview/:id
 * Get interview state and messages
 */
router.get('/:id', (req, res) => {
  try {
    const interviewId = req.params.id;

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const messages = db.prepare(`
      SELECT id, role, content, created_at FROM interview_messages 
      WHERE interview_id = ? 
      ORDER BY created_at ASC
    `).all(interviewId);

    const spec = db.prepare('SELECT * FROM interview_specs WHERE interview_id = ?').get(interviewId);

    const agent = interview.agent_id && interview.agent_id !== 'demo-agent'
      ? db.prepare('SELECT id, name, avatar_url, bio FROM agents WHERE id = ?').get(interview.agent_id)
      : { id: 'viberr-ai', name: 'Viberr AI', avatar_url: '🤖', bio: 'AI-powered project discovery' };

    res.json({
      success: true,
      interview: {
        id: interview.id,
        status: interview.status,
        projectType: interview.project_type,
        createdAt: interview.created_at
      },
      messages,
      spec: spec?.spec_document || null,
      agent,
      readyForSpec: messages.filter(m => m.role === 'user').length >= 4
    });

  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ error: 'Failed to get interview' });
  }
});

module.exports = router;
