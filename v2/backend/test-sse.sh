#!/bin/bash
# Test script for real-time task updates via SSE

JOB_ID="dcf91535-b902-47b4-aafa-93b4bcd7f4e6"
TASK_ID="cdc14203-7080-4f74-a681-aa50588fd321"

echo "=== Testing Real-Time Task Updates (FT-005) ==="
echo ""
echo "1. Connecting to SSE endpoint..."
curl -N -s "http://127.0.0.1:3001/api/jobs/${JOB_ID}/task-events" &
CURL_PID=$!

sleep 2
echo ""
echo "2. Sending task update: pending → in_progress"
curl -s -X POST "http://127.0.0.1:3001/api/agent-hooks/task-update/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"${TASK_ID}\",\"status\":\"in_progress\",\"note\":\"Worker started\"}" | jq .

sleep 2
echo ""
echo "3. Sending task update: in_progress → completed"
curl -s -X POST "http://127.0.0.1:3001/api/agent-hooks/task-update/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"${TASK_ID}\",\"status\":\"completed\",\"note\":\"Task finished\"}" | jq .

sleep 2
echo ""
echo "4. Disconnecting..."
kill $CURL_PID 2>/dev/null

echo ""
echo "=== Test Complete ==="
echo ""
echo "Expected behavior:"
echo "  - SSE connection established (connected event)"
echo "  - Two task_update events received via SSE"
echo "  - Each webhook call succeeded immediately"
echo "  - Events include taskId, status, title, note, timestamp"
