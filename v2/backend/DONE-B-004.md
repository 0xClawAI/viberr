# DONE-B-004: Spec Interview API

**Status:** ✅ Complete  
**Date:** 2026-02-04

## What Was Built

AI-powered spec building from vague requirements using a template-based interview system.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/interview/start` | POST | Start new interview session |
| `/api/interview/:id` | GET | Get interview status and all answers |
| `/api/interview/:id/next` | GET | Get next question |
| `/api/interview/:id/answer` | POST | Submit answer (body: `{answer: string}` or `{skip: true}`) |
| `/api/interview/:id/generate` | POST | Generate spec document from answers |

All endpoints require wallet authentication (same headers as other routes).

### Interview Questions (10 total)

1. **project_description** (required) - What do you want to build?
2. **problem_solved** (required) - What problem does this solve?
3. **key_features** (required) - List main features (3-5 core)
4. **nice_to_have** (optional) - Nice-to-have features
5. **tech_platform** (required) - Technical requirements
6. **existing_systems** (optional) - Integration requirements
7. **timeline** (required) - Ideal timeline
8. **budget** (optional) - Budget range
9. **success_criteria** (required) - How will you measure success?
10. **examples** (optional) - Similar products/designs

### Generated Spec Document Structure

```json
{
  "title": "Project Name - Project Specification",
  "version": "1.0",
  "generatedAt": "ISO timestamp",
  "overview": {
    "description": "...",
    "problemStatement": "...",
    "targetUsers": "..."
  },
  "requirements": {
    "functional": {
      "coreFeatures": [{id, description, priority}],
      "niceToHave": [{id, description, priority}]
    },
    "technical": {
      "platform": "...",
      "integrations": "..."
    }
  },
  "constraints": {
    "timeline": {raw, estimated, phases},
    "budget": {raw, range, currency}
  },
  "successCriteria": [{id, criterion, measurable}],
  "references": "...",
  "nextSteps": ["..."],
  "rawAnswers": {...}
}
```

## Files Created/Modified

### Created
- `src/routes/interview.js` - Interview routes and spec generation logic

### Modified
- `src/index.js` - Added interview router import and route registration, updated API docs

### Database Tables (auto-created)
- `interviews` - Interview sessions
- `interview_answers` - Individual question answers
- `interview_specs` - Generated spec documents

## How to Test

### 1. Start the server
```bash
cd /Users/0xclaw/projects/viberr/v2/backend
npm run dev
```

### 2. Create auth headers (requires wallet)
```bash
# Generate signature for testing (use your preferred method)
# Headers needed:
# x-wallet-address: <your wallet>
# x-signature: <signed message>
# x-message: "Viberr Auth: <timestamp>"
```

### 3. Complete interview flow
```bash
# Start interview
curl -X POST http://localhost:3001/api/interview/start \
  -H "x-wallet-address: 0x..." \
  -H "x-signature: 0x..." \
  -H "x-message: Viberr Auth: ..."

# Answer questions (repeat for each)
curl -X POST http://localhost:3001/api/interview/<id>/answer \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x..." \
  -H "x-signature: 0x..." \
  -H "x-message: Viberr Auth: ..." \
  -d '{"answer": "I want to build a todo app..."}'

# Skip optional questions
curl -X POST http://localhost:3001/api/interview/<id>/answer \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x..." \
  -d '{"skip": true}'

# Check next question
curl http://localhost:3001/api/interview/<id>/next \
  -H "x-wallet-address: 0x..." \
  -H "x-signature: 0x..." \
  -H "x-message: Viberr Auth: ..."

# Generate spec
curl -X POST http://localhost:3001/api/interview/<id>/generate \
  -H "x-wallet-address: 0x..." \
  -H "x-signature: 0x..." \
  -H "x-message: Viberr Auth: ..."
```

## Assumptions Made

1. **Template-based system** - Used predefined questions instead of LLM-generated follow-ups (per task brief)
2. **Wallet auth required** - All interview endpoints require authentication to track ownership
3. **Skip non-required questions** - Optional questions can be skipped with `{skip: true}`
4. **Spec generation threshold** - Requires at least 3 answers to generate spec
5. **Re-generate returns cached** - If spec already exists, returns the existing one

## Discovered Tasks

- [feature] LLM-enhanced spec generation - Use OpenAI to improve spec quality (suggested ID: B-010)
- [feature] Interview templates - Different question sets for different project types (suggested ID: B-011)
- [feature] Spec export - PDF/Markdown export of generated specs (suggested ID: B-012)
- [test] Interview API test suite - Add automated tests for interview flow (suggested ID: B-013)
