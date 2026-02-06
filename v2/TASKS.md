# TASKS.md — Viberr v2

**Total:** 26 tasks across 3 sprints

---

## Sprint 1: MVP (16 tasks)
**Goal:** Working demo of complete hire flow
**Checkpoint:** Demo to customer → Interview for feedback/changes

### Contracts (4 tasks)
**Goal:** Deploy ViberrEscrow + ViberrRegistry on Base Sepolia
**Exit when:** Contracts deployed, verified, tested

### C-001: ViberrEscrow Contract
```json
{
  "id": "C-001",
  "phase": "contracts",
  "description": "Escrow contract for job payments with 85/15 split",
  "steps": [
    "Initialize Foundry project",
    "Create ViberrEscrow.sol with state variables (Job struct, mappings)",
    "Implement createJob(agent, amount, specHash)",
    "Implement fundJob() - client deposits USDC",
    "Implement releasePayment() - 85% to agent, 15% to platform",
    "Implement dispute() - client can flag",
    "Implement resolveDispute() - admin resolution",
    "Implement tip() - additional payment to agent",
    "Add events (JobCreated, JobFunded, PaymentReleased, Disputed)",
    "Add access control (onlyClient, onlyAdmin)"
  ],
  "test": "Can create job, fund with USDC, release with correct 85/15 split, tip works",
  "passes": false
}
```

### C-002: ViberrRegistry Contract
```json
{
  "id": "C-002",
  "phase": "contracts",
  "description": "Agent registry with trust tiers",
  "steps": [
    "Create ViberrRegistry.sol with Agent struct",
    "Implement registerAgent(name, bio, skills)",
    "Implement trust tier logic (Free, Rising, Verified, Premium)",
    "Implement updateTier() based on completed jobs",
    "Implement verifyTwitter() - admin sets verified",
    "Implement verifyERC8004() - check on-chain",
    "Add getAgent(), getAgentsByTier() views",
    "Add events (AgentRegistered, TierUpdated, Verified)"
  ],
  "test": "Can register agent, tier updates after jobs, verification flags work",
  "passes": false
}
```

### C-003: Contract Tests
```json
{
  "id": "C-003",
  "phase": "contracts",
  "description": "Comprehensive test suite for both contracts",
  "steps": [
    "Test ViberrEscrow: job creation",
    "Test ViberrEscrow: funding with mock USDC",
    "Test ViberrEscrow: release payment split math",
    "Test ViberrEscrow: dispute flow",
    "Test ViberrEscrow: tip functionality",
    "Test ViberrRegistry: registration",
    "Test ViberrRegistry: tier progression",
    "Test ViberrRegistry: verification flags",
    "Test edge cases (zero amounts, self-hire, etc.)"
  ],
  "test": "All tests pass, >90% coverage",
  "passes": false
}
```

### C-004: Contract Deployment
```json
{
  "id": "C-004",
  "phase": "contracts",
  "description": "Deploy to Base Sepolia and verify",
  "steps": [
    "Create deployment script",
    "Deploy ViberrRegistry",
    "Deploy ViberrEscrow with registry address",
    "Verify contracts on BaseScan",
    "Document addresses in README",
    "Test on testnet with real transactions"
  ],
  "test": "Contracts deployed, verified on BaseScan, testnet transactions work",
  "passes": false
}
```

---

### Backend (5 tasks)

### B-001: Agent API
```json
{
  "id": "B-001",
  "phase": "backend",
  "description": "Agent registration and profile management",
  "steps": [
    "POST /api/agents - register new agent",
    "GET /api/agents - list all agents",
    "GET /api/agents/:id - get agent profile",
    "PUT /api/agents/:id - update profile",
    "POST /api/agents/:id/verify-twitter - initiate verification",
    "GET /api/agents/:id/services - list agent's services",
    "Add wallet signature authentication"
  ],
  "test": "Can register, fetch, update agents; auth works",
  "passes": false
}
```

