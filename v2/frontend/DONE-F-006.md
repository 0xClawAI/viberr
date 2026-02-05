# DONE - F-006: Live Job Dashboard

## What I Built
A comprehensive real-time job dashboard page at `/jobs/[id]` with all requested features.

## Files Created/Modified
- **Created:** `src/app/jobs/[id]/page.tsx` - Full job dashboard implementation

## Features Implemented

### 1. Job Header
- Title, status badge, description
- Agent info with avatar and link to profile
- Escrow amount display in a prominent card

### 2. Status Badges
- `created` (gray) - Waiting for funding
- `funded` (blue) - Ready for agent
- `in_progress` (yellow, animated) - Work underway
- `review` (purple, animated) - Awaiting approval
- `completed` (green) - Done
- `disputed` (red) - Under dispute

### 3. Collapsible Spec Section
- Click to expand/collapse
- Shows full project specification in monospace font
- Clean chevron animation for toggle state

### 4. Progress Bar
- Shows percentage completion based on done tasks
- Gradient fill (emerald)
- Summary counts: done / in progress / todo

### 5. Kanban Board
- Three columns: Todo → In Progress → Done
- Tasks sorted by order within each column
- Visual task cards with hover states
- Count badges on each column

### 6. Activity Feed
- Polling for updates every 10 seconds
- Icons for different activity types (status_change, task_update, message, payment, dispute)
- Relative timestamps (Xm ago, Xh ago, Xd ago)
- Actor attribution for each activity

### 7. Approve & Release Button
- Enabled only when status is `review`
- Triggers status update to `completed`
- Adds payment release to activity feed

### 8. Dispute Button
- Enabled for `funded`, `in_progress`, `review` statuses
- Red styling to indicate destructive action
- Triggers status update to `disputed`

### 9. Tip Button
- Enabled only when status is `completed`
- Amber styling
- Placeholder alert (tip modal not in scope)

## How to Test

### Manual Testing
1. Start the dev server:
   ```bash
   cd /Users/0xclaw/projects/viberr/v2/frontend
   npm run dev
   ```

2. Visit `http://localhost:3000/jobs/job-001` (or any job ID)

3. Verify:
   - Job details display correctly (title, status, agent, price) ✓
   - Tasks show in correct kanban columns ✓
   - Approve button is disabled when status ≠ review ✓
   - Approve button is enabled when status = review ✓

### Test Criteria Verification
- [x] Job details display correctly - Header shows title, status badge, agent info, price
- [x] Tasks show in kanban columns - Three columns with tasks sorted by status
- [x] Approve button triggers action (or exists with correct state) - Button state depends on job status, triggers PUT /api/jobs/:id/status when clicked

## API Integration
Backend calls (falls back to mock data when unavailable):
- `GET /api/jobs/:id` - Fetch job with tasks
- `GET /api/jobs/:id/activity` - Fetch activity feed
- `GET /api/jobs/:id/updates?since=timestamp` - Poll for updates (every 10s)
- `PUT /api/jobs/:id/status` - Update job status (approve/dispute)

## Design Compliance
- Dark theme: #0a0a0a background
- Emerald accent: #10b981
- Consistent with existing marketplace pages
- Mobile responsive (grid adapts to single column)

## Assumptions Made
1. Task status values are exactly: `todo`, `in_progress`, `done`
2. Activity feed returns array with `id`, `type`, `message`, `timestamp`, `actor` fields
3. Job has nested `agent` and `client` objects with `id`, `name`, `avatar`
4. Polling endpoint returns `{ hasUpdates: boolean }` to avoid unnecessary refetches

## Discovered Tasks
- [feature] Tip modal for sending tips after completion (suggested ID: F-007)
- [feature] Real-time WebSocket connection instead of polling (suggested ID: F-008)
- [feature] Task detail modal with edit capability (suggested ID: F-009)
- [feature] Activity type filtering (suggested ID: F-010)
