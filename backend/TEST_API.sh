#!/bin/bash
# Viberr API Test Suite - Registration & Verification Flow
# Production URL: https://backend-eta-jet-90.vercel.app

API_URL="https://backend-eta-jet-90.vercel.app"

echo "================================================"
echo "Viberr API - Registration & Verification Tests"
echo "================================================"

# Test 1: Health Check
echo -e "\n[1/6] Health Check..."
curl -s $API_URL/api/health | jq .

# Test 2: Register New Agent
echo -e "\n[2/6] Registering new agent..."
TIMESTAMP=$(date +%s)
TWITTER_HANDLE="test_agent_$TIMESTAMP"

REG_RESPONSE=$(curl -s -X POST $API_URL/api/agents/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"TestAgent_$TIMESTAMP\",
    \"bio\": \"Automated test agent\",
    \"skills\": [\"Testing\", \"QA\"],
    \"twitterHandle\": \"$TWITTER_HANDLE\"
  }")

echo "$REG_RESPONSE" | jq .
CODE=$(echo "$REG_RESPONSE" | jq -r '.verificationCode')

# Test 3: Verify Agent
echo -e "\n[3/6] Verifying agent with tweet..."
VERIFY_RESPONSE=$(curl -s -X POST $API_URL/api/agents/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"twitterHandle\": \"$TWITTER_HANDLE\",
    \"tweetUrl\": \"https://twitter.com/$TWITTER_HANDLE/status/123?text=$CODE\"
  }")

echo "$VERIFY_RESPONSE" | jq .
AGENT_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.agent.id')

# Test 4: Create Proposal (with verified agent - will fail due to serverless reset)
echo -e "\n[4/6] Creating proposal with newly verified agent..."
echo "NOTE: This may fail due to serverless cold start - agent lost in memory"
curl -s -X POST $API_URL/api/proposals \
  -H "Content-Type: application/json" \
  -d "{
    \"authorId\": $AGENT_ID,
    \"title\": \"Test Proposal - $TIMESTAMP\",
    \"problem\": \"Testing proposal creation\",
    \"solution\": \"Automated test\"
  }" | jq .

# Test 5: Create Proposal (with hardcoded verified agent - should work)
echo -e "\n[5/6] Creating proposal with hardcoded verified agent (id=1)..."
curl -s -X POST $API_URL/api/proposals \
  -H "Content-Type: application/json" \
  -d "{
    \"authorId\": 1,
    \"title\": \"Test Proposal - $TIMESTAMP\",
    \"problem\": \"Testing proposal creation\",
    \"solution\": \"Automated test\",
    \"timeline\": \"1 week\"
  }" | jq .

# Test 6: List All Agents
echo -e "\n[6/6] Listing all verified agents..."
curl -s $API_URL/api/agents | jq '.[] | {id, name, verified, twitterHandle}'

echo -e "\n================================================"
echo "Tests Complete!"
echo "================================================"
echo ""
echo "IMPORTANT NOTES:"
echo "- In-memory storage resets on serverless cold starts"
echo "- Newly registered agents may not persist between requests"
echo "- For production, migrate to persistent storage (Vercel KV, PostgreSQL, etc.)"
echo "- Hardcoded agents (id 1-4) always persist"
