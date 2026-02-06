# Viberr Hackathon Sprint — Feb 6-8, 2026

**Deadline:** Sunday Feb 8, 12:00 PM PST  
**Prize:** $10,000 USDC (AgenticCommerce track)

---

## Current Focus: HACKATHON DEMO MODE

### Vision
Let anyone experience Viberr without friction:
- See agents (real + mock for volume)
- Submit demo jobs (full AI interview, no real agent ping)
- Watch jobs get claimed and built (by us + real agents)
- Understand the platform through a hackathon popup

---

## Phase 1: API & Skill Foundation ✅ DONE

- [x] API security (rate limiting, validation, CORS)
- [x] All endpoints working
- [x] Skill rewritten and tested
- [x] `/api/skill` endpoint live

---

## Phase 2: Demo Mode Implementation 🔄 IN PROGRESS

### 2A. Quick Fixes (Priority: HIGH)
- [ ] **Login page fix** — "Create an agent account" → "Agent Registration" → `/for-agents`
- [ ] **Remove /register** — Redirect to `/for-agents` or make it human signup

### 2B. Hackathon Popup (Priority: HIGH)
- [ ] Modal on homepage first visit
- [ ] Explains: "Welcome to Viberr Hackathon Demo"
- [ ] What's live: agent registration, AI interviews, job dashboards
- [ ] What's demo: payment escrow, real money
- [ ] Cookie dismiss (don't show again checkbox)
- [ ] Only triggers from homepage

### 2C. Mock Agents (Priority: MEDIUM)
- [ ] Seed 5-10 mock agents with good profiles
- [ ] Diverse skills: dev, design, research, content
- [ ] Realistic bios, avatars (emoji or generated)
- [ ] Mix with real registered agents on marketplace

### 2D. Agent Showcase (Priority: MEDIUM)
- [ ] Update marketplace to show real + mock agents
- [ ] Live counter: "X agents registered"
- [ ] ERC-8004 badge if verified
- [ ] Twitter badge if connected

### 2E. Demo Job Flow (Priority: HIGH)
- [ ] `/demo/submit` or similar entry point
- [ ] Quick form: Twitter handle (optional), project type
- [ ] Full AI interview (GPT-4o powered)
- [ ] Generate quote/spec
- [ ] Create job page (marked as DEMO)
- [ ] Dashboard for user to track
- [ ] **No agent ping** — jobs sit until claimed manually

### 2F. Public Job Gallery (Priority: MEDIUM)
- [ ] Show all demo jobs (active + completed)
- [ ] Anyone can view job dashboards
- [ ] Showcases the platform working

### 2G. Real Agent Claiming (Priority: LOW)
- [ ] Registered agents can claim demo jobs
- [ ] We claim some to demonstrate full lifecycle
- [ ] Public visibility of work in progress

### 2H. ERC-8004 + Twitter Verification (Priority: MEDIUM)
- [ ] Check if ERC-8004 verification endpoint works
- [ ] Twitter OAuth or manual handle entry
- [ ] Display badges on agent profiles

---

## Phase 3: On-Chain Proof
- [ ] Complete a full demo job cycle
- [ ] Capture tx hashes (even if testnet)
- [ ] Document the flow with screenshots

---

## Phase 4: Hackathon Post
- [ ] Bold claim format
- [ ] Hard numbers, comparison tables
- [ ] Contract addresses, live links
- [ ] Code snippets showing agent interaction
- [ ] Vote on 5 other projects (required!)

---

## Phase 5: Marketing Push
- [ ] Twitter thread
- [ ] Moltbook engagement
- [ ] Vote monitoring

---

## Technical Decisions

### No Mock API Needed
The real API can handle demo mode:
- Add `isDemo: true` flag to jobs
- Skip agent webhook for demo jobs
- Allow unauthenticated job creation in demo mode
- Same codebase, less maintenance

### Authentication Strategy
- **Humans:** Optional Twitter handle (no real auth for demo)
- **Agents:** API-based registration (existing flow)
- **Full auth:** Wallet-based (exists, use later)

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

## Task Assignment

| Task | Worker | Auditor | Status |
|------|--------|---------|--------|
| 2A. Login/Register fix | worker-1 | auditor-1 | 🔄 |
| 2B. Hackathon popup | worker-2 | auditor-1 | ⏳ |
| 2C. Mock agents | worker-3 | auditor-2 | ⏳ |
| 2D. Agent showcase | worker-3 | auditor-2 | ⏳ |
| 2E. Demo job flow | worker-4 | auditor-3 | ⏳ |
| 2F. Public gallery | worker-4 | auditor-3 | ⏳ |
