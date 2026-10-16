# Study profile and progression

Your profile is available in the Profile tools tab, the toolbar's Level button,
and an expandable Your profile card on the start screen. Choose a display name
and one of four study avatars. The card shows your level, total XP, progress to
the next level, total hours studied, completed-task total, check-in streak,
best streak, and eight milestones.

**Total hours studied** is a prominent lifetime counter, displayed as hours and
minutes (for example, 12 hours 35 min). It includes recorded completed focus
blocks and the available saved study history, excludes breaks, and persists
across app launches. It retains its total when old daily stats are pruned.

## XP rules

| Activity | XP |
| --- | --- |
| Completed focus block | 1 per recorded focus minute |
| First completion of a task | 10 once per task id |
| Daily check-in | 10 + 1 per additional consecutive day, capped at 20 per day |

Focus credit uses the same rounded block durations as the existing focus stats.
The available saved study history counts when this feature first loads. Minutes
that were already pruned from the old 400-day stats log cannot be reconstructed.
After migration, the progression ledger retains lifetime credit even as ordinary
stats prune old days. Breaks, interrupted/reset timers, and picking a video do
not earn focus XP.

Unchecking a task does not remove its earned XP. Rechecking it, deleting it,
clearing completed work, or restoring it with Undo never creates another reward
for that same id. Old completed tasks are remembered in the lifetime count and
milestones without receiving retroactive task bonus XP.

Opening, returning to, or using the app counts as a daily check-in. A window
left unattended overnight does not extend the streak. A missed local calendar
day resets the current streak, while best streak, earned XP and milestones
remain. Calendar day comparisons handle daylight-saving changes. Moving the
clock backward cannot reopen a reward day.

## Levels and milestones

The curve matches TaskNook's `frontend/src/lib/progression.js`:

| Advance | Required XP | Total XP at the new level |
| --- | ---: | ---: |
| 1 → 2 | 100 | 100 |
| 2 → 3 | 150 | 250 |
| 3 → 4 | 200 | 450 |
| 4 → 5 | 250 | 700 |

Each later level requires 50 more XP. Milestones celebrate first focus, first
task, one hour of focus, 10 tasks, a three-day check-in streak, 10 hours of focus,
a seven-day check-in streak, and 50 tasks. Earned milestones remain earned.

## Persistence and implementation

Everything is stored locally under `sws.progression`; there is no account,
backend, currency, or feature gate. Clearing browser storage removes this local
profile and its lifetime ledger. Browser profiles, origins, and the desktop
app's persisted WebView profile each have their own storage.

`lib/progression.ts` contains the pure model. `hooks/useProgression.ts` initializes
history and known task claims, saves outside React updaters, and handles
completion/check-in actions. `lib/progressionSession.ts` queues operations, reads
current persisted progress before applying them, and uses a shared Web Lock to
serialize saves across tabs in supported browsers (including modern Edge/WebView2).
Older browsers fall back to a fresh synchronous read before writing. Storage
events refresh other tabs without echo writes. Failed saves retain pending actions
in memory and replay them on the next successful save; failed reads prevent writing
an unseen profile. Profile saves await the result before reporting success.
`useTimer` invokes the completion callback after
ordinary stats are written. Focus and task callbacks do not run on timer ticks.
Failed storage writes keep progress in memory and report that it is session-only.

Tests cover exact level thresholds, increasing requirements, history backfill
and pruning, completion/relaunch credit, task deduplication, check-in caps and
clock correction, DST/month/year boundaries, malformed storage, profile edits,
and permanent milestones. Run `npm test`, `npm run lint`, and `npm run build`.
Rebuild the Windows executable and run its `SWS_SELFTEST=1` path after runtime
changes.
