/**
 * Test Webhook Receiver
 * 
 * A simple Express server that acts as an agent webhook endpoint.
 * It echoes back questions based on the interview context.
 * 
 * Run: node test/test-webhook-receiver.js
 * 
 * This simulates an AI agent responding to interview requests.
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.WEBHOOK_PORT || 3099;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-secret-123';

// Store conversation context
const interviews = new Map();

app.post('/webhook', async (req, res) => {
  console.log('\n========== WEBHOOK RECEIVED ==========');
  console.log('Type:', req.body.type);
  console.log('Interview ID:', req.body.interviewId);
  console.log('Callback URL:', req.body.callbackUrl);
  console.log('Secret Header:', req.headers['x-viberr-signature']);
  console.log('=======================================\n');

  const { type, interviewId, callbackUrl, clientDescription, userMessage, conversationHistory, service } = req.body;

  // Simulate processing time
  await new Promise(r => setTimeout(r, 500));

  let responseMessage = '';
  let isComplete = false;
  let spec = null;

  // Store/update context
  if (!interviews.has(interviewId)) {
    interviews.set(interviewId, { messages: [], round: 0 });
  }
  const context = interviews.get(interviewId);

  switch (type) {
    case 'interview_start':
      context.round = 1;
      context.service = service;
      responseMessage = `👋 Hey! I'm your agent for this project${service ? ` - "${service.title}"` : ''}.

Let me ask you a few questions to understand your needs better:

1. What's the main problem you're trying to solve?
2. Who are the target users for this?
3. Do you have any specific technical requirements or preferences?`;
      break;

    case 'interview_message':
      context.round++;
      context.messages.push({ role: 'user', content: userMessage });

      if (context.round >= 3) {
        // After 3 rounds, mark complete
        responseMessage = `Thanks for all that info! I have a good understanding now.

Let me summarize what I've gathered:
- You've shared your requirements across ${context.messages.length} messages
- I understand the scope and technical needs

I'll now generate a detailed project specification for you.`;
        isComplete = true;
        
        // Generate a sample spec
        spec = {
          title: service?.title || 'Custom Project',
          version: '1.0',
          generatedAt: new Date().toISOString(),
          overview: {
            summary: 'Project based on client interview',
            goals: ['Deliver working solution', 'Meet client requirements']
          },
          requirements: {
            functional: [
              { id: 'FR-001', description: 'Core functionality as discussed', priority: 'must-have' }
            ],
            technical: {
              platform: 'TBD based on discussion',
              constraints: []
            }
          },
          deliverables: [
            { name: 'Final Deliverable', description: 'Complete solution' }
          ],
          timeline: {
            estimated: `${service?.deliveryDays || 7} days`
          }
        };
      } else {
        responseMessage = `Got it! Based on what you've told me, I have a few follow-up questions:

${context.round === 2 ? `
1. What's your timeline for this project?
2. Do you have a budget in mind?
3. Are there any existing systems this needs to integrate with?
` : `
1. Any specific features that are must-haves vs nice-to-haves?
2. How do you envision the user experience?
3. What does success look like for this project?
`}`;
      }
      break;

    case 'generate_spec':
      responseMessage = 'Here is your project specification!';
      isComplete = true;
      spec = {
        title: 'Generated Project Spec',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        overview: {
          summary: 'Spec generated from conversation',
          conversationLength: conversationHistory?.length || 0
        },
        requirements: {
          functional: [
            { id: 'FR-001', description: 'Main feature', priority: 'must-have' }
          ]
        },
        timeline: { estimated: '2 weeks' }
      };
      break;

    default:
      responseMessage = `Unknown webhook type: ${type}`;
  }

  // Send response back to Viberr
  if (callbackUrl) {
    try {
      console.log('Sending response to callback URL...');
      const response = await axios.post(callbackUrl, {
        interviewId,
        secret: WEBHOOK_SECRET,
        message: responseMessage,
        isComplete,
        spec
      });
      console.log('Callback response:', response.data);
    } catch (error) {
      console.error('Failed to send callback:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  }

  res.json({ received: true, type });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'test-webhook-receiver' });
});

app.listen(PORT, () => {
  console.log(`\n🎯 Test Webhook Receiver running on http://localhost:${PORT}`);
  console.log(`\nTo register an agent with this webhook:`);
  console.log(`  webhook_url: http://localhost:${PORT}/webhook`);
  console.log(`  webhook_secret: ${WEBHOOK_SECRET}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /webhook - Receives interview webhooks`);
  console.log(`  GET /health - Health check\n`);
});
