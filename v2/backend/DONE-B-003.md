# DONE: B-003 - Job API

## What I Built

Complete job creation and management API with:
- Full CRUD for jobs
- Task breakdown support
- Activity logging
- Live updates endpoint for polling

## Files Created/Modified

### Created:
- `src/routes/jobs.js` - All job endpoints (500+ lines)

### Modified:
- `src/index.js` - Registered jobs router

### Database Tables (auto-created):
- `jobs` - Main job table (id, client_wallet, agent_id, service_id, title, description, price_usdc, escrow_tx, status, timestamps)
- `job_tasks` - Task breakdown (id, job_id, title, description, status, order_index, timestamps)
- `job_activity` - Activity feed (id, job_id, actor_wallet, action, details, created_at)

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/jobs | Required | Create job (links to agent, optionally service) |
| GET | /api/jobs | Optional | List jobs (filters: status, role, agentId) |
| GET | /api/jobs/:id | Optional | Get job details with tasks and agent info |
| PUT | /api/jobs/:id/status | Required | Update status (validates transitions) |
| POST | /api/jobs/:id/tasks | Required | Add task (agent only) |
| PUT | /api/jobs/:id/tasks/:taskId | Required | Update task (agent only) |
| GET | /api/jobs/:id/activity | Optional | Get activity feed |
| GET | /api/jobs/:id/updates | Optional | Poll for updates (since=timestamp) |

## Job Status Lifecycle

```
created → funded → in_progress → review → completed
              ↓          ↓           ↓
           disputed   disputed   disputed
```

### Status Transitions:
- **Client can**: fund (created→funded), complete (review→completed), dispute (funded/in_progress/review→disputed)
- **Agent can**: start (funded→in_progress), submit (in_progress→review), revise (review→in_progress)

## How to Test

### Server already running on port 3001

```bash
# List jobs
curl http://localhost:3001/api/jobs

# Get job details
curl http://localhost:3001/api/jobs/{jobId}

# Create job (requires wallet auth headers)
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: {wallet}" \
  -H "x-signature: {sig}" \
  -H "x-message: Viberr Auth: {timestamp}" \
  -d '{"agentId": "...", "title": "...", "priceUsdc": 100}'
```

### Full lifecycle tested:
1. ✅ Register agent
2. ✅ Create job (status: created)
3. ✅ Fund job (status: funded)
4. ✅ Start work (status: in_progress)
5. ✅ Add tasks
6. ✅ Update task status
7. ✅ Submit for review (status: review)
8. ✅ Complete job (status: completed)
9. ✅ Activity feed logged all actions
10. ✅ Updates endpoint works for polling

## Assumptions Made

1. **No WebSocket for MVP** - Used polling endpoint `/updates?since=timestamp` instead. Easy to add SSE/WS later.
2. **Tasks are agent-only** - Clients can view but not create/edit tasks
3. **No task deletion** - Tasks can only be updated, not removed
4. **Escrow TX is just stored** - Actual escrow verification happens on-chain, we just record the tx hash
5. **Agent's jobs_completed incremented on completion** - For trust tier calculations

## Discovered Tasks

- [feature] Add WebSocket/SSE for real-time job updates (suggested ID: B-010)
- [feature] Add job messaging/comments between client and agent (suggested ID: B-011)
- [feature] Add file attachments for jobs/tasks (suggested ID: B-012)
- [test] Add integration tests for job status transition edge cases (suggested ID: B-013)
