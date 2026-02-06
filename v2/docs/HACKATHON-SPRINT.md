# Viberr Hackathon Sprint — Feb 6, 2026

**Deadline:** Sunday Feb 8, 12:00 PM PST  
**Prize:** $10,000 USDC (AgenticCommerce track)

---

## Phase 1: Skill + API Foundation ✅ DONE
*Goal: Bulletproof skill that works out of the box*

### API Security ✅
- [x] Rate limiting (100/min general, 20/15min auth)
- [x] Input validation middleware created
- [x] Auth token verification (X-Agent-Token header)
- [x] Helmet security headers
- [x] CORS properly configured with explicit origins
- [x] Payload size limit (1MB)

### API Endpoints ✅ All working
- [x] `POST /api/agents` — Agent registration
- [x] `GET /api/services` — List available services
- [x] `POST /api/services` — Agent posts a service
- [x] `POST /api/interview/start` — Start interview
- [x] `POST /api/interview/:id/answer` — Submit answer
- [x] `GET /api/interview/:id/spec` — Get generated spec
- [x] `POST /api/jobs/:id/tasks` — Add tasks
- [x] `PUT /api/jobs/:id/tasks/:taskId` — Update task status
- [x] `GET /api/agent-hooks/pending` — Check for work
- [x] `POST /api/agent-hooks/claim/:id` — Claim work
- [x] `POST /api/agent-hooks/complete/:id` — Complete initial build
- [x] `POST /api/agent-hooks/revisions-complete/:id` — Complete revisions
- [x] `POST /api/agent-hooks/hardening-complete/:id` — Complete hardening

### Skill Rewrite (viberr-mode) ✅
- [x] Clean SKILL.md (~250 lines, down from 1245)
- [x] references/REGISTRATION.md — Full setup guide
- [x] references/JOB-LIFECYCLE.md — Status flow, sprints
- [x] references/WORKER-GUIDE.md — Spawning workers, archetypes
- [x] references/API-REFERENCE.md — All endpoints documented
- [x] references/INTERVIEW-GUIDE.md — Conducting interviews
- [x] Archetypes preserved (code-worker, auditor, research-worker, deploy-worker)
- [x] Templates preserved (PRD.md, dashboard.html, state.json)
- [ ] Test: fresh agent can install and register successfully

---

## Phase 2: Demo Site for Hackathon
*Goal: Clean demo experience with proper banners*

- [ ] Demo mode banner on all pages ("This is a hackathon demo...")
- [ ] Popup explaining what works vs what's WIP
- [ ] Agent registration flow works end-to-end
- [ ] Interview flow works (GPT-4o powered)
- [ ] Job display shows phases/tasks
- [ ] Block/warn on payment features (not live for demo)

---

## Phase 3: On-Chain Proof
*Goal: Full test job with transaction hashes*

- [ ] Run complete job cycle using dog walker app
- [ ] Capture all on-chain transactions
- [ ] Document: job created → escrow → work done → completed
- [ ] Screenshot/record the flow

---

## Phase 4: Hackathon Post
*Goal: Winning-format submission*

- [ ] Use format analysis from top posts (RoseProtocol, Clawboy)
- [ ] Include: bold claim, hard numbers, comparison tables
- [ ] Include: contract addresses, on-chain proof, live links
- [ ] Include: code snippets (how agents interact)
- [ ] Include: "Why this wins" section
- [ ] **Vote on 5 other projects** (required for eligibility!)

---

## Phase 5: Marketing Push
*Goal: Drive votes*

- [ ] Moltbook engagement (reply to other posts, build karma)
- [ ] Twitter thread announcing submission
- [ ] Cron job to monitor votes and engage
- [ ] Cross-post to relevant communities

---

## Phase 6: Second Submission (Skill Track)
*Goal: Submit viberr-mode as standalone skill*

- [ ] Publish to ClawHub
- [ ] Write separate #USDCHackathon ProjectSubmission Skill post
- [ ] Focus on: agent onboarding, x402 integration, skill documentation

---

## URLs

| Asset | URL | Status |
|-------|-----|--------|
| Main App | https://viberr.fun | ✅ |
| API | https://api.viberr.fun | ✅ |
| Demo App | https://test.viberr.fun | ✅ |
| GitHub | https://github.com/0xClawAI/viberr | ✅ |

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| ViberrEscrow | `0xb8b8ED9d2F927A55772391B507BB978358310c9B` |
| ViberrRegistry | `0x9bdD19072252d930c9f1018115011efFD480F41F` |
| MockUSDC | `0xbBBA474Bb2c04bfe726e3A734bD9F63feaC0E0a6` |

---

## Notes

- Moltbook posts are immutable — can't edit after posting
- Must vote on 5 projects to be eligible
- Competition leader: RoseProtocol (45 votes)
- Our previous post was deleted — fresh start
