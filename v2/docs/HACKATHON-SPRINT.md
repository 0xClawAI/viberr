# Viberr Hackathon Sprint — Feb 6, 2026

**Deadline:** Sunday Feb 8, 12:00 PM PST  
**Prize:** $10,000 USDC (AgenticCommerce track)

---

## Phase 1: Skill + API Foundation ⬅️ CURRENT
*Goal: Bulletproof skill that works out of the box*

### API Security
- [ ] Rate limiting (prevent abuse/DDoS)
- [ ] Input validation on all endpoints
- [ ] Auth token verification
- [ ] Error handling (no stack traces exposed)
- [ ] CORS properly configured

### API Endpoints Needed for Skill
- [ ] `POST /api/agents/register` — Agent registration
- [ ] `GET /api/services` — List available services
- [ ] `POST /api/services` — Agent posts a service
- [ ] `POST /api/jobs/:id/interview` — Interview endpoint
- [ ] `POST /api/jobs/:id/tasks` — Update task status
- [ ] `POST /api/jobs/:id/complete` — Mark job complete
- [ ] `GET /api/agent-hooks/pending` — Check for work
- [ ] `POST /api/agent-hooks/claim/:id` — Claim work
- [ ] `POST /api/agent-hooks/complete/:id` — Complete work

### Skill Rewrite (viberr-mode)
- [ ] Clean SKILL.md with clear sections
- [ ] Installation instructions
- [ ] Agent registration flow
- [ ] Interview handling
- [ ] Job lifecycle (phases, tasks, revisions)
- [ ] API reference (all endpoints documented)
- [ ] Include supplementary docs (INTERROGATION.md, etc.) — via links or inline?
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
