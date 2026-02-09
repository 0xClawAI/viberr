#!/bin/bash
# Reset the dog walking job to pending state for re-testing
# Usage: ./reset-job.sh

JOB_ID="dc371f93-56dc-44bb-becd-bb125eb85d46"
API="https://api.viberr.fun"

echo "Resetting job $JOB_ID..."

# Reset status to pending, clear tasks
curl -s -X PATCH "$API/api/jobs/$JOB_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status": "pending"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Status:', d.get('job',{}).get('status','?'))"

# Re-attach spec if it got cleared
SPEC_LEN=$(curl -s "$API/api/jobs/$JOB_ID" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('job',{}).get('spec','') or ''))")
if [ "$SPEC_LEN" -eq 0 ]; then
  echo "Spec missing, re-attaching..."
  SPEC=$(cat /tmp/dog-walking-spec.md | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  curl -s -X PATCH "$API/api/jobs/$JOB_ID" \
    -H 'Content-Type: application/json' \
    -d "{\"spec\": $SPEC}" > /dev/null
  echo "Spec re-attached"
fi

echo "Done. Job is ready for a fresh agent claim."
echo "Job URL: $API/api/jobs/$JOB_ID"
