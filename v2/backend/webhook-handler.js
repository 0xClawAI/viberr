const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = 3003;
const WEBHOOK_SECRET = 'viberr-0xclaw-secret-2026';

// Load OpenAI key
const OPENAI_KEY = JSON.parse(fs.readFileSync(
  require('os').homedir() + '/.config/0xclaw/openai.json', 'utf8'
)).apiKey;

// Interview conversation state
const interviews = new Map();

const SYSTEM_PROMPT = `You are 0xClaw, an AI agent hired directly by this client to build their project. You're having a conversation to understand what they need.

YOUR INTERNAL GOAL (don't reveal this): You're building toward having enough info to create a full PRD and task breakdown. But the client just sees a natural conversation — not a form, not a document dump.

HOW TO INTERVIEW:
- Ask 3-4 numbered questions per message that naturally go together
- Pull information gradually over 4-5 rounds of conversation
- Each round should dig deeper based on what they told you
- Don't rush to produce a spec — you need REAL detail first

ROUND STRUCTURE (adapt based on their answers, but cover all these areas):
Round 1: The big picture — what are they building, who's it for, what problem does it solve
Round 2: Core user flows — walk through what a user actually does step by step
Round 3: Features and specifics — must-haves vs nice-to-haves, any integrations, existing code/designs
Round 4: Look and feel — project name, theme (dark/light), color preferences, branding, any reference designs or images they want to share. Also ask about any similar apps/sites they like the look of.
Round 5: THIS IS YOUR FINAL ROUND. Briefly confirm anything you're unsure about, then IMMEDIATELY produce the spec in your response. Don't ask "anything else?" — just deliver it.

CRITICAL — HOW TO END THE INTERVIEW:
After round 4-5, you MUST produce the spec. Do NOT:
- Ask "is there anything else?" and wait for another response
- Keep asking more questions after round 5
- Give a "wrapping up" message without the actual spec
Instead: In your round 5 message, confirm any last details AND include the full spec in the SAME message. Transition naturally: "Based on everything we've discussed, here's what I'll build:" then the spec.

ADAPT TO THE CLIENT:
- Gauge how technical they are from their first messages
- Technical client → ask about architecture, APIs, data models
- Non-technical → ask about what screens they imagine, reference similar apps
- Vague → propose concrete options to help them decide
- If they clearly know what they want → accelerate, skip rounds, get to spec faster

SPEC FORMAT (when ready):
**📋 [Project Name]**

**Problem:** [one line]
**Solution:** [one line]
**Target Users:** [who]

**Core Features (v1):**
1. [Feature] — [what it does, key user flow]
2. [Feature] — [detail]
(cover all discussed features)

**Design Direction:**
- Theme: [dark/light/their preference]
- Style: [based on their references or your recommendation]
- Key screens: [list main pages/views]

**Technical Architecture:**
- Frontend: [recommendation + why]
- Backend: [recommendation + why]  
- Database: [recommendation + why]
- Integrations: [any APIs, services]

**Task Breakdown:**
1. [Task] — [scope]
2. [Task] — [scope]
(detailed enough to build from)

Ready to start building — anything you'd adjust?

CONSTRAINTS:
- This is a direct hire — never mention bidding, other agents, or job postings
- Don't ask about budget or timeline — the service listing covers that
- Skip filler phrases ("Great idea!", "That sounds great!", "I'd be happy to help")
- Never dump the spec after just 1-2 messages — earn the detail first
- After 5 rounds, ALWAYS produce the spec — don't keep looping`;

async function getAIResponse(interviewId, userMessage, service) {
  const state = interviews.get(interviewId);
  
  const serviceContext = service 
    ? `\n\nSERVICE: "${service.title || 'Custom Build'}" — ${service.description || 'Full-stack development'}. Listed delivery: ${service.deliveryDays || 7} days.`
    : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + serviceContext },
    ...state.history
  ];

  try {
    const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages,
      max_tokens: 800,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    const reply = resp.data.choices[0].message.content;
    state.history.push({ role: 'assistant', content: reply });
    
    // Interview is complete when:
    // 1. At least 4 user messages (enough rounds of conversation)
    // 2. Agent produces a spec (PRD-like output with features/tasks)
    const userCount = state.history.filter(m => m.role === 'user').length;
    const hasSpec = (reply.includes('Core Features') || reply.includes('Task Breakdown') || reply.includes('Architecture')) && 
                    (reply.includes('Ready to start') || reply.includes('ready to build') || reply.includes("you'd adjust") || reply.includes('want to adjust'));
    
    const isComplete = userCount >= 4 && hasSpec;

    return { message: reply, done: isComplete };
  } catch (e) {
    console.error(`[${interviewId}] OpenAI error:`, e.response?.data || e.message);
    return { 
      message: "Had a brief hiccup — could you repeat that last part?", 
      done: false 
    };
  }
}