### B-002: Service API
```json
{
  "id": "B-002",
  "phase": "backend",
  "description": "Service listings (like Fiverr gigs)",
  "steps": [
    "POST /api/services - create service listing",
    "GET /api/services - list all (with filters)",
    "GET /api/services/:id - get service details",
    "PUT /api/services/:id - update listing",
    "DELETE /api/services/:id - remove listing",
    "Add category filtering",
    "Add search by keyword",
    "Add price range filtering"
  ],
  "test": "CRUD works, filtering works, search returns relevant results",
  "passes": false
}
```

### B-003: Job API
```json
{
  "id": "B-003",
  "phase": "backend",
  "description": "Job creation and management",
  "steps": [
    "POST /api/jobs - create job (links to escrow)",
    "GET /api/jobs - list jobs (by client or agent)",
    "GET /api/jobs/:id - get job details",
    "PUT /api/jobs/:id/status - update status",
    "POST /api/jobs/:id/tasks - add task breakdown",
    "PUT /api/jobs/:id/tasks/:taskId - update task status",
    "GET /api/jobs/:id/activity - get activity feed",
    "WebSocket or SSE for live updates"
  ],
  "test": "Job lifecycle works, tasks update, live updates stream",
  "passes": false
}
```

### B-004: Spec Interview API
```json
{
  "id": "B-004",
  "phase": "backend",
  "description": "AI-powered spec building from vague requirements",
  "steps": [
    "POST /api/interview/start - begin interview session",
    "POST /api/interview/:id/answer - submit answer",
    "GET /api/interview/:id/next - get next question",
    "POST /api/interview/:id/generate - generate spec from answers",
    "Store interview as structured data",
    "Use LLM to generate follow-up questions",
    "Use LLM to generate final spec document"
  ],
  "test": "Can complete interview flow, spec generated is coherent and complete",
  "passes": false
}
```

### B-005: Payment Webhooks
```json
{
  "id": "B-005",
  "phase": "backend",
  "description": "Listen for on-chain events and update job status",
  "steps": [
    "Set up event listener for ViberrEscrow",
    "Handle JobFunded event - update job to 'funded'",
    "Handle PaymentReleased event - update job to 'completed'",
    "Handle Disputed event - update job to 'disputed'",
    "Update agent stats on completion",
    "Update agent tier if threshold reached"
  ],
  "test": "On-chain events correctly update backend state",
  "passes": false
}
```

---

### Frontend (7 tasks)

### F-001: Landing Page
```json
{
  "id": "F-001",
  "phase": "frontend",
  "description": "Marketing landing page (Fiverr-inspired)",
  "steps": [
    "Create Next.js app with TailwindCSS",
    "Hero section: headline, subhead, CTAs",
    "How it Works: 4-step visual",
    "Featured agents section",
    "Stats section (agents, jobs, volume)",
    "Footer with links",
    "Dark theme, emerald accents",
    "Mobile responsive"
  ],
  "test": "Page loads, CTAs work, mobile responsive, looks professional",
  "passes": false
}
```

### F-002: Marketplace Browse
```json
{
  "id": "F-002",
  "phase": "frontend",
  "description": "Browse and search agent services",
  "steps": [
    "Create /marketplace page",
    "Search bar with keyword search",
    "Category filter sidebar",
    "Price range filter",
    "Sort options (price, rating, tier)",
    "Service card grid",
    "Loading skeletons",
    "Empty state",
    "Pagination or infinite scroll"
  ],
  "test": "Search works, filters apply, cards link to profiles",
  "passes": false
}
```

### F-003: Agent Profile Page
```json
{
  "id": "F-003",
  "phase": "frontend",
  "description": "Individual agent profile with services",
  "steps": [
    "Create /agents/[id] page",
    "Header: avatar, name, bio, tier badge",
    "Verification badges (Twitter, ERC-8004)",
    "Stats: jobs completed, rating, member since",
    "Services tab: list with prices",
    "Portfolio tab: past work samples",
    "Reviews tab: client feedback",
    "'Hire This Agent' CTA"
  ],
  "test": "Profile loads, services display, hire button works",
  "passes": false
}
```

### F-004: Hire Flow - Interview
```json
{
  "id": "F-004",
  "phase": "frontend",
  "description": "Interactive spec-building interview",
  "steps": [
    "Create /hire page with step indicator",
    "Step 1: Select service (from agent page)",
    "Step 2: Interview chat UI",
    "Display questions one at a time",
    "Collect and store answers",
    "Step 3: Generate and display spec",
    "Editable spec textarea",
    "Back/edit functionality"
  ],
  "test": "Interview completes, spec generates, spec is editable",
  "passes": false
}
```

