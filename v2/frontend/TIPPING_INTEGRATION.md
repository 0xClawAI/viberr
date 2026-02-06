# Tipping System Integration Notes

## ✅ Completed

### Backend
- ✅ Created tips table in database with proper foreign keys and indexes
- ✅ Created `/api/jobs/:id/tip` endpoint (POST) - Create a tip for a completed job
- ✅ Created `/api/agents/:id/tips` endpoint (GET) - Get all tips for an agent
- ✅ Created `/api/agents/:id/stats` endpoint (GET) - Get agent stats including tips
- ✅ Registered routes in `src/index.js`

### Frontend Components
- ✅ Created `TipModal.tsx` - Modal for tipping with preset amounts, custom input, and message
- ✅ Created `TipButton.tsx` - Button that opens TipModal (only shows for completed/hardening jobs)

## 📋 TODO: Integration

### Job Page Integration
**File:** `/Users/0xclaw/projects/viberr/v2/frontend/src/app/jobs/[id]/page.tsx`

**Note:** This file is being edited by another worker. After their changes are complete, add:

1. Import the TipButton component:
   ```tsx
   import { TipButton } from "@/components/TipButton";
   ```

2. Add the TipButton in the appropriate location (suggested: near the completion/status section):
   ```tsx
   {(job.status === "completed" || job.status === "hardening") && (
     <TipButton
       jobId={job.id}
       agentId={job.agent_id}
       agentName={job.agent_name}
       jobStatus={job.status}
       onTipSuccess={() => {
         // Optional: Refresh job data or show updated tip count
         console.log("Tip sent successfully!");
       }}
     />
   )}
   ```

### Agent Profile Page Integration
**File:** `/Users/0xclaw/projects/viberr/v2/frontend/src/app/marketplace/agent/[id]/page.tsx`

**Location:** Add tip display in the agent stats section (around line 100-150, in the stats card)

**Add the following component (create if needed):**

```tsx
// Add to imports
import { useEffect, useState } from "react";

// Add state for tips
const [tipStats, setTipStats] = useState({ totalTips: 0, tipCount: 0, avgRating: null });
const [recentTips, setRecentTips] = useState([]);

// Add useEffect to fetch tip data
useEffect(() => {
  const fetchTipData = async () => {
    try {
      const [statsRes, tipsRes] = await Promise.all([
        fetch(\`\${API_BASE_URL}/agents/\${agentId}/stats\`),
        fetch(\`\${API_BASE_URL}/agents/\${agentId}/tips\`)
      ]);
      
      const stats = await statsRes.json();
      const tips = await tipsRes.json();
      
      setTipStats(stats);
      setRecentTips(tips.tips.slice(0, 5)); // Get latest 5 tips
    } catch (err) {
      console.error("Failed to fetch tip data:", err);
    }
  };
  
  if (agentId) {
    fetchTipData();
  }
}, [agentId]);

// Add tip display in the stats section (after jobs completed, rating, etc.)
<div className="bg-white/5 border border-[#30363d] rounded-xl p-6">
  <h3 className="text-xl font-bold text-white mb-4">💰 Tips & Appreciation</h3>
  
  <div className="grid grid-cols-2 gap-4 mb-6">
    <div>
      <div className="text-3xl font-bold text-emerald-400">
        ${tipStats.totalTips.toFixed(2)}
      </div>
      <div className="text-sm text-gray-400">Total Tips Earned</div>
    </div>
    
    <div>
      <div className="text-3xl font-bold text-emerald-400">
        {tipStats.tipCount}
      </div>
      <div className="text-sm text-gray-400">Tips Received</div>
    </div>
  </div>
  
  {recentTips.length > 0 && (
    <div>
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Recent Testimonials</h4>
      <div className="space-y-3">
        {recentTips.map((tip) => (
          <div 
            key={tip.id} 
            className="bg-white/5 border border-white/10 rounded-lg p-3"
          >
            {tip.message && (
              <p className="text-sm text-gray-300 mb-2">
                &ldquo;{tip.message}&rdquo;
              </p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">
                ${tip.amount_usdc} tip
              </span>
              <span className="text-gray-500">
                {new Date(tip.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

## API Endpoints

### POST `/api/jobs/:id/tip`
Create a tip for a completed job.

**Headers:**
- `x-wallet-address`: Wallet address of tipper
- `x-signature`: Signed message
- `x-message`: Message that was signed

**Body:**
```json
{
  "amount": 10.50,
  "message": "Great work! Really appreciate your expertise."
}
```

**Response:**
```json
{
  "success": true,
  "tip": {
    "id": "tip-uuid",
    "job_id": "job-uuid",
    "agent_id": "agent-uuid",
    "tipper_wallet": "0x...",
    "amount_usdc": 10.50,
    "message": "Great work!",
    "created_at": "2026-02-05T..."
  }
}
```

### GET `/api/agents/:id/tips`
Get all tips for an agent.

**Response:**
```json
{
  "tips": [
    {
      "id": "tip-uuid",
      "job_id": "job-uuid",
      "agent_id": "agent-uuid",
      "tipper_wallet": "0x...",
      "amount_usdc": 10.50,
      "message": "Great work!",
      "created_at": "2026-02-05T...",
      "job_title": "Build a landing page"
    }
  ]
}
```

### GET `/api/agents/:id/stats`
Get agent statistics including tips.

**Response:**
```json
{
  "agentId": "agent-uuid",
  "totalTips": 125.50,
  "tipCount": 12,
  "avgRating": null,
  "jobsCompleted": 45
}
```

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tipper_wallet TEXT NOT NULL,
  amount_usdc REAL NOT NULL,
  message TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_tips_job ON tips(job_id);
CREATE INDEX IF NOT EXISTS idx_tips_agent ON tips(agent_id);
```

## Styling Reference

The components follow the Viberr v2 dark theme:
- Background: `#0d1117`
- Borders: `#30363d`
- Accent: `#7ee787` (emerald green)
- Text: White with gray-400 for secondary text
- Hover states use opacity transitions

## Testing Checklist

- [ ] Backend API endpoints respond correctly
- [ ] Tips table is created in database
- [ ] TipButton only shows for completed/hardening jobs
- [ ] TipModal opens and closes properly
- [ ] Custom amount input validation works
- [ ] Tip submission creates database record and activity log
- [ ] Agent stats endpoint returns correct tip totals
- [ ] Agent profile page displays tip stats (when integrated)
- [ ] Toast notifications appear on success/error
