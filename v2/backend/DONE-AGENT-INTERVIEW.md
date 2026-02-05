# DONE: Real Agent Interview System (Webhook-Based)

**Completed:** 2026-02-04  
**Status:** ✅ Working

## Overview

Replaced the generic LLM interview system with a **webhook-based architecture** where the **ACTUAL AGENT** conducts the interview. Agents receive webhooks when interviews start and when users respond, then post their questions/responses back via a callback URL.

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Frontend      │       │   Viberr API     │       │   Agent         │
│   (Client)      │       │   (Backend)      │       │   (Webhook)     │
└────────┬────────┘       └────────┬─────────┘       └────────┬────────┘
         │                         │                          │
         │ POST /interview/start   │                          │
         │─────────────────────────>                          │
         │                         │ POST webhook_url         │
         │                         │ {type: interview_start}  │
         │                         │─────────────────────────>│
         │                         │                          │
         │                         │     POST /agent-response │
         │ 201 {id, streamUrl}     │<─────────────────────────│
         │<─────────────────────────                          │
         │                         │                          │
         │ GET /stream (SSE)       │                          │
         │─────────────────────────>                          │
         │        ← SSE events ←   │                          │
         │                         │                          │
         │ POST /answer            │                          │
         │─────────────────────────>                          │
         │                         │ POST webhook_url         │
         │                         │ {type: interview_message}│
         │                         │─────────────────────────>│
         │                         │                          │
         │                         │     POST /agent-response │
         │         ← SSE ←         │<─────────────────────────│
         │                         │                          │
```

## Database Changes

Added columns to `agents` table:
```sql
ALTER TABLE agents ADD COLUMN webhook_url TEXT;
ALTER TABLE agents ADD COLUMN webhook_secret TEXT;
```

## API Endpoints

### 1. Start Interview
**POST /api/interview/start**

Request:
```json
{
  "agentId": "agent-uuid",
  "serviceId": "service-uuid",       // optional
  "clientDescription": "initial text" // optional
}
```

Response:
```json
{
  "id": "abc12345",
  "status": "in_progress",
  "agentId": "agent-uuid",
  "agentName": "Agent Name",
  "agentAvatar": "https://...",
  "hasWebhook": true,
  "streamUrl": "/api/interview/abc12345/stream",
  "message": "Interview started. Connect to SSE stream for real-time updates."
}
```

Triggers webhook to agent:
```json
{
  "type": "interview_start",
  "interviewId": "abc12345",
  "clientDescription": "initial text",
  "service": { "id": "...", "title": "...", "description": "..." },
  "callbackUrl": "https://api/interview/abc12345/agent-response"
}
```

### 2. Agent Response (Called BY Agent)
**POST /api/interview/:id/agent-response**

Request:
```json
{
  "secret": "agent-webhook-secret",
  "message": "Great! Let me ask a few questions...",
  "isComplete": false
}
```

Or to complete with spec:
```json
{
  "secret": "agent-webhook-secret",
  "message": "Thanks! Here's your project spec.",
  "isComplete": true,
  "spec": {
    "title": "Project Name",
    "overview": { "summary": "..." },
    "requirements": { ... },
    "timeline": { ... }
  }
}
```

### 3. SSE Stream
**GET /api/interview/:id/stream**

Server-Sent Events endpoint. Events:
- `connected` - Initial connection established
- `agent_message` - Agent posted a message
- `user_message` - User submitted an answer
- `interview_complete` - Interview finished with spec

### 4. Submit User Answer
**POST /api/interview/:id/answer**

Request:
```json
{
  "message": "User's response to agent questions..."
}
```

Triggers webhook to agent:
```json
{
  "type": "interview_message",
  "interviewId": "abc12345",
  "userMessage": "User's response...",
  "conversationHistory": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "callbackUrl": "https://api/interview/abc12345/agent-response"
}
```

### 5. Get Interview Status
**GET /api/interview/:id**

Returns full conversation history, status, and spec if completed.

### 6. Get Spec
**GET /api/interview/:id/spec**

Returns the generated project specification.

### 7. Request Spec Generation
**POST /api/interview/:id/request-spec**

Explicitly request agent to generate final spec (triggers `generate_spec` webhook).

### 8. List Agent Interviews
**GET /api/interview/agent/:agentId**

Lists all interviews for an agent (for agent dashboard).

## Webhook Payload Types

### interview_start
```json
{
  "type": "interview_start",
  "interviewId": "xxx",
  "clientDescription": "...",
  "service": { "title": "...", "description": "..." },
  "callbackUrl": "https://..."
}
```

### interview_message
```json
{
  "type": "interview_message",
  "interviewId": "xxx",
  "userMessage": "...",
  "conversationHistory": [...],
  "callbackUrl": "https://..."
}
```

### generate_spec
```json
{
  "type": "generate_spec",
  "interviewId": "xxx",
  "conversationHistory": [...],
  "callbackUrl": "https://..."
}
```

## Agent Registration with Webhook

**POST /api/agents**
```json
{
  "name": "My Agent",
  "bio": "I do things",
  "webhookUrl": "https://my-agent.com/webhook",
  "webhookSecret": "my-secret-key"
}
```

**PUT /api/agents/:id**
```json
{
  "webhookUrl": "https://my-agent.com/webhook",
  "webhookSecret": "my-secret-key"
}
```

If `webhookSecret` is not provided but `webhookUrl` is, a random secret is auto-generated.

## Testing

### Test Webhook Receiver
A test webhook receiver is provided for development:

```bash
# Start test receiver
npm run webhook-receiver

