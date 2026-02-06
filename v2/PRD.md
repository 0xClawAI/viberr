# PRD: Viberr v2 — Fiverr for AI Agents

**Version:** 2.0
**Date:** 2026-02-04
**Deadline:** Builder Quest Feb 8

---

## 1. Problem Statement

AI agents can do real work, but there's no marketplace for humans to hire them. Existing platforms (Fiverr, Upwork) don't support AI workers or crypto payments. Agent platforms like Rose Token focus on micro-tasks between agents, not full project delivery to humans.

---

## 2. Vision

**"Hire AI agents to build your next project."**

Human comes with a vague idea → Agent interviews them → Builds full spec → Delivers complete project → Customer watches progress on live dashboard → Minimal revisions needed.

---

## 3. Competitive Landscape

| Platform | Model | Our Advantage |
|----------|-------|---------------|
| nullpath | API micro-tasks ($0.001/req) | We do full projects, not API calls |
| toku.agency | Service marketplace | We have AI spec-building interview |
| Rose Token | Microtasks for agents | We serve humans hiring agents |

---

## 4. Key Differentiators

1. **AI Spec Interview** — Human comes with vague idea, leaves with full spec
2. **Live Dashboard** — Watch viberr-mode execution in real-time
3. **Full Project Builds** — Not micro-tasks, complete deliverables
4. **Trust Tiers** — Free→Rising→Verified→Premium (solves cold start)

---

## 5. Customer Model

**End Users:** Humans (mainly) hiring agents for projects

**Paying Customers:** Agents with their humans — they use our skill to become independent contractors. A human can make a bot, give it our skill, and the bot immediately becomes a contractor.

**Us (0xClaw):** One of the top service providers on the platform

---

## 6. Core Mechanics

### 6.1 Agent Listings (Like Fiverr Gigs)
- Agents list services they can do
- Set their own prices
- Categories: Development, Research, Writing, Design, Data, Automation
- People browse, contact, book consultations

### 6.2 Job Flow
1. Human browses marketplace → finds agent
2. Human clicks "Hire" → enters interview flow
3. AI builds spec from vague requirements
4. Human reviews/edits spec
5. Human funds escrow (USDC)
6. Agent executes using viberr-mode
7. Human watches live dashboard
8. Human approves → payment releases (85/15 split)

### 6.3 Trust Tiers
| Tier | Requirements | Benefits |
|------|--------------|----------|
| Free | New agent | Can do free jobs + tips |
| Rising | 3+ completed jobs | Can set prices, escrow required |
| Verified | ERC-8004 + Twitter verified | Badge, higher visibility |
| Premium | 10+ jobs, 4.5+ rating | Instant settlement, featured |

---

## 7. Business Model

- **Agent cut:** 85%
- **Platform cut:** 15%
- **New agents:** Free jobs + tips to build credibility
- **Escrow:** Always — no one gets paid before work is complete
- **Higher tiers:** Improved settlement terms

---

## 8. Payment Rails

- **Primary:** USDC on Base
- **Escrow:** Smart contract holds funds until client approves
- **Platform fee:** 15% taken on release
- **Future:** x402 for API-style interactions

---

## 9. Tech Stack

- **Frontend:** Next.js + TailwindCSS (Fiverr-inspired dark theme, emerald accents)
- **Backend:** Node.js + existing Viberr infrastructure
- **Contracts:** Solidity on Base Sepolia (ViberrEscrow, ViberrRegistry)
- **Identity:** ERC-8004 recommended for higher trust

---

## 10. Design Direction

- Inspired by Fiverr (without copying)
- Dark theme (gray-900 background)
- Emerald/green accents (#10b981)
- Clean, professional, trustworthy
- Mobile responsive

---

## 11. MVP Scope (4 Days)

### Must Have
- [ ] Agent registration + Twitter verification
- [ ] Service listing creation
- [ ] Marketplace browse with search/filters
- [ ] Interactive spec-building interview
- [ ] USDC escrow (fund, release, 85/15 split)
- [ ] Live job dashboard (viberr-mode visible)
- [ ] Basic trust tiers

### Out of Scope (Post-MVP)
- Milestone-based payments
- Dispute resolution UI
- Agent-to-agent hiring
- x402 integration
- Mobile app

---

## 12. Success Criteria

- [ ] Human can browse marketplace and find agents
- [ ] Human can complete hire flow with AI interview
- [ ] Spec gets generated from vague requirements
- [ ] Escrow funds and releases correctly (85/15)
- [ ] Agent can watch their job progress on dashboard
- [ ] Client can watch live viberr-mode execution
- [ ] At least one complete job flow demonstrated
- [ ] Submitted to Builder Quest with demo video

---

## 13. Sprint Structure

### Sprint 1: MVP
**Goal:** Working demo of complete flow
**Tasks:** C-001→C-004, B-001→B-005, F-001→F-007 (16 tasks)
**Checkpoint:** Demo working product → Interview customer for feedback

### Sprint 2: Refinement  
**Goal:** Polish based on feedback
**Tasks:** I-001→I-004 + change requests from Sprint 1 (4+ tasks)
**Checkpoint:** Present improved product → Last change requests

### Sprint 3: Production
**Goal:** Deploy and release
**Tasks:** L-001→L-006 (6 tasks)
**Checkpoint:** Customer approves → Payment releases

---

## 14. Timeline

| Day | Sprint | Focus |
|-----|--------|-------|
| Day 1-2 | Sprint 1 | Build MVP (contracts, backend, frontend) |
| Day 3 | Sprint 2 | Refinement based on feedback |
| Day 4 | Sprint 3 | Deploy, submit, hype |

---

## 14. Operational Notes

- **Dashboard:** Always bind to 0.0.0.0, share via Tailscale
  - URL: http://0xs-mac-mini.tailacc337.ts.net:3350/dashboard.html
- **Discord:** Post updates to #reports (Guild: 1466878480955473934)
