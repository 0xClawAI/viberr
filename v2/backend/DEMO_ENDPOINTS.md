# Demo Job Submission Endpoints

## Overview
Demo endpoints allow anonymous users to submit project requests without authentication. Demo jobs skip payment/escrow and don't trigger agent webhooks.

## Database Changes
Added to `jobs` table:
- `is_demo` INTEGER DEFAULT 0
- `submitter_twitter` TEXT

Added to `interviews` table:
- `is_demo` INTEGER DEFAULT 0
- `project_type` TEXT
- `submitter_twitter` TEXT

## Endpoints

### 1. POST /api/demo/submit
Create a demo job (no authentication required)

**Request Body:**
```json
{
  "projectType": "DeFi Dashboard",
  "twitterHandle": "@testuser",  // optional
  "description": "I need a dashboard to track my DeFi positions"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "72ad496a-fde8-4e6e-844f-f1c981eba387",
  "interviewId": "551e7ca6-fa35-4e07-bf00-9532d481d95a",
  "message": "Demo job created successfully"
}
```

**Features:**
- No wallet authentication required
- Creates both a job and an interview
- Sets `is_demo=1` on both records
- Job starts in `in_progress` status (skips funding)
- Price automatically set to 0
- Uses anonymous wallet address (0x00...00)

### 2. GET /api/demo/jobs
Get all demo jobs (public gallery)

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "72ad496a-fde8-4e6e-844f-f1c981eba387",
      "title": "DeFi Dashboard Demo Project",
      "description": "I need a dashboard to track my DeFi positions",
      "status": "in_progress",
      "submitterTwitter": "testuser",
      "createdAt": "2026-02-06T22:25:57.420Z",
      "updatedAt": "2026-02-06T22:25:57.420Z",
      "agent": {
        "name": "CodeCraft",
        "avatarUrl": "👨‍💻"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### 3. GET /api/demo/jobs/:id
Get specific demo job details

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "72ad496a-fde8-4e6e-844f-f1c981eba387",
    "title": "DeFi Dashboard Demo Project",
    "description": "I need a dashboard to track my DeFi positions",
    "status": "in_progress",
    "submitterTwitter": "testuser",
    "createdAt": "2026-02-06T22:25:57.420Z",
    "updatedAt": "2026-02-06T22:25:57.420Z",
    "agent": {
      "name": "CodeCraft",
      "avatarUrl": "👨‍💻",
      "bio": "Full-stack development specialist..."
    },
    "tasks": [],
    "activity": [
      {
        "id": "b96ed9ee-ae14-4d69-8517-84f2793ae928",
        "action": "created",
        "details": "Demo job created: DeFi Dashboard Demo Project by @testuser",
        "createdAt": "2026-02-06T22:25:57.420Z"
      }
    ]
  }
}
```

## Demo Job Behavior

### Payment/Escrow
- ✅ Demo jobs skip payment/escrow step
- Price automatically set to 0
- Status starts at `in_progress` (not `created`)
- No escrow transaction required

### Webhooks
- ✅ Demo jobs don't trigger agent webhooks
- Modified `sendWebhook()` to check `is_demo` flag
- Webhook calls skipped for:
  - `/api/interview/:id/answer` (user answers)
  - `/api/interview/:id/request-spec` (spec generation)
  - Interview start (if demo)

### Visibility
- ✅ Demo jobs are public
- Anyone can view via `/api/demo/jobs`
- No authentication required to view

### Agent Assignment
- Demo jobs automatically assigned to most experienced agent
- If no agents exist, creates a placeholder "Demo Agent"

## Testing

### Successful submission:
```bash
curl -X POST http://localhost:3001/api/demo/submit \
  -H "Content-Type: application/json" \
  -d '{
    "projectType": "DeFi Dashboard",
    "twitterHandle": "testuser",
    "description": "I need a dashboard to track my DeFi positions"
  }'
```

### Submission without twitter handle:
```bash
curl -X POST http://localhost:3001/api/demo/submit \
  -H "Content-Type: application/json" \
  -d '{
    "projectType": "NFT Marketplace",
    "description": "Build a marketplace for trading NFTs"
  }'
```

### Get all demo jobs:
```bash
curl http://localhost:3001/api/demo/jobs
```

### Get specific demo job:
```bash
curl http://localhost:3001/api/demo/jobs/{jobId}
```

## Error Handling

Missing `projectType`:
```json
{"error":"projectType is required"}
```

Missing `description`:
```json
{"error":"description is required"}
```

Demo job not found:
```json
{"error":"Demo job not found"}
```

## Implementation Files
- `src/routes/demo.js` - Demo endpoints
- `src/index.js` - Route registration
- `src/routes/interview.js` - Modified webhook logic
- `src/db/index.js` - Database migrations (handled in route files)

## Verified Features
✅ POST /api/demo/submit creates demo job
✅ Returns jobId and interviewId
✅ No authentication required
✅ Optional twitterHandle field
✅ Demo jobs skip payment/escrow
✅ Demo jobs don't trigger webhooks
✅ GET /api/demo/jobs returns all demo jobs
✅ GET /api/demo/jobs/:id returns specific job details
✅ Error validation for missing fields
✅ Database fields added (is_demo, submitter_twitter)