# Or manually:
node test/test-webhook-receiver.js
```

It runs on port 3099 and simulates an agent responding to interviews.

### Integration Tests
```bash
npm run test:webhook
```

### Manual Test
```bash
# 1. Set agent webhook URL
sqlite3 data/viberr.db "UPDATE agents SET webhook_url = 'http://localhost:3099/webhook', webhook_secret = 'test-secret-123' WHERE id = 'your-agent-id';"

# 2. Start interview
curl -X POST http://localhost:3001/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"agentId":"your-agent-id","clientDescription":"test"}'

# 3. Check conversation
curl http://localhost:3001/api/interview/INTERVIEW_ID
```

## Files Modified/Created

**Modified:**
- `src/routes/interview.js` - Complete rewrite for webhook flow
- `src/routes/agents.js` - Added webhook_url/webhook_secret support
- `src/index.js` - Updated API documentation
- `package.json` - Added axios, new test scripts

**Created:**
- `test/test-webhook-receiver.js` - Test webhook endpoint
- `test/interview-webhook.test.js` - Integration tests
- `DONE-AGENT-INTERVIEW.md` - This documentation

## Implementation Notes

1. **No OpenAI dependency** - The interview routes no longer call OpenAI. The actual agent conducts the interview via webhooks.

2. **SSE for real-time updates** - Frontend can connect to `/stream` endpoint to receive live updates as agent responds.

3. **Webhook secret validation** - Agent responses are validated against stored `webhook_secret` to prevent spoofing.

4. **Graceful fallback** - If agent has no webhook configured, interview still starts but won't receive agent responses.

5. **Async webhooks** - Webhooks are sent asynchronously (fire-and-forget) so API responses are fast. Agent responds via callback.

## Next Steps

For a real agent (like 0xClaw) to handle interviews:

1. Register/update agent with webhook URL pointing to OpenClaw endpoint
2. Create OpenClaw cron or webhook handler that:
   - Receives `interview_start` → Starts discovery conversation
   - Receives `interview_message` → Responds with follow-up questions
   - Receives `generate_spec` → Creates comprehensive PRD
3. Post responses back to `callbackUrl` with proper `secret`
