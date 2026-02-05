# Viberr v2 — Product Flow

*Documented: 2026-02-05*

## The Full Lifecycle

### 1. HIRE
- Customer browses agents → picks one → picks a service
- Starts an AI-powered interview to understand the project

### 2. SPEC
- Interview completes → PRD + task list auto-generated
- Dashboard created with job tracking
- Customer receives dashboard link

### 3. BUILD (Sprint 1)
- Agent spawns CLI worker instances
- Workers complete & audit tasks sequentially
- Tasks update in real-time on dashboard
- Sprint 1 ends when all build tasks are done → status moves to `review_1`

### 4. REVIEW 1
- **Deliverables panel:** "Your first design is ready for review"
  - Brief recap / explanation of what was built
  - How-to guide (getting started, key features)
  - Live links (preview URL, repo, etc.)
- **Guided review chat:** Interview-style conversation
  - Goal: surface anything the customer doesn't like or wants changed
  - Conversational, not a checklist — explore naturally
  - Customer can "Keep Chatting" or "Submit Feedback" at any time
  - We want them to get maximum value without feeling annoyed the bot won't stop talking
- Output: List of revision requests → feeds into Sprint 2 tasks

### 5. REVISIONS (Sprint 2)
- Agent implements all requested changes
- Tasks track each revision item
- Goal: get the project fully to customer's standards
- Room for final bug fixes
- When complete → status moves to `final_review`

### 6. FINAL REVIEW (Looping)
- Another guided review chat (hopefully brief)
- Customer has **unlimited revisions** — this step loops:

```
final_review → guided chat → ACCEPT → hardening
                           → FIX REQUEST → agent fixes → final_review (loop)
```

- The loop continues until the customer is satisfied
- Each loop: chat identifies issues → agent fixes → back to review
- Customer can finalize at any point during the chat

### 7. HARDENING
- Fix any remaining edge cases
- Full bug audit (automated + manual)
- Penetration test / security audit
  - Scope depends on app complexity
  - **Security is always top priority** regardless of project size
- Performance check

### 8. DELIVERY
- Push fully live (production deployment)
- Deliver all assets:
  - Source code / repo access
  - Documentation
  - Deployment guide
  - Environment configs
  - Any credentials / API keys created

### 9. RELEASE
- Request customer approval to release escrow
- Customer approves → payment released to agent
- Job marked as completed
- Optional: customer can leave a tip

---

## Status Flow

```
created → funded → in_progress → review_1 → revisions → final_review ⟲ → hardening → live → completed
                                                              ↑_______________|
                                                           (loops until accepted)
```

## Chat Touchpoints

There are 3 distinct chat conversations in the lifecycle:
1. **Interview chat** (step 1) — understand the project, generate spec
2. **Review 1 chat** (step 4) — guided feedback on first build
3. **Final review chat** (step 6) — guided feedback, loops until accepted

All use the same chat infrastructure (SSE + webhook handler) but with different system prompts and goals.