app.post('/webhook/viberr', async (req, res) => {
  const { type, interviewId, callbackUrl, userMessage, service } = req.body;
  
  console.log(`[${interviewId}] ${type}: "${(userMessage || '').substring(0, 80)}"`);

  if (!interviews.has(interviewId)) {
    interviews.set(interviewId, { history: [], service });
  }
  const state = interviews.get(interviewId);

  // Handle interview start — agent sends greeting
  if (type === 'interview_start') {
    const resp = await getAIResponse(interviewId, null, service);
    
    try {
      await axios.post(callbackUrl, {
        secret: WEBHOOK_SECRET,
        message: resp.message,
        isComplete: false
      }, { timeout: 15000 });
      
      console.log(`[${interviewId}] Sent greeting`);
      return res.json({ ok: true });
    } catch (e) {
      console.error(`[${interviewId}] Callback error:`, e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // Handle interview message
  if (type === 'interview_message' && userMessage) {
    state.history.push({ role: 'user', content: userMessage });
    
    const resp = await getAIResponse(interviewId, userMessage, state.service);

    try {
      await axios.post(callbackUrl, {
        secret: WEBHOOK_SECRET,
        message: resp.message,
        isComplete: resp.done,
        // If complete, also send the spec as structured data
        ...(resp.done ? { spec: resp.message } : {})
      }, { timeout: 15000 });
      
      console.log(`[${interviewId}] Response sent (complete: ${resp.done})`);
      return res.json({ ok: true });
    } catch (e) {
      console.error(`[${interviewId}] Callback error:`, e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({ ok: true, note: 'unhandled type' });
});

// ============== REVIEW CHAT ==============
const reviewChats = new Map();

const REVIEW_SYSTEM_PROMPT = `You are the project's AI reviewer. You're helping the customer review their first build (Review 1).

CONTEXT:
- This is the FIRST review — not everything will be fully wired up yet. Some features might be placeholder or partially implemented. That's normal for this stage.
- If the customer asks about something that seems missing or broken, explain that it might be planned for a later phase — but still note it as feedback.
- Your goal: understand what they think about the build so far, what they love, what they want different, and what's confusing. Extract as much useful info as possible through natural conversation.

HOW TO TALK:
- Be conversational. Ask natural follow-ups that help you understand what they're envisioning.
- If they say "I want it more pink" — ask what kind of pink, what pages, should it be subtle or bold, etc.
- If they mention a feature idea — explore it. What would it look like? Who would use it? How should it work?
- Explain things when helpful. "That section is placeholder right now — in the next sprint we'll hook up real data. But good to know you want it styled differently."
- Don't just collect a list — have a real conversation. Understand the WHY behind their requests.
- Keep responses concise but substantive. Don't ramble.
- **FORMAT FOR READABILITY:** Break up your response into clear sections. If you're responding to multiple points, use line breaks between them. Number any questions so the customer can easily respond to specific ones (e.g. "1. For the color scheme..." "2. On the booking flow...").
- Never dump a wall of text. Short paragraphs, clear structure.
- Be warm, knowledgeable, and helpful. You know this project inside and out.`;

async function getReviewResponse(jobId, userMessage, jobContext) {
  if (!reviewChats.has(jobId)) {
    reviewChats.set(jobId, { history: [] });
  }
  const state = reviewChats.get(jobId);

  // Build deliverables context
  let deliverablesContext = '';
  if (jobContext && jobContext.deliverables && jobContext.deliverables.length > 0) {
    const delivs = jobContext.deliverables.map((d, i) => {
      if (typeof d === 'string') return `${i + 1}. ${d}`;
      return `${i + 1}. ${d.title || 'Deliverable'}: ${d.description || ''} ${d.link ? '(' + d.link + ')' : ''}`;
    }).join('\n');
    deliverablesContext = `\n\nPROJECT DELIVERABLES:\n${deliverablesContext}\nProject: "${jobContext.title || 'Untitled'}"\n${deliverablesContext}\nDeliverables:\n${delivs}`;
  }

  if (userMessage) {
    state.history.push({ role: 'user', content: userMessage });
  }

  const messages = [
    { role: 'system', content: REVIEW_SYSTEM_PROMPT + deliverablesContext },
    ...state.history
  ];

  // If this is the first message (no history yet besides the user message), add a greeting context
  if (state.history.length <= 1) {
    messages.splice(1, 0, {
      role: 'system',
      content: 'The customer just opened the review chat. Greet them warmly and guide them to start reviewing the deliverables. Mention what was delivered.'
    });
  }

  try {
    const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    const reply = resp.data.choices[0].message.content;
    state.history.push({ role: 'assistant', content: reply });
    return { message: reply };
  } catch (e) {
    console.error(`[Review ${jobId}] OpenAI error:`, e.response?.data || e.message);
    return { message: "I had a brief hiccup — could you say that again?" };
  }
}

app.post('/webhook/viberr-review', async (req, res) => {
  const { type, jobId, callbackUrl, userMessage, conversationHistory, jobContext } = req.body;

  console.log(`[Review ${jobId}] ${type}: "${(userMessage || '').substring(0, 80)}"`);

  // Restore conversation history if we don't have it
  if (!reviewChats.has(jobId) && conversationHistory && conversationHistory.length > 0) {
    reviewChats.set(jobId, { history: conversationHistory });
  }

  if (type === 'review_message' && userMessage) {
    const resp = await getReviewResponse(jobId, userMessage, jobContext);

    if (callbackUrl) {
      try {
        await axios.post(callbackUrl, {
          secret: WEBHOOK_SECRET,
          message: resp.message
        }, { timeout: 15000 });
        console.log(`[Review ${jobId}] Response sent`);
      } catch (e) {
        console.error(`[Review ${jobId}] Callback error:`, e.message);
      }
    }

    return res.json({ ok: true, message: resp.message });
  }

  res.json({ ok: true, note: 'unhandled review type' });
});

// ============== REVISION PARSING ==============
app.post('/webhook/viberr-parse-revisions', async (req, res) => {
  const { jobId, feedback, callbackUrl, secret } = req.body;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  console.log(`[Parse Revisions ${jobId}] Parsing ${feedback.length} feedback messages`);

  const feedbackText = Array.isArray(feedback) ? feedback.join('\n\n---\n\n') : feedback;

  try {
    const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You extract revision tasks from customer feedback. Return a JSON array of objects with "title" and "description" fields. Each task should be a concrete, actionable item. Keep titles short (under 60 chars). Return ONLY valid JSON, no markdown.

Example output:
[
  {"title": "Fix navigation bar alignment", "description": "The nav bar is misaligned on mobile screens, needs responsive fixes"},
  {"title": "Add dark mode toggle", "description": "Customer wants a toggle in the header to switch between light and dark themes"}
]`
        },
        {
          role: 'user',
          content: `Extract revision tasks from this customer feedback:\n\n${feedbackText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const content = resp.data.choices[0].message.content.trim();
    // Try to parse JSON from the response (handle markdown code blocks)
    let tasks;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      tasks = JSON.parse(jsonStr);
    } catch (e) {
      console.log(`[Parse Revisions ${jobId}] Could not parse GPT response as JSON:`, content);
      tasks = [];
    }

    // Send parsed tasks to callback
    if (callbackUrl && tasks.length > 0) {
      try {
        await axios.post(callbackUrl, {
          secret: WEBHOOK_SECRET,
          tasks
        }, { timeout: 10000 });
        console.log(`[Parse Revisions ${jobId}] Sent ${tasks.length} parsed tasks to callback`);
      } catch (e) {
        console.error(`[Parse Revisions ${jobId}] Callback error:`, e.message);
      }
    }

    return res.json({ ok: true, tasks });
  } catch (e) {
    console.error(`[Parse Revisions ${jobId}] OpenAI error:`, e.response?.data || e.message);
    return res.json({ ok: true, tasks: [], error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ 
  ok: true, 
  version: 'v14-ai-gpt4o-revisions',
  activeInterviews: interviews.size,
  activeReviews: reviewChats.size
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 Viberr webhook handler (v12 — GPT-4o) on :${PORT}`);
});
