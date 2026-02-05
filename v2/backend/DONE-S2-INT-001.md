# DONE-S2-INT-001: LLM Interview Backend

**Completed:** 2026-02-04
**Sprint:** Sprint 2 - LLM Interview System

## Summary

Implemented an intelligent LLM-powered interview system that replaces the template-based approach with dynamic, context-aware questioning and PRD generation.

## What Was Built

### 1. Updated POST /api/interview/start
- **Accepts:** `{ agentId?, serviceId? }` in request body
- **Loads agent profile** (name, bio, specialty) from database
- **Uses LLM** (gpt-4o-mini) to generate first 2-3 numbered questions based on:
  - Agent persona (name, bio)
  - Service context (title, category, description)
- **Returns:** `{ id, questions, agentName, agentAvatar, round, maxRounds, status }`

### 2. Updated POST /api/interview/:id/answer  
- **Accepts:** `{ answers: string[] }` - array of answers for numbered questions
- **Accumulates answers** in conversation history (interview_messages table)
- **Uses LLM to analyze** answers and generate intelligent follow-up questions:
  - Detects vague answers and asks for clarification
  - Adapts questions based on conversation context
  - Tracks missing areas that need more info
- **Interview rounds:** 3-4 rounds (~8-12 questions total)
- **Auto-completes** after MAX_ROUNDS or when enough info gathered
- **Returns:** `{ complete, round, questions, analysis }`

### 3. Updated POST /api/interview/:id/generate
- **Takes full conversation context** from all rounds
- **Uses LLM to generate comprehensive PRD** including:
  - Project overview (summary, problem statement, target users, goals)
  - Functional requirements (prioritized: must-have, should-have, nice-to-have)
  - Non-functional requirements (performance, security, scalability, usability)
  - Technical requirements (platform, stack, integrations, constraints)
  - Deliverables with acceptance criteria
  - Timeline with milestones
  - Budget estimate based on service pricing
  - Success criteria
  - Risks and mitigations
  - Assumptions and out-of-scope items
- **Caches generated spec** - returns existing if already generated
- **Returns:** `{ id, interviewId, spec, createdAt }`

## Technical Implementation

### Database Schema
```sql
-- Updated interviews table
interviews (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  agent_id TEXT,           -- NEW: Links to agent
  service_id TEXT,         -- NEW: Links to service
  status TEXT,             -- in_progress | ready_to_generate | completed
  round INTEGER DEFAULT 1, -- NEW: Current round number
  created_at, updated_at
)

-- New conversation storage (replaces interview_answers)
interview_messages (
  id TEXT PRIMARY KEY,
  interview_id TEXT,
  role TEXT,       -- 'assistant' or 'user'
  content TEXT,    -- Full message content
  round INTEGER,
  created_at
)

-- interview_specs unchanged
```

### LLM Integration
- **Provider:** OpenAI API
- **Model:** gpt-4o-mini (cost-efficient)
- **Key management:** Lazy initialization with clear error if OPENAI_API_KEY missing
- **System prompts:** Include agent persona for consistent voice
- **Temperature:**
  - 0.7 for question generation (creative)
  - 0.3 for answer analysis (precise)
  - 0.4 for PRD generation (balanced)

### Key Features
1. **Agent Persona Integration** - Questions reflect agent's expertise and communication style
2. **Smart Follow-ups** - Analyzes answers for vagueness, asks clarifying questions
3. **Context Awareness** - Each round builds on previous answers
4. **Auto-completion** - Detects when enough info gathered (can complete early)
5. **Structured PRD Output** - JSON format with all standard PRD sections

## Files Modified
- `src/routes/interview.js` - Complete rewrite with LLM integration
- `src/index.js` - Added dotenv support
- `package.json` - Added openai and dotenv dependencies

## Files Created
- `.env.example` - Environment variable template
- `test/interview.test.js` - Integration tests

## Dependencies Added
```json
{
  "openai": "^4.x",
  "dotenv": "^17.x"
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/interview/start | Start interview with agent/service context |
| GET | /api/interview/:id | Get interview status and conversation |
| POST | /api/interview/:id/answer | Submit answers, get follow-up questions |
| POST | /api/interview/:id/generate | Generate PRD from conversation |
| GET | /api/interview/:id/spec | Get cached spec |

## Environment Variables Required
```
OPENAI_API_KEY=sk-...  # Required for LLM features
```

## Testing

Run mock tests (no API key needed):
```bash
cd ~/projects/viberr/v2/backend
node test/interview.test.js
```

Run full integration tests (requires OPENAI_API_KEY):
```bash
OPENAI_API_KEY=sk-... node test/interview.test.js
```

## Example Flow

```javascript
// 1. Start interview
POST /api/interview/start
{ "agentId": "abc123", "serviceId": "def456" }
// Returns questions like:
// "1. What specific problem are you trying to solve with this web3 dapp?
//  2. Who is your target audience - individuals, businesses, or both?
//  3. Do you have any existing systems this needs to integrate with?"

// 2. Submit answers
POST /api/interview/abc/answer
{ "answers": ["NFT marketplace for artists", "Individual artists and collectors", "MetaMask integration"] }
// Returns follow-up questions based on answers

// 3. After 3-4 rounds, generate PRD
POST /api/interview/abc/generate
// Returns comprehensive PRD document
```

## Notes
- Schema migration handles existing interviews (adds new columns safely)
- Graceful error handling if OPENAI_API_KEY not set
- PRD JSON parsing handles markdown code blocks from LLM
- Interview can complete early if LLM detects sufficient information
