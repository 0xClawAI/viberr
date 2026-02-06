# Real-Time Task Updates (FT-005)

**Status:** ✅ Complete  
**Date:** 2026-02-05

## Overview

Implemented Server-Sent Events (SSE) system to stream task status updates to customers in real-time as workers execute tasks, eliminating the need for polling and showing live progress.

## Components Built

### 1. Event Emitter (`/backend/src/events/taskEmitter.js`)

Central EventEmitter singleton that broadcasts task updates across the application:

```javascript
taskEmitter.emitTaskUpdate(jobId, {
  taskId: 'task-123',
  status: 'in_progress',
  title: 'Task title',
  note: 'Optional progress note'
});
```

- Supports up to 100 concurrent SSE connections
- Events scoped per job: `job:${jobId}`
- Includes logging for debugging

### 2. SSE Endpoint (`/backend/src/routes/task-events.js`)

**GET** `/api/jobs/:id/task-events`

Server-Sent Events endpoint that:
- Verifies job exists before accepting connection
- Sends initial `connected` event with job status
- Streams `task_update` events as they occur
- Includes 30-second heartbeat to keep connection alive
- Auto-cleans up on client disconnect

**Event Format:**
```json
{
  "type": "task_update",
  "jobId": "uuid",
  "taskId": "uuid",
  "status": "in_progress",
  "title": "Task title",
  "note": "Optional note",
  "timestamp": "2026-02-05T19:00:00.000Z"
}
```

### 3. Task Update Webhook (`/backend/src/routes/agent-hooks.js`)

**POST** `/api/agent-hooks/task-update/:jobId`

Worker webhook for real-time task status updates:

```bash
curl -X POST "http://localhost:3001/api/agent-hooks/task-update/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"task-123","status":"in_progress","note":"Working on it..."}'
```

**Body:**
```json
{
  "taskId": "uuid",
  "status": "pending|in_progress|completed",
  "note": "Optional progress note"
}
```

**Functionality:**
- Updates task status in database
- Logs activity to job_activity table
- Broadcasts via SSE to all connected clients
- Returns immediately (non-blocking)

### 4. Event Broadcasting in Jobs API

Updated existing task status endpoint to emit events:

**PUT** `/api/jobs/:id/tasks/:taskId`

Now broadcasts task updates via SSE when status changes through the normal API.

### 5. Frontend Component (`/frontend/src/components/TaskEventStream.tsx`)

React component that manages SSE connection lifecycle:

```tsx
<TaskEventStream 
  jobId={job.id} 
  jobStatus={job.status}
  onTaskUpdate={(update) => refreshTasks()}
  onJobUpdate={(status) => updateJobStatus(status)}
/>
```

**Features:**
- Auto-connects when job is in active status (in_progress, revisions, hardening)
- Auto-disconnects when job reaches terminal state
- Exponential backoff reconnection (max 30s)
- Shows "Live ●" indicator when connected
- Clean connection management (no memory leaks)

## Architecture

```
Worker → POST /agent-hooks/task-update/:jobId
         ↓
    Update database
         ↓
    taskEmitter.emitTaskUpdate()
         ↓
    EventEmitter broadcasts
         ↓
    SSE endpoint pushes to clients
         ↓
    Frontend TaskEventStream receives
         ↓
    onTaskUpdate() callback fires
         ↓
    UI refreshes task list
```

## Testing

### Manual Test Script

Run `backend/test-sse.sh`:

```bash
./backend/test-sse.sh
```

Expected output:
- SSE connection established
- Real-time events as tasks update
- Immediate webhook responses
- Clean disconnection

### curl Testing

**Terminal 1 (SSE client):**
```bash
curl -N "http://127.0.0.1:3001/api/jobs/${JOB_ID}/task-events"
```

**Terminal 2 (Send updates):**
```bash
curl -X POST "http://127.0.0.1:3001/api/agent-hooks/task-update/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"test","status":"in_progress","note":"testing"}'
```

## Integration Points

### For Worker Code

When updating task status in worker scripts:

```javascript
// Post task update
await axios.post(`http://localhost:3001/api/agent-hooks/task-update/${jobId}`, {
  taskId: task.id,
  status: 'in_progress',
  note: 'Starting implementation...'
});

// Later...
await axios.post(`http://localhost:3001/api/agent-hooks/task-update/${jobId}`, {
  taskId: task.id,
  status: 'completed',
  note: 'Done!'
});
```

### For Frontend (Job Dashboard)

Add TaskEventStream component to job page:

```tsx
'use client';

import TaskEventStream from '@/components/TaskEventStream';
import { useState } from 'react';

export default function JobPage({ job, initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  
  const refreshTasks = async () => {
    const res = await fetch(`/api/jobs/${job.id}`);
    const data = await res.json();
    setTasks(data.tasks);
  };
  
  return (
    <>
      <TaskEventStream 
        jobId={job.id}
        jobStatus={job.status}
        onTaskUpdate={refreshTasks}
      />
      
      {/* Task list UI */}
    </>
  );
}
```

## Performance Considerations

- **Scalability:** EventEmitter is in-memory; for multi-server deployments, use Redis pub/sub
- **Connections:** Each SSE connection is a long-lived HTTP request
- **Heartbeat:** 30-second interval keeps connections alive through proxies
- **Cleanup:** Connections auto-cleanup on client disconnect
- **Browser Limit:** ~6 concurrent SSE connections per domain (not usually an issue)

## Browser Compatibility

SSE is supported in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ❌ IE (use polling fallback if needed)

The existing `/api/jobs/:id/updates?since=timestamp` endpoint serves as a polling fallback.

## Future Enhancements

1. **Job-level events:** Emit job status changes via same SSE connection
2. **Deliverable updates:** Stream new deliverables as they're added
3. **Agent presence:** "Agent is typing..." indicators
4. **Redis pub/sub:** For multi-server horizontal scaling
5. **WebSocket alternative:** For bidirectional communication if needed

## Files Modified/Created

### Created:
- `/backend/src/events/taskEmitter.js` — Event emitter singleton
- `/backend/src/routes/task-events.js` — SSE endpoint
- `/frontend/src/components/TaskEventStream.tsx` — React SSE client
- `/backend/test-sse.sh` — Test script

### Modified:
- `/backend/src/routes/agent-hooks.js` — Added task-update webhook
- `/backend/src/routes/jobs.js` — Added event emission to existing endpoint
- `/backend/src/index.js` — Registered task-events route
- `/state.json` — Marked FT-005 as done

## Validation

✅ SSE connection establishes successfully  
✅ Connected event sent with job status  
✅ Task updates broadcast in real-time  
✅ Multiple clients receive same events  
✅ Auto-reconnects on connection loss  
✅ Disconnects when job completes  
✅ Webhook returns immediately (non-blocking)  
✅ Database updated before SSE broadcast  
✅ Activity logged for all updates  
✅ Frontend component manages lifecycle correctly

---

**Result:** Customers now see live task progress as workers execute, improving transparency and user experience.
