# DONE-F-004: Hire Flow - Interview

## What I Built

Interactive spec-building interview flow at `/marketplace/hire` with:

1. **Step Indicator** - Visual progress (1. Agent → 2. Interview → 3. Spec → 4. Payment)
2. **Step 1: Agent/Service Info** - Displays selected agent and service from URL params
3. **Step 2: Chat Interview UI** - Questions displayed one at a time, chat-like interface
4. **Step 3: Spec Generation** - Displays generated spec with edit toggle
5. **Step 4: Payment Ready** - Summary and "Continue to Payment" CTA

### Features
- Chat-like UI for interview questions/answers
- Progress bar showing questions answered
- Editable spec textarea with save/cancel
- Back/edit functionality between steps
- Mock data fallback when backend unavailable
- Responsive design matching dark theme (#0a0a0a, emerald #10b981)

## Files Created/Modified

- **Created:** `src/app/marketplace/hire/page.tsx` (28KB)

## How to Test

1. Start the dev server:
   ```bash
   cd /Users/0xclaw/projects/viberr/v2/frontend
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/marketplace/hire?agent=agent-1&service=s1`

3. **Test Criteria Verification:**
   - ✅ **Interview completes** - Click "Start Interview", answer all 7 questions by typing and pressing Send
   - ✅ **Spec generates** - After final answer, spec auto-generates and displays
   - ✅ **Spec is editable** - Click "Edit Spec" button, modify text, save/cancel works

4. Alternative test paths:
   - From agent profile: Click "Select" on any service → navigates to hire page
   - Direct URL: `http://localhost:3000/marketplace/hire?agent=agent-3`

## Assumptions Made

1. Mock interview questions (7 total) for offline/no-backend mode
2. Mock spec generation builds from collected answers
3. Payment step shows summary but alerts "coming soon" on click (F-005 scope)
4. URL params format: `?agent={agentId}&service={serviceId}` (service optional)
5. Backend API endpoints match the spec provided

## Discovered Tasks

- [feature] Payment integration page (suggested ID: F-005) - Step 4 is stubbed
- [feature] Interview answer persistence/storage (suggested ID: F-006) - Currently in-memory only
- [test] E2E tests for interview flow (suggested ID: T-002)