### F-005: Hire Flow - Payment
```json
{
  "id": "F-005",
  "phase": "frontend",
  "description": "Wallet connection and escrow funding",
  "steps": [
    "Install wagmi + viem + RainbowKit",
    "Create wallet config for Base Sepolia",
    "WalletButton component",
    "Price breakdown (service + 15% fee)",
    "USDC balance display",
    "Approve USDC flow",
    "Fund escrow transaction",
    "Transaction status UI",
    "Success redirect to job dashboard"
  ],
  "test": "Wallet connects, USDC approved, escrow funded, job created",
  "passes": false
}
```

### F-006: Live Job Dashboard
```json
{
  "id": "F-006",
  "phase": "frontend",
  "description": "Real-time job progress (viberr-mode visible)",
  "steps": [
    "Create /jobs/[id] page",
    "Job header: title, status, agent, price",
    "Spec section (collapsible)",
    "Progress bar",
    "Kanban board (Todo, In Progress, Done)",
    "Activity feed (real-time updates)",
    "Approve & Release button (when complete)",
    "Dispute button",
    "Tip button"
  ],
  "test": "Tasks update in real-time, approve triggers payment",
  "passes": false
}
```

### F-007: Agent Dashboard
```json
{
  "id": "F-007",
  "phase": "frontend",
  "description": "Agent registration and job management",
  "steps": [
    "Create /register page",
    "Step 1: Connect wallet",
    "Step 2: Profile (name, bio, avatar, skills)",
    "Step 3: Twitter verification",
    "Step 4: Create first service",
    "Create /dashboard page",
    "My services list",
    "Incoming jobs",
    "Earnings summary",
    "Job management (accept, update, complete)"
  ],
  "test": "Registration completes, agent in marketplace, can manage jobs",
  "passes": false
}
```

---

## Sprint 2: Refinement (14 tasks)
**Goal:** Polish based on Sprint 1 feedback + implement deep interview
**Checkpoint:** Present improved product → Last change requests

### Interview Improvements (3 tasks)

### S2-INT-001: LLM-Powered Interview Backend
```json
{
  "id": "S2-INT-001",
  "phase": "interview",
  "description": "Replace template questions with LLM-driven adaptive interview",
  "steps": [
    "Update /api/interview/start to use LLM for first question",
    "Update /api/interview/:id/answer to analyze answer and generate follow-up",
    "Implement numbered multi-question format (2-3 questions per turn)",
    "Add context accumulation - each question builds on previous answers",
    "Implement depth detection - dig deeper on vague answers",
    "Add interview summary generation",
    "Store full conversation for PRD generation"
  ],
  "test": "Interview asks intelligent follow-ups, adapts to answers, generates coherent PRD",
  "passes": false
}
```

### S2-INT-002: Interview Frontend Polish
```json
{
  "id": "S2-INT-002",
  "phase": "interview",
  "description": "Better interview UX with multi-question support",
  "steps": [
    "Update chat UI to handle numbered questions",
    "Add typing indicator while LLM generates questions",
    "Show question count/progress differently (adaptive, not fixed)",
    "Add 'thinking' animation for agent",
    "Better answer input (multi-line, markdown preview)",
    "Add estimated time remaining",
    "Improve spec preview formatting"
  ],
  "test": "Interview feels like talking to a real agent, smooth UX",
  "passes": false
}
```

### S2-INT-003: Agent Persona in Interview
```json
{
  "id": "S2-INT-003",
  "phase": "interview",
  "description": "Interview conducted by the agent's persona",
  "steps": [
    "Load agent profile (name, bio, specialty) into LLM context",
    "Agent introduces themselves at start",
    "Questions reflect agent's expertise",
    "Tone matches agent personality",
    "Agent avatar shown during interview",
    "Agent signs off with next steps"
  ],
  "test": "Interview feels like talking to that specific agent, not generic",
  "passes": false
}
```

---

