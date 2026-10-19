# Verification recipes

Commands run at the repository root. Re-check package scripts, component labels
and desktop launch behavior if the product has changed.

## Build and logic checks

- `npm.cmd run build`: TypeScript checking and a production build.
- `npm.cmd test`: existing Vitest logic suites.
- `npm.cmd test -- src/lib/catalog.test.ts src/hooks/useTimer.test.ts`:
  focused catalog and timer parse/format checks. The timer tests do not mount
  the hook, so a ticking/lifecycle change also needs the browser recipe below.
- `npm.cmd run lint`: the project's ESLint check.

## Browser launch and doctor

After building, launch `npm.cmd run preview -- --host 127.0.0.1 --port 4196
--strictPort`. Keep that command on one line. If the port is already occupied,
select another unused port; do not reuse or stop an unknown server. Record the
process/session handle and URL. Open that origin in an isolated browser context
or a new task-owned origin with the available browser tool. Confirm the welcome
heading and Search videos field before driving it.

## Feature map

| Feature | User path | Observable proof | Relevant source/tests |
| --- | --- | --- | --- |
| Catalog discovery | Welcome screen, Search videos, member/type chips, Filters | Result count changes, empty state appears for a non-match, Clear filters restores the full count | `src/components/CatalogFilters.tsx`, `src/lib/catalog.test.ts` |
| Timer lifecycle | Pick a video, Timer tab, Start, another tab, Open timer, Pause | Countdown continues while its panel is hidden and stops when paused | `src/components/TimerPanel.tsx`, `src/hooks/useTimer.ts` |
| Study plan | Pick a video, Study plan tab, task input, task estimate | Task remains across tab switches; choosing its duration updates the timer | `src/components/TasksCard.tsx`, `src/lib/taskPlanning.test.ts` |
| Media/captions | Pick a playable video, playback controls, CC | Real player begins playing; selected subtitles are visible in a screenshot | `src/components/VideoBackground.tsx`, `src/lib/videoPlayback.test.ts` |

For a deterministic catalog smoke check, record the initial `N of N videos`
count. Enter `skill-verification-no-match-93817` in Search videos. Confirm
`0 of N videos`, the no-match message and disabled Surprise me. Use Clear filters
and confirm the original count and an enabled Surprise me return. Capture the
empty state and restored state. This exercises actual controls without depending
on network playback or modifying the catalog.

For timer lifecycle, choose a video, use the Timer tab's Start button, and
record its displayed time. Switch to Study plan, observe the running timer
footer decrease, use Open timer and Pause, then confirm it stops decreasing.
Do not wait for a full focus block or credit fake study minutes. If YouTube
cannot play, report that separately; do not count a player error as a timer
failure or a successful media check.

Subtitles need real playback and screenshots; inspecting cross-origin iframe
DOM or trusting the caption option read-back is not sufficient. Metadata
availability alone does not prove embeddability. Do not refresh the generated
catalog as a side effect of verification.

## Desktop startup

For an existing executable, run it with `SWS_SELFTEST=1`, an unused `PORT`, and
`LOCALAPPDATA` pointing at a newly created disposable directory under
`build/skill-verification/`. Save and restore those process environment values
around the invocation. Use `Start-Process -PassThru -WindowStyle Hidden`, a
bounded wait and the exit code; stop only that process on timeout.

Require the startup diagnostic and exit 0. The current source diagnostic can
report that webview is unavailable while still returning 0, so inspect its
message as well as the exit status. This check establishes static server startup;
it does not prove native window persistence, captions or stream playback.

Close the verification browser tab before stopping its preview session. Leave
the evidence directory intact. Never close a user's tab or remove their normal
StudyWithSoobin data directory.
