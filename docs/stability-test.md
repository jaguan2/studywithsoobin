# Stability and patch test

Run on October 14, 2026, on the `dev` branch.

## Bugs reproduced and patched

| Area | Reproduced failure | Patch |
| --- | --- | --- |
| Saved timer settings | `sws.pomodoro` containing valid JSON `null` crashed `TimerPanel` during rendering. | Validate the parsed value before reading fields; malformed settings fall back to defaults. |
| Study streaks | A three-day streak spanning the March 2026 daylight-saving change counted only two days. | Walk calendar-day ordinals rather than subtracting 24 hours from local midnight. The calendar validator is shared with progression. |
| Focus history | Impossible dates and JSON numeric overflow (`1e999`) were accepted; today's total could remain `Infinity` even after another session. | Ignore invalid dates and non-finite totals before displaying or extending history. Pruning uses local calendar days. |
| YouTube API recovery | A timed-out script remained in the document and was reused by the next attempt. Existing failed tags also remained, callbacks accumulated, and synchronous injection errors left a rejected promise cached. | Remove failed/stalled scripts, detach listeners, restore the previous ready callback, and clear the failed promise cache. Concurrent players still share one request. |

The regression tests failed on the original implementation in seven assertions,
then passed after the patches. Additional coverage checks late error events,
pre-existing APIs/callbacks, premature ready callbacks, leap days, year boundaries,
and malformed timer settings. XP awards and the level curve are unchanged.

## Verification

| Check | Result |
| --- | --- |
| Original automated suite | 129 tests passed before patches. |
| Final `npm test` | 146 tests passed across 12 files (17 added tests). |
| `npm run lint` | Passed. |
| `npm run build` | Type-check and production build passed. |
| `git diff --check` | Passed. |
| Python desktop startup | Headless self-test passed; pywebview imported and the static server started on port 39218. |
| Windows executable | Rebuilt; all 61 bundled frontend assets match `dist/`, pywebview is present in the archive, and the frozen headless self-test exited successfully. |

The test runner prints deprecation warnings about the React plugin's esbuild
options; tests complete successfully. This patch does not upgrade dependencies.

## Scope and remaining manual checks

Timer settings are tested through a React server render. API recovery uses a
mocked document and fake timers; it does not contact YouTube. Existing tests
continue to cover task ordering/Undo, progression eligibility and persistence
helpers, catalog filtering, music links, and theme contrast calculations.

Live video/captions/audio playback and interactive desktop checks were not run:
the native computer-use connection is unavailable in this session. New
screenshots also remain pending; see [the capture plan](screenshots.md).

For a later interactive smoke test:

1. Select a video, switch tools, and confirm the timer and audio survive tab changes.
2. Add, edit, reorder, complete, reopen, delete, and Undo tasks. Confirm each task
   earns its bonus only once, including after relaunch.
3. Complete a short focus block and a Pomodoro round; confirm completed focus
   updates study time/XP, while breaks, pauses, and resets do not add credit.
4. Change the profile and appearance, relaunch the desktop app, and confirm
   local settings and totals remain saved.
5. Start offline, restore the network, and retry a video. Check actual playback,
   captions, and music controls once the API loads.

Suggested commit message: `fix: harden saved study state and YouTube API recovery`

## Follow-up fixes — October 16, 2026

An independent Codex review identified two additional issues, now patched:

- **Progression overwrites between tabs.** A stale profile save could replace
  newer task XP and lifetime claims. `progressionSession.ts` now queues actions,
  re-reads persisted state, and serializes read/modify/write with a shared browser
  Web Lock where available. Storage events refresh other tabs without writing
  back. Pending failed saves replay on the newest state; focus high-water marks
  prevent retry/backfill double-credit. Failed reads prevent writes that could
  overwrite unseen progress. The profile form awaits the save result.
- **Player recovery after an API failure.** Selecting another video in the dock
  now retries failed initialization, as does a browser `online` event. Normal
  video changes retain the existing player, and unmounting cancels pending work.

Added 17 regression tests: eight session-store tests, four mounted profile-hook
tests, and five mounted player tests. They cover stale and overlapping saves,
task/check-in deduplication, failed reads/writes, cross-tab storage notifications,
focus accounting, retry selection, restored connectivity, and cleanup. React's
test renderer and its types are development dependencies, pinned to 18.3.1.

Verification: **163 tests passed across 15 files**, lint and the production build
passed, and the patch passed `git diff --check`. The Windows executable was
rebuilt; all 61 bundled frontend assets match `dist/`. Both the Python launcher
and frozen executable passed their headless self-tests. The sandboxed executable
check timed out; the same check passed outside the sandbox. The independent
reviewer inspected the fixes and found no further concrete regression.

The dependency audit separately reported 16 advisories (six moderate, ten high).
No automatic dependency upgrades were applied in this patch. Actual browser
Web Locks, live YouTube playback/recovery, and desktop interaction remain
unverified; automated tests use a shared lock queue and a mocked player.

Suggested commit message: `fix: preserve cross-tab progression and retry failed video loading`