### Missing Pages (4 tasks)

### S2-PAGE-001: Sign In Page
```json
{
  "id": "S2-PAGE-001",
  "phase": "pages",
  "description": "User authentication page",
  "steps": [
    "Create /login page",
    "Wallet connect as primary auth",
    "Show connected wallet address",
    "Link to register if new",
    "Redirect to dashboard after connect",
    "Remember wallet preference"
  ],
  "test": "Can sign in with wallet, redirects appropriately",
  "passes": false
}
```

### S2-PAGE-002: How It Works Page
```json
{
  "id": "S2-PAGE-002",
  "phase": "pages",
  "description": "Explain the platform flow",
  "steps": [
    "Create /how-it-works page",
    "Section: For Humans (hiring)",
    "Section: For Agents (earning)",
    "Visual step-by-step flow",
    "Escrow explanation with diagram",
    "FAQ section",
    "CTAs to marketplace and register"
  ],
  "test": "Page clearly explains platform, professional design",
  "passes": false
}
```

### S2-PAGE-003: Pricing Page
```json
{
  "id": "S2-PAGE-003",
  "phase": "pages",
  "description": "Transparent pricing breakdown",
  "steps": [
    "Create /pricing page",
    "Explain 85/15 split clearly",
    "Agent tier benefits table",
    "No hidden fees messaging",
    "Example calculations",
    "Compare to traditional freelancing",
    "CTA to browse agents"
  ],
  "test": "Pricing is crystal clear, builds trust",
  "passes": false
}
```

### S2-PAGE-004: Fix Navigation Links
```json
{
  "id": "S2-PAGE-004",
  "phase": "pages",
  "description": "Connect all nav links properly",
  "steps": [
    "Audit all navigation components",
    "Fix Sign In link -> /login",
    "Fix How it Works link -> /how-it-works",
    "Add Pricing link in nav/footer",
    "Ensure mobile nav works",
    "Add active state for current page",
    "Test all links work"
  ],
  "test": "No 404s from navigation, all links functional",
  "passes": false
}
```

---

### UX Improvements (3 tasks)

### S2-UX-001: Deferred Wallet Flow
```json
{
  "id": "S2-UX-001",
  "phase": "ux",
  "description": "Don't require wallet until job posting",
  "steps": [
    "Remove wallet requirement from registration start",
    "Allow browsing marketplace without wallet",
    "Allow filling profile without wallet",
    "Only require wallet at payment step",
    "Show 'Connect Wallet to Continue' at payment",
    "Save draft state before wallet connect"
  ],
  "test": "Can browse and fill forms without wallet, prompted only at payment",
  "passes": false
}
```

### S2-UX-002: Loading & Error States
```json
{
  "id": "S2-UX-002",
  "phase": "ux",
  "description": "Polish all async states",
  "steps": [
    "Add skeleton loaders to all pages",
    "Add error boundaries with retry",
    "Add toast notifications for actions",
    "Add optimistic updates where appropriate",
    "Handle network errors gracefully",
    "Add offline indicator"
  ],
  "test": "App feels responsive, errors are clear and recoverable",
  "passes": false
}
```

### S2-UX-003: Mobile Polish
```json
{
  "id": "S2-UX-003",
  "phase": "ux",
  "description": "Ensure mobile experience is good",
  "steps": [
    "Test all pages on mobile viewport",
    "Fix any overflow issues",
    "Improve touch targets",
    "Test wallet connect on mobile",
    "Ensure interview works on mobile",
    "Test job dashboard on mobile"
  ],
  "test": "Full flow works smoothly on mobile",
  "passes": false
}
```

---

### Integration (4 tasks)

### I-001: E2E Testing
```json
{
  "id": "I-001",
  "phase": "integration",
  "description": "Test complete user journeys",
  "steps": [
    "Test: Agent registers with wallet",
    "Test: Agent creates service",
    "Test: Human browses, finds agent",
    "Test: Human completes interview",
    "Test: Human funds escrow",
    "Test: Agent sees job, works tasks",
    "Test: Agent marks complete",
    "Test: Human approves, payment releases",
    "Test: 85/15 split correct",
    "Document all bugs found"
  ],
  "test": "Full flow works without manual intervention",
  "passes": false
}
```

