# TaskNook functionality review — 2026-08-20

This pass compared TaskNook's current productivity UI with StudyWithSoobin's
video-first workspace. The goal was not to turn this app into a second
TaskNook; it was to bring over the parts that make a study session easier
without adding a backend or crowding the screen.

## Changes made

### Tasks became a compact study plan

- Every task now has an estimated duration (1–720 minutes) and low, medium,
  or high priority.
- The list can be arranged by **My order**, **Quick wins** (shortest first),
  or **Priority** (high first, then shortest). Completed work always stays at
  the bottom and sorting is stable across renders and reloads.
- Clicking an unfinished task marks it as the active study target and loads
  its estimate into the focus timer. It deliberately does not auto-start the
  timer: starting a focus block remains an explicit user action.
- The card displays total unfinished planned minutes and completion count.
- Existing saved `{ id, text, done }` checklist entries migrate automatically
  to 25 minutes / medium priority, so the feature is backwards-compatible.
- Task data, ordering choice, active task, and completion timestamps persist
  through the existing guarded localStorage gateway.

### Focus stats gained a daily goal

- The timer card now shows today's focused minutes against a persisted daily
  goal, with a progress bar and percentage.
- The goal can be switched between 1, 2, and 3 hours from the timer card.
- Existing local-day focus logging and streak behavior remain unchanged.

### Supporting work

- Added `lib/taskPlanning.ts` as a pure, tested home for ordering, duration
  validation, and planned-time calculations.
- Added eight tests across task planning, legacy migration, and daily-goal
  validation; the suite increased from 58 to 66 passing tests.
- Updated the README and the TaskNook-port status in `FINDINGS.md`.

## TaskNook features deliberately not copied

- **Groups, routines, notes, due dates, and the calendar:** valuable in
  TaskNook's planner, but they need significantly more editing/calendar UI and
  would make this small floating card dominate the video workspace.
- **Task algorithms such as random and alternating short/long:** useful for
  a large backlog, but unnecessary noise for the short study plan this card is
  designed to hold. The three retained modes cover manual intent, momentum,
  and urgency.
- **Room/avatar/friends/weather systems:** these define TaskNook's identity;
  they do not support StudyWithSoobin's core video-companion experience.

## Verification

- `npm test`: 66 tests passed.
- `npm run build`: TypeScript and production bundle passed.
- `npm run lint`: passed.
- Browser-tested at the normal desktop viewport: adding tasks, duration and
  priority metadata, quick-wins ordering, loading a 45-minute task into the
  timer, daily-goal rendering, and persistence after reload all worked.
