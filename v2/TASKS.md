# TASKS.md — Viberr v2

> Last updated: 2026-02-09T10:30:00-08:00
> Status: Post-Hackathon
> Progress: 37/39 tasks complete

---

## Milestones

- **M1: Contracts Deployed** — Tasks: V-001, V-002, V-003, V-004
- **M2: Backend API Complete** — Tasks: V-005, V-006, V-007, V-008, V-009
- **M3: Frontend MVP** — Tasks: V-010, V-011, V-012, V-013, V-014, V-015, V-016
- **M4: Sprint 2 Refinement** — Tasks: V-017, V-018, V-019, V-020, V-021, V-022, V-023, V-024, V-025, V-026
- **M5: Integration & QA** — Tasks: V-027, V-028, V-029, V-030
- **M6: Hackathon Demo** — Tasks: V-031, V-032, V-033, V-034, V-035, V-036, V-037, V-038
- **M7: Launch** — Tasks: V-039

---

## Phase 1: Contracts
**Goal:** Deploy ViberrEscrow + ViberrRegistry on Base Sepolia

### V-001: ViberrEscrow Contract
- **Type:** smart-contract
- **Status:** ✅ done
- **Milestone:** M1
- **Depends:** none
- **Pass criteria:** Escrow contract handles createJob, fundJob, releasePayment (85/15 split), dispute, tip. All events emitted correctly.
- **Fail criteria:** Payment split math is wrong; reentrancy vulnerability exists; missing access control.

### V-002: ViberrRegistry Contract
- **Type:** smart-contract
- **Status:** ✅ done
- **Milestone:** M1
- **Depends:** none
- **Pass criteria:** Agent registration, trust tier logic (Free/Rising/Verified/Premium), Twitter and ERC-8004 verification flags work.
- **Fail criteria:** Tier progression broken; verification can be spoofed by non-admin.

### V-003: Contract Tests
- **Type:** test
- **Status:** ✅ done
- **Milestone:** M1
- **Depends:** V-001, V-002
- **Pass criteria:** All tests pass, >90% coverage. Edge cases tested (zero amounts, self-hire).
- **Fail criteria:** Tests fail or coverage below 90%.

### V-004: Contract Deployment
- **Type:** devops
- **Status:** ✅ done
- **Milestone:** M1
- **Depends:** V-003
- **Pass criteria:** Contracts deployed to Base Sepolia, verified on BaseScan, testnet transactions work.
- **Fail criteria:** Contracts not verified; testnet calls fail.

---

## Phase 2: Backend
**Goal:** API server for agents, services, jobs, interviews, payments

### V-005: Agent API
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M2
- **Depends:** V-004
- **Pass criteria:** CRUD for agents, wallet signature auth, Twitter verification endpoint.
- **Fail criteria:** Auth bypass possible; missing endpoints.

### V-006: Service API
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M2
- **Depends:** V-005
- **Pass criteria:** CRUD for service listings with category, keyword, and price filtering.
- **Fail criteria:** Filters return wrong results; missing pagination.

### V-007: Job API
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M2
- **Depends:** V-005, V-006
- **Pass criteria:** Job lifecycle (create→fund→work→complete), task breakdown, SSE/WebSocket live updates.
- **Fail criteria:** Status transitions allow invalid states; live updates don't work.

### V-008: Spec Interview API
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M2
- **Depends:** V-005
- **Pass criteria:** LLM-powered interview generates coherent spec from vague requirements.
- **Fail criteria:** Interview generates nonsensical specs; crashes on edge-case answers.

### V-009: Payment Webhooks
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M2
- **Depends:** V-004, V-007
- **Pass criteria:** On-chain events (JobFunded, PaymentReleased, Disputed) correctly update backend state and agent stats.
- **Fail criteria:** Events missed; state out of sync with chain.

---

## Phase 3: Frontend MVP
**Goal:** Complete UI for marketplace, hiring, job tracking

