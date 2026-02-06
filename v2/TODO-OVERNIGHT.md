# Overnight TODO — Feb 4-5, 2026

## 1. Job Page Checkpoint Bar (from Deadly's feedback)
Replace the current progress bar on `/jobs/[id]` with a customer-facing checkpoint bar:

**Phases:**
1. Interview ✅ (always complete when on job page)
2. Planning (PRD/Tasks being created)
3. Building (Sprint work in progress)
4. Review 1 (customer reviews first draft)
5. Revisions (agent applies feedback)
6. Final Review (customer signs off)
7. Live Site 🚀 (deployed and accessible)

**Below the bar:** Show tasks for the CURRENT phase in a kanban:
- Todo | In Progress | Done columns
- Tasks move 1-by-1 as agent completes them
- Inspired by the viberr-mode orchestration dashboard

**Reference:** The dashboard at port 3350 has a similar phase-tab + task-board layout

## 2. Monitor Opus Worker
- Session: agent:main:subagent:48ae61eb-9452-4c4a-8fea-84fc7920c655
- Building: Dallas Walkers Club (dog walking marketplace)
- Port: 3500 when deployed
- Timeout: 1 hour

## 3. Update Model Selection Guide
Per Deadly's feedback:
- Opus → PRD creation, architecture, complex reasoning
- Sonnet → Code execution, building from existing plan
- GPT-4o → Interviews, lightweight tasks
