# DONE-B-005 - Payment Webhooks

## What I Built

Webhook endpoints for syncing on-chain ViberrEscrow events and updating backend state.

### Endpoints
- `GET /api/webhooks/status` - Returns sync state (last block, events processed, counts by type)
- `POST /api/webhooks/sync` - Manually trigger sync of recent on-chain events
  - Query params: `fromBlock`, `lookback` (defaults to 1000 blocks)
- `POST /api/webhooks/simulate` - Simulate event handling for testing without actual on-chain events

### Events Handled
| Event | Status Update | Side Effects |
|-------|--------------|--------------|
| JobFunded | `created` → `funded` | Stores escrow_tx |
| PaymentReleased | → `completed` | Increments agent.jobs_completed, updates tier |
| Disputed | → `disputed` | Logs activity |
| Resolved (toAgent=true) | `disputed` → `completed` | Increments jobs_completed, updates tier |
| Resolved (toAgent=false) | `disputed` → `created` | Refund scenario |

### Tier System
Agent tiers auto-upgrade based on jobs_completed:
- `free`: 0-2 jobs
- `rising`: 3-9 jobs
- `verified`: 10-24 jobs
- `premium`: 25+ jobs

## Files Created/Modified

### Created
- `src/routes/webhooks.js` - Main webhook route with all event handlers
- `test/webhooks.test.js` - Test suite (9 tests)

### Modified
- `src/index.js` - Added webhooks router and updated API docs

### Database Tables Added
- `webhook_sync_state` - Tracks last synced block and event counts
- `processed_events` - Deduplication of processed on-chain events (tx_hash + log_index)

## How to Test

```bash
# Start the server
cd /Users/0xclaw/projects/viberr/v2/backend
npm start

# Run tests (in another terminal)
node test/webhooks.test.js

# Manual testing:
# 1. Check status
curl http://localhost:3001/api/webhooks/status

# 2. Sync recent events (scans last 10 blocks)
curl -X POST "http://localhost:3001/api/webhooks/sync?lookback=10"

# 3. Simulate a JobFunded event
curl -X POST http://localhost:3001/api/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{"eventType": "JobFunded", "jobId": "1"}'

# 4. Simulate PaymentReleased (completes job, updates agent stats)
curl -X POST http://localhost:3001/api/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{"eventType": "PaymentReleased", "jobId": "1", "agentWallet": "0x..."}'
```

## Test Results

```
🧪 Webhook Tests (B-005)

✅ GET /api/webhooks/status returns sync state
✅ POST /api/webhooks/sync executes without error
✅ POST /api/webhooks/simulate JobFunded updates job status
✅ POST /api/webhooks/simulate PaymentReleased updates job and agent
✅ POST /api/webhooks/simulate Disputed updates job status
✅ POST /api/webhooks/simulate Resolved updates job status
✅ POST /api/webhooks/simulate rejects unknown event type
✅ POST /api/webhooks/simulate requires eventType and jobId
✅ GET /api includes webhook endpoints in docs

📊 Results: 9/9 passed
```

## Assumptions Made

1. **MVP job matching**: Since we don't store on-chain job IDs yet, handlers match the most recent job in the appropriate status. In production, add a `chain_job_id` column to jobs table.

2. **Sync trigger**: Using manual/cron triggered sync (option 2) as specified. For production, could add real-time WebSocket listeners.

3. **Tier thresholds**: Used reasonable defaults (3/10/25 jobs). These can be adjusted in the TIER_THRESHOLDS constant.

## Discovered Tasks

- [feature] Add `chain_job_id` column to jobs table for reliable on-chain↔backend job matching (suggested ID: B-010)
- [feature] Add cron job to auto-sync every N minutes (suggested ID: B-011)
- [feature] Handle Tipped event - could track tips in a separate table or add to job record (suggested ID: B-012)