### V-010: Landing Page
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** none
- **Pass criteria:** Hero, How it Works, featured agents, stats, footer. Dark theme, emerald accents, mobile responsive.
- **Fail criteria:** Broken on mobile; CTAs don't link anywhere.

### V-011: Marketplace Browse
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-006
- **Pass criteria:** Search, category/price filters, sort, service card grid, loading skeletons.
- **Fail criteria:** Search returns no results; filters broken.

### V-012: Agent Profile Page
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-005
- **Pass criteria:** Profile header with tier badge, verification badges, stats, services tab, "Hire" CTA.
- **Fail criteria:** Profile 404s; hire button broken.

### V-013: Hire Flow — Interview
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-008
- **Pass criteria:** Step indicator, chat UI for interview, spec generation, editable spec.
- **Fail criteria:** Interview hangs; spec not editable.

### V-014: Hire Flow — Payment
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-004, V-013
- **Pass criteria:** Wallet connects (wagmi/RainbowKit), USDC approve + escrow fund, tx status UI, redirect to job.
- **Fail criteria:** Wallet won't connect; transaction fails silently.

### V-015: Live Job Dashboard
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-007
- **Pass criteria:** Job header, spec section, progress bar, kanban board, real-time activity feed, approve/dispute/tip buttons.
- **Fail criteria:** Tasks don't update in real-time; approve button doesn't trigger payment.

### V-016: Agent Dashboard
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M3
- **Depends:** V-005, V-006
- **Pass criteria:** Registration flow (wallet→profile→Twitter→first service), dashboard with services/jobs/earnings.
- **Fail criteria:** Registration fails; agent doesn't appear in marketplace.

---

## Phase 4: Sprint 2 Refinement
**Goal:** Polish interview, add missing pages, improve UX

### V-017: LLM-Powered Interview Backend
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-008
- **Pass criteria:** Adaptive LLM-driven questions, multi-question format, context accumulation, depth detection.
- **Fail criteria:** Questions are generic/repetitive; doesn't adapt to answers.

### V-018: Interview Frontend Polish
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-017
- **Pass criteria:** Typing indicator, multi-question support, thinking animation, improved input.
- **Fail criteria:** UI feels sluggish; no feedback during LLM generation.

### V-019: Agent Persona in Interview
- **Type:** frontend
- **Status:** ❌ todo
- **Milestone:** M4
- **Depends:** V-017
- **Pass criteria:** Interview uses agent's name/bio/specialty, agent introduces themselves, tone matches persona.
- **Fail criteria:** Interview feels generic regardless of agent selected.

### V-020: Sign In Page
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-014
- **Pass criteria:** Wallet connect auth, redirect to dashboard, link to register.
- **Fail criteria:** Can't sign in; no redirect.

### V-021: How It Works Page
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** none
- **Pass criteria:** Clear explanation for humans and agents, visual flow, escrow diagram, FAQ, CTAs.
- **Fail criteria:** Confusing or incomplete explanation.

### V-022: Pricing Page
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** none
- **Pass criteria:** 85/15 split explained, tier benefits, example calculations, comparison to traditional freelancing.
- **Fail criteria:** Pricing unclear or misleading.

### V-023: Fix Navigation Links
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-020, V-021, V-022
- **Pass criteria:** All nav links work, no 404s, mobile nav functional, active page state.
- **Fail criteria:** Any nav link 404s.

### V-024: Deferred Wallet Flow
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-014
- **Pass criteria:** Browse and fill forms without wallet; only prompted at payment step.
- **Fail criteria:** Wallet required before browsing.

### V-025: Loading & Error States
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-010
- **Pass criteria:** Skeleton loaders, error boundaries with retry, toast notifications, graceful network error handling.
- **Fail criteria:** White screen on error; no loading feedback.

### V-026: Mobile Polish
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M4
- **Depends:** V-010
- **Pass criteria:** All pages work on mobile, no overflow, good touch targets, wallet connect works on mobile.
- **Fail criteria:** Any page broken on mobile viewport.

---

## Phase 5: Integration & QA
**Goal:** End-to-end testing and polish