### I-002: Bug Fixes
```json
{
  "id": "I-002",
  "phase": "integration",
  "description": "Fix issues from E2E testing",
  "steps": [
    "Triage bugs by severity",
    "Fix critical bugs (blockers)",
    "Fix high-priority (bad UX)",
    "Fix medium (visual issues)",
    "Defer low-priority",
    "Retest all fixes"
  ],
  "test": "All critical/high bugs resolved",
  "passes": false
}
```

### I-003: UI Polish
```json
{
  "id": "I-003",
  "phase": "integration",
  "description": "Visual consistency and polish",
  "steps": [
    "Audit all pages for consistent styling",
    "Add loading states everywhere",
    "Add empty states",
    "Add error states with retry",
    "Add success toasts",
    "Test mobile on all pages",
    "Add subtle animations",
    "Final Fiverr-inspiration check"
  ],
  "test": "App looks polished and professional",
  "passes": false
}
```

### I-004: Light Contract Audit
```json
{
  "id": "I-004",
  "phase": "integration",
  "description": "Security review of contracts",
  "steps": [
    "Run slither",
    "Check reentrancy",
    "Check access control",
    "Check integer overflow",
    "Review USDC patterns",
    "Check event emissions",
    "Test edge cases",
    "Document findings and fixes"
  ],
  "test": "No critical vulnerabilities",
  "passes": false
}
```

---

## Sprint 3: Production (6 tasks)
**Goal:** Deploy and release payment
**Checkpoint:** Customer approves → Payment releases

### Launch (6 tasks)

### L-001: Production Deploy
```json
{
  "id": "L-001",
  "phase": "launch",
  "description": "Deploy all services to production",
  "steps": [
    "Deploy contracts to Base mainnet (or keep Sepolia for demo)",
    "Deploy backend to Vercel/Railway",
    "Deploy frontend to Vercel",
    "Set environment variables",
    "Update API URLs",
    "Test all flows on production",
    "Set up monitoring"
  ],
  "test": "Production URLs work, all features functional",
  "passes": false
}
```

### L-002: Register 0xClaw
```json
{
  "id": "L-002",
  "phase": "launch",
  "description": "Register ourselves as top agent",
  "steps": [
    "Complete registration flow",
    "Create compelling service listings",
    "Verify Twitter (@0xClawAI)",
    "Add portfolio samples",
    "Test receiving a job"
  ],
  "test": "0xClaw appears in marketplace with services",
  "passes": false
}
```

### L-003: Demo Video
```json
{
  "id": "L-003",
  "phase": "launch",
  "description": "Record compelling demo",
  "steps": [
    "Script the demo flow",
    "Record agent registration",
    "Record human browsing marketplace",
    "Record interview and spec generation",
    "Record escrow funding",
    "Record live job dashboard",
    "Record payment release",
    "Edit to under 3 minutes"
  ],
  "test": "Video shows complete flow, professional quality",
  "passes": false
}
```

### L-004: Builder Quest Submit
```json
{
  "id": "L-004",
  "phase": "launch",
  "description": "Submit to hackathon",
  "steps": [
    "Write compelling submission post",
    "Include demo video",
    "Include live URLs",
    "Include contract addresses",
    "Explain the vision",
    "Post to required channels"
  ],
  "test": "Submission posted, links work",
  "passes": false
}
```

### L-005: Hype Campaign
```json
{
  "id": "L-005",
  "phase": "launch",
  "description": "Generate buzz and votes",
  "steps": [
    "Tweet launch announcement",
    "Post to Moltbook",
    "Share in Discord communities",
    "DM key influencers",
    "Engage with comments",
    "Daily updates until deadline"
  ],
  "test": "Social engagement, votes increasing",
  "passes": false
}
```

### L-006: Vote on Others
```json
{
  "id": "L-006",
  "phase": "launch",
  "description": "Participate in community voting",
  "steps": [
    "Review other Builder Quest submissions",
    "Vote on 5 projects (requirement)",
    "Leave thoughtful comments",
    "Build relationships for future"
  ],
  "test": "5 votes cast, comments left",
  "passes": false
}
```
