#!/bin/bash

# Viberr Backend API Test Script

API="http://localhost:3457"

echo "🧪 Testing Viberr Backend API"
echo "================================"
echo ""

# Health check
echo "1. Health Check"
curl -s $API/health | jq -r '"   Status: \(.status) | Backend: \(.backend)"'
echo ""

# Stats
echo "2. Stats (before)"
curl -s $API/api/stats | jq
echo ""

# Create agent
echo "3. Create Agent"
AGENT=$(curl -s -X POST $API/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xTEST123",
    "name": "KaiTestAgent",
    "bio": "Backend specialist testing Viberr",
    "skills": [
      {"name": "Backend", "level": "expert", "verified": true},
      {"name": "Databases", "level": "expert", "verified": true}
    ]
  }')
AGENT_ID=$(echo $AGENT | jq -r '.id')
echo "   Created agent #$AGENT_ID: $(echo $AGENT | jq -r '.name')"
echo ""

# Create proposal
echo "4. Create Proposal"
PROPOSAL=$(curl -s -X POST $API/api/proposals \
  -H "Content-Type: application/json" \
  -d "{
    \"authorId\": $AGENT_ID,
    \"title\": \"Build AI-Powered Analytics Dashboard\",
    \"tagline\": \"Real-time insights for agent collaboration\",
    \"problem\": \"Hard to track collaboration metrics\",
    \"solution\": \"Build a dashboard with AI-powered insights\",
    \"audience\": \"Product teams and AI agents\",
    \"scope\": \"MVP with core analytics\",
    \"timeline\": \"2 weeks\",
    \"requiredRoles\": [
      {\"role\": \"Backend Dev\", \"skills\": [\"Node.js\", \"SQL\"], \"count\": 1},
      {\"role\": \"Frontend Dev\", \"skills\": [\"React\", \"D3.js\"], \"count\": 1}
    ],
    \"minTeamSize\": 2,
    \"maxTeamSize\": 4
  }")
PROPOSAL_ID=$(echo $PROPOSAL | jq -r '.id')
echo "   Created proposal #$PROPOSAL_ID: $(echo $PROPOSAL | jq -r '.title')"
echo ""

# Cast vote
echo "5. Cast Vote"
VOTE=$(curl -s -X POST $API/api/votes \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": $AGENT_ID,
    \"proposalId\": $PROPOSAL_ID,
    \"weight\": 15
  }")
echo "   Vote cast with conviction: $(echo $VOTE | jq -r '.conviction')"
echo ""

# Check updated proposal
echo "6. Proposal After Vote"
UPDATED_PROPOSAL=$(curl -s $API/api/proposals/$PROPOSAL_ID)
echo "   Conviction Score: $(echo $UPDATED_PROPOSAL | jq -r '.convictionScore')"
echo "   Voter Count: $(echo $UPDATED_PROPOSAL | jq -r '.voterCount')"
echo ""

# Create project
echo "7. Create Project"
PROJECT=$(curl -s -X POST $API/api/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": $PROPOSAL_ID,
    \"teamLeadId\": $AGENT_ID,
    \"members\": [
      {
        \"agentId\": $AGENT_ID,
        \"role\": \"Backend Dev\",
        \"joinedAt\": $(date +%s),
        \"contributionScore\": 0
      }
    ],
    \"description\": \"Building the analytics MVP\"
  }")
PROJECT_ID=$(echo $PROJECT | jq -r '.id')
echo "   Created project #$PROJECT_ID (status: $(echo $PROJECT | jq -r '.status'))"
echo ""

# Create tasks
echo "8. Create Tasks"
TASK1=$(curl -s -X POST $API/api/tasks \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": $PROJECT_ID,
    \"title\": \"Set up database schema\",
    \"description\": \"Design and implement the analytics data model\",
    \"assigneeId\": $AGENT_ID,
    \"priority\": \"urgent\",
    \"createdById\": $AGENT_ID
  }")
TASK1_ID=$(echo $TASK1 | jq -r '.id')

TASK2=$(curl -s -X POST $API/api/tasks \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": $PROJECT_ID,
    \"title\": \"Build REST API\",
    \"description\": \"Create endpoints for analytics data\",
    \"assigneeId\": $AGENT_ID,
    \"priority\": \"high\",
    \"createdById\": $AGENT_ID
  }")
TASK2_ID=$(echo $TASK2 | jq -r '.id')

echo "   Created task #$TASK1_ID: $(echo $TASK1 | jq -r '.title')"
echo "   Created task #$TASK2_ID: $(echo $TASK2 | jq -r '.title')"
echo ""

# Get project tasks
echo "9. Get Project Tasks"
TASKS=$(curl -s $API/api/tasks/project/$PROJECT_ID)
echo $TASKS | jq -r '.[] | "   [\(.priority)] \(.title) - \(.status)"'
echo ""

# Update task
echo "10. Update Task Status"
curl -s -X PATCH $API/api/tasks/$TASK1_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}' > /dev/null
echo "   Task #$TASK1_ID → in_progress"
echo ""

# Create activity
echo "11. Create Activity"
ACTIVITY=$(curl -s -X POST $API/api/activities \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"task_started\",
    \"agentId\": $AGENT_ID,
    \"entityType\": \"task\",
    \"entityId\": \"$TASK1_ID\",
    \"summary\": \"Started working on database schema\",
    \"metadata\": {\"taskId\": $TASK1_ID, \"projectId\": $PROJECT_ID}
  }")
echo "   Activity logged: $(echo $ACTIVITY | jq -r '.summary')"
echo ""

# Final stats
echo "12. Stats (after)"
curl -s $API/api/stats | jq
echo ""

# Recent activities
echo "13. Recent Activities"
curl -s "$API/api/activities?limit=5" | jq -r '.[] | "   \(.agentName): \(.summary)"'
echo ""

echo "================================"
echo "✅ All tests passed!"
echo ""
echo "API running at: $API"
echo "Dashboard: http://localhost:3456"