### V-027: E2E Testing
- **Type:** test
- **Status:** ✅ done
- **Milestone:** M5
- **Depends:** V-016, V-015
- **Pass criteria:** Full flow works: register→list service→browse→interview→fund→work→approve→payment. 85/15 split correct.
- **Fail criteria:** Any step in the flow fails.

### V-028: Bug Fixes
- **Type:** code
- **Status:** ✅ done
- **Milestone:** M5
- **Depends:** V-027
- **Pass criteria:** All critical and high-priority bugs resolved and retested.
- **Fail criteria:** Critical bugs remain.

### V-029: UI Polish
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M5
- **Depends:** V-027
- **Pass criteria:** Consistent styling, loading/empty/error states everywhere, subtle animations, professional look.
- **Fail criteria:** Inconsistent styling; missing states.

### V-030: Light Contract Audit
- **Type:** security
- **Status:** ✅ done
- **Milestone:** M5
- **Depends:** V-004
- **Pass criteria:** No critical vulnerabilities. Slither run, reentrancy/access control/overflow checked.
- **Fail criteria:** Critical vulnerability found and unpatched.

---

## Phase 6: Hackathon Demo
**Goal:** Builder Quest submission with demo polish

### V-031: Login Page Fix
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** V-020
- **Pass criteria:** Login page renders and works correctly.
- **Fail criteria:** Login page errors.

### V-032: Register Page Simplify
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** V-016
- **Pass criteria:** Simplified registration flow for demo.
- **Fail criteria:** Registration confusing or broken.

### V-033: Hackathon Popup
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** none
- **Pass criteria:** Popup displays hackathon context to visitors.
- **Fail criteria:** Popup doesn't show or is annoying.

### V-034: Mock Agents Seed
- **Type:** backend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** V-005
- **Pass criteria:** 8 mock agents seeded via API, marketplace looks populated.
- **Fail criteria:** Marketplace empty; seed fails.

### V-035: Demo Job Flow
- **Type:** fullstack
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** V-007, V-013
- **Pass criteria:** Demo hire page with GPT-4o interview works end-to-end.
- **Fail criteria:** Demo flow crashes or looks broken.

### V-036: Demo Dashboard
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** V-015
- **Pass criteria:** Demo dashboard with greyed-out buttons shows job progress concept.
- **Fail criteria:** Dashboard looks incomplete.

### V-037: Gallery with Demo Sites
- **Type:** frontend
- **Status:** ✅ done
- **Milestone:** M6
- **Depends:** none
- **Pass criteria:** Gallery page shows live demo sites (dog walking, portfolio, API dashboard).
- **Fail criteria:** Demo site links broken.

### V-038: ERC-8004 + Twitter Badges
- **Type:** frontend
- **Status:** ❌ todo
- **Milestone:** M6
- **Depends:** V-012
- **Pass criteria:** Verification badges display correctly on agent profiles in marketplace.
- **Fail criteria:** Badges don't render or show wrong status.

---

## Phase 7: Production Launch
**Goal:** Deploy to production and submit

### V-039: Production Deploy & Submit
- **Type:** devops
- **Status:** ✅ done
- **Milestone:** M7
- **Depends:** V-035
- **Pass criteria:** Frontend on Vercel (viberr.fun), backend on Railway, contracts on Base Sepolia. All flows work on production.
- **Fail criteria:** Production URLs broken; deploy failed.

---

## Remaining / Deferred

> These tasks from the original plan are deferred post-hackathon:

- **S2-INT-003 (V-019):** Agent Persona in Interview — todo
- **H-009 (V-038):** ERC-8004 + Twitter Badges — todo
- **H-010:** Live Stats Counter — deferred
- **H-011:** On-chain Proof (tx hashes) — deferred
- **H-012:** Hackathon Post (Moltbook) — deferred
- **H-013:** Vote on 5 Projects — deferred
- **L-002:** Register 0xClaw as Agent — deferred
- **L-003:** Demo Video — deferred
- **L-005:** Hype Campaign — deferred
- **L-006:** Vote on Others — deferred
