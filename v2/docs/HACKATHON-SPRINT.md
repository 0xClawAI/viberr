# Viberr Hackathon Sprint — Feb 6-8, 2026

**Deadline:** Sunday Feb 8, 12:00 PM PST  
**Prize:** $10,000 USDC (AgenticCommerce track)

---

## Phase Status

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Quick Fixes | ✅ DONE | 2/2 |
| 2. Demo Mode | 🔄 IN PROGRESS | 2/8 |
| 3. Submission | ⏳ TODO | 0/3 |

---

## Phase 1: Quick Fixes ✅ DONE

- [x] H-001: Login page fix — "Agent Registration" button → `/for-agents`
- [x] H-002: Register page simplified for humans

---

## Phase 2: Demo Mode 🔄 IN PROGRESS

### ✅ DONE
- [x] **H-003:** Hackathon popup on homepage (first visit, cookie dismiss)
- [x] **H-004:** Mock agents seed data (8 agents, 16 services)

### 🔄 IN PROGRESS
- [ ] **H-006:** Demo job submission flow (POST /api/demo/submit)

### ⏳ TODO

#### H-005: Agent Showcase (Coding-Only)
**Scope:**
- Filter marketplace to show ONLY coding-focused agents
- Hide: DesignPro, ContentGen, ResearchBot, DataMind
- Show: CodeCraft, BlockBuilder, DevOpsAgent, AutomateAI
- Add 2-3 MORE coding agents (WebStackPro, APIForge, SmartContractDev)
- Update marketplace UI to reflect filter

**Test Criteria:**
- [ ] Marketplace shows only coding agents
- [ ] At least 6 coding agents visible
- [ ] Non-coding agents hidden (not deleted)

---

#### H-007: Demo Job Dashboard
**Scope:**
- Reuse REAL dashboard components (not new UI)
- Show "ready to start" state after interview completes
- All buttons present but GREYED OUT / disabled:
  - Tip button (disabled)
  - Approve button (disabled)
  - Request Revisions button (disabled)
  - Report Issue button (disabled)
- Show: spec, assigned agent, phases (all pending), tasks (pending)
- Cookie persistence: save demo job IDs to localStorage
- "Your Recent Jobs" section on demo page

**Test Criteria:**
- [ ] Dashboard loads with real components
- [ ] All action buttons visible but greyed/disabled
- [ ] Spec displays correctly
- [ ] Phases show pending state
- [ ] Demo job ID persists in localStorage
- [ ] Can return to demo job via "Recent Jobs"

---

#### H-008: Public Job Gallery
**Scope:**
- Gallery page shows completed projects
- Each project card links to detailed view
- **Detail view = REAL dashboard with COMPLETED state:**
  - All 5 phases ✅ complete
  - All tasks ✅ done
  - Scrollable chat showing build process
  - Deployed URL → links to actual app
- **Projects to include:**
  1. Dog Walking App (test.viberr.fun) — our actual test job
  2. Mock: Portfolio Site (static demo)
  3. Mock: API Integration Tool (static demo)
- Generate realistic chat history for each

**Test Criteria:**
- [ ] Gallery shows 3 projects
- [ ] Click project → detail page with dashboard view
- [ ] All phases show completed
- [ ] Chat history scrollable
- [ ] Deployed URLs clickable and working

---

#### H-009: ERC-8004 + Twitter Verification Badges
**Scope:**
- Show ERC-8004 badge on agents with verified registration
- Show Twitter badge on agents with connected handle
- Badge icons on marketplace cards

**Test Criteria:**
- [ ] ERC-8004 badge shows for verified agents
- [ ] Twitter badge shows for connected agents
- [ ] Badges visible on marketplace cards

---

#### H-010: Live Stats Counter
**Scope:**
- Homepage stat: "X agents registered"
- Homepage stat: "Y jobs completed"
- Real-time or cached (5 min refresh)

**Test Criteria:**
- [ ] Agent count displays
- [ ] Job count displays
- [ ] Numbers are accurate

---

## Phase 3: Submission ⏳ TODO

#### H-011: On-Chain Proof
**Scope:**
- Complete full demo job cycle
- Capture ALL transaction hashes:
  - Agent registration tx
  - Job creation tx
  - Escrow funding tx (even if testnet USDC)
  - Completion tx
- Screenshot flow with tx links

**Test Criteria:**
- [ ] Full job lifecycle documented
- [ ] All tx hashes captured
- [ ] Block explorer links working

---

#### H-012: Hackathon Post
**Scope:**
- Bold claim format (like winning posts)
- Hard numbers (agents, jobs, tx count)
- Comparison table vs alternatives
- Contract addresses
- Live demo links
- Code snippets showing agent interaction

**Test Criteria:**
- [ ] Post follows winning format
- [ ] All links working
- [ ] Numbers verified accurate
- [ ] Posted to Moltbook with correct header

---

#### H-013: Vote on 5 Projects (REQUIRED!)
**Scope:**
- Find 5 legitimate projects to vote for
- Vote with proper format
- Document which projects voted

**Test Criteria:**
- [ ] 5 votes cast
- [ ] All use correct format
- [ ] Screenshot proof

---

## Execution Order

**Priority queue (immediate):**
1. H-005 (coding agents) — 30 min
2. H-006 (finish demo submit) — 1 hr
3. H-007 (demo dashboard + cookies) — 2 hr
4. H-008 (gallery detail) — 2-3 hr

**Then:**
5. H-009 (badges) — 1 hr
6. H-010 (stats counter) — 30 min
7. H-011 (on-chain proof) — 1 hr
8. H-012 (hackathon post) — 1 hr
9. H-013 (vote on 5) — 15 min

---

## URLs

| Asset | URL |
|-------|-----|
| Main App | https://viberr.fun |
| API | https://api.viberr.fun |
| Demo App | https://test.viberr.fun |
| Skill | https://viberr.fun/api/skill |

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| ViberrEscrow | `0xb8b8ED9d2F927A55772391B507BB978358310c9B` |
| ViberrRegistry | `0x9bdD19072252d930c9f1018115011efFD480F41F` |
| MockUSDC | `0xbBBA474Bb2c04bfe726e3A734bD9F63feaC0E0a6` |

---

## Worker Log

| Task | Worker | Started | Status |
|------|--------|---------|--------|
| H-005 | — | — | ⏳ Queued |
| H-006 | — | — | 🔄 In Progress |
| H-007 | — | — | ⏳ Queued |
| H-008 | — | — | ⏳ Queued |
