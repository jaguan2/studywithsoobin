# Findings — code review & feature opportunities

*Reviewed 2026-08-08. Covers every file in `src/`, plus `scripts/fetch-playlist.mjs`,
`desktop.py`, and the build config. TaskNook (`../TaskNook`) was surveyed alongside as
the reference sibling — several of its libs are the proven, battle-tested versions of
things this app ports or lacks.*

> **Status (2026-08-08): sections 1–3 are fixed.** All bugs (1.1–1.9), both
> actionable perf items (2.1 via memo + stable callbacks, 2.2), and all code-health
> items (3.1–3.7) were applied — including the timer chime/notification (1.2 ≈
> feature A) and a Vitest suite (48 tests) covering the music-link parser, timer
> parsing/formatting, and the theme luminance solver. 2.3 (dropping framer-motion)
> was deliberately skipped as documented. Section 4's features (B–T, minus A) remain
> open. `StudyWithSoobin.exe` has not been rebuilt — run `build-exe.bat` and
> re-commit it when ready to ship.

Overall: the codebase is small, tidy, and well-commented, and the hard-won YouTube
IFrame knowledge in CLAUDE.md is respected everywhere. The issues below are mostly
edge-case correctness, a few real audio bugs, one systemic performance nit, and a lot
of headroom for features.

---

## 1. Bugs & correctness (prioritized)

### 1.1 The timer drifts when the tab is backgrounded — the core feature fails its main use case
`useTimer.ts:64-76` counts down by decrementing state in a 1-second `setInterval`.
Browsers throttle background-tab timers (Chrome's intensive throttling groups them to
**once per minute** after ~5 minutes when the tab is silent; WebView2 does the same
when the desktop window is minimized). A muted video doesn't exempt the tab. So the
person who starts a 25-minute focus block and switches to their work — i.e., the
target user — comes back to a timer that has counted far less than 25 minutes.

**Fix:** store an absolute deadline (`endsAt = Date.now() + secondsLeft * 1000`) when
the timer starts, compute `secondsLeft` from the clock on every tick, and re-sync on
`visibilitychange`. The interval then only affects display refresh, not accuracy.

### 1.2 Nothing happens when the timer finishes
When a plain (non-pomodoro) timer hits 0:00 it just stops, silently. No chime, no
notification, no title change. Combined with 1.1, a user in another window gets no
signal at all. TaskNook already solved this — `frontend/src/timer.jsx:146-233` has the
full pattern: a procedural two-note `playChime()` (no audio files, matching the
ambience philosophy) for whoever is at the screen, plus a Web Notification (permission
requested on first timer start) for whoever stepped away. Port it.

### 1.3 Ambience volume bugs (`src/lib/ambience.ts`)
Three related, all real:

- **Thunder ignores the volume slider.** `playThunder` connects straight to
  `ctx.destination`, bypassing `masterGain` (`ambience.ts:73`), and
  `scheduleThunder(volume)` captures the volume *at start time*
  (`ambience.ts:128`). Start a storm at 0.5, slide down to 0.05 — thunder keeps
  booming at the original level.
- **LFO depth isn't rescaled on volume change.** `setAmbienceVolume` retunes
  `masterGain` only (`ambience.ts:149-154`); `lfoGain` keeps the depth computed from
  the starting volume (`ambience.ts:120`). Lower the volume and the modulation swings
  the gain negative (phase-inverts the noise) — the "breathing" sounds wrong at low
  volumes. The snow preset (`gain: 0.13`, `lfoDepth: 0.16`) dips negative even at
  default settings.
- **`stopAmbience` doesn't silence an in-flight thunder burst** (up to ~5 s of tail
  after switching off), and the `AudioContext` is never suspended when idle, which
  keeps the audio hardware awake producing silence.

**Fix path:** rather than patching these individually, see feature B below — TaskNook's
`frontend/src/lib/audio.js` is a strict superset that already routes one-shots through
the master gain, fades out with `setTargetAtTime(0)`, and calls `ctx.suspend()` when
every channel is silent. Per the CLAUDE.md mirror rule, whatever is patched here
should be reconciled with TaskNook either way.

### 1.4 The sidebar and timer card can be dragged off-screen, unrecoverably
`VideoControls` gets `dragConstraints={bounds}` precisely because "a pill dragged
under a panel could never be grabbed back" — but the two big panels get no constraints
at all (`Sidebar.tsx:73-79`, `TimerCard.tsx:24-30`). A panel flung past the viewport
edge is gone: the restore pill only flips `visibility`, not position, so minimizing
and restoring doesn't bring it back. Only a reload does.

**Fix:** thread the same overlay ref down as `dragConstraints` for both panels (or
clamp position in `onDragEnd`).

### 1.5 `loadYouTubeIframeApi` can never fail — so failure looks like a permanent black screen
`useYouTubeIframeApi.ts` has no `onerror` on the script tag and no timeout, and the
promise is cached forever — including a pending one that will never settle. Offline
start, a captive portal (which returns 200 and then `onYouTubeIframeAPIReady` never
fires), or a flaky first load ⇒ every player in the app silently never initializes,
*and stays that way after the network returns* because the dead promise is cached.
This matters double for the shipped `.exe`. TaskNook's `MusicDock.jsx` has the fix
pattern: a 12 s timeout, clearing the cached promise on failure so a retry can work,
and a distinct "needs internet" error state in the UI.

### 1.6 Player-creation race in `VideoBackground`
The player is created once with the `videoId` captured at mount
(`VideoBackground.tsx:131-182`); swaps go through the `loadVideoById` effect
(`:189-191`). If `videoId` changes in the window between mount and the IFrame API
promise resolving, the swap effect no-ops (`playerRef.current` still null) and the
player is then created with the stale id — wrong video plays. Unlikely in practice
(swaps come from the sidebar, well after mount) but the fix is one line: read the
current id from a ref inside the `.then`, or call `loadVideoById` after creation when
it differs.

### 1.7 Small pointer-handling gaps in `usePanelSize`
`usePanelSize.ts:39-41`: only `pointerup` detaches the `pointermove` listener; a
`pointercancel` (common on touch) leaks the move listener until the next pointer-up
anywhere. No `setPointerCapture` either, so a fast drag can drop the grip. Low
stakes, small fix.

### 1.8 Unguarded `localStorage` writes, some inside setState updaters
`toggleFavorite` writes to `localStorage` inside the state updater
(`App.tsx:116-122`) — updaters run twice under StrictMode (harmless here, but an
anti-pattern), and more importantly `setItem` can throw (quota, security settings).
The read helpers are wrapped in try/catch; the writes are not — anywhere
(`App.tsx:93,97,112`, `MusicPanel.tsx:74,87,98`). TaskNook wraps every access in
`frontend/src/lib/storage.js` for exactly one reason worth respecting: an unguarded
throw inside a React effect renders as a **blank window in the packaged exe**. Worth
adopting wholesale (see 3.2).

### 1.9 `fetch-playlist.mjs` will happily write an empty playlist
The script's extraction paths are documented as brittle, but there's no guard: if
YouTube's schema shifts and every item fails `filter((item) => item.content_id)`, the
script overwrites `playlist.json` with `videos: []` and exits 0. Add
`if (videos.length === 0) throw new Error(...)` (and arguably "fewer than last time by
>50%" as a warning). While in there: store a numeric `durationSeconds` alongside the
display string — it unlocks sorting/filtering features (see N).

---

## 2. Performance / efficiency

### 2.1 The whole app re-renders every second while the timer runs
`useTimer` lives in `App` (`App.tsx:84`), so each tick re-renders `App` and its entire
children tree — `Sidebar` (thumbnail grid, music panel, ambience panel), `TimerCard`,
`VideoBackground`, `VideoControls` — once per second for the length of every study
session. The pill/progress polling was deliberately isolated into `VideoControls` to
avoid exactly this ("it's a separate component precisely so that poll re-renders the
pill rather than App"), but the timer undoes it.

**Fix (cleanest):** move `useTimer` into a small component that renders both
`TimerCard` and the timer restore pill — those are the only two consumers of
`timer.label`. Then a tick re-renders just that subtree.
**Fix (alternative):** keep it in `App`, wrap `Sidebar`/`VideoBackground` in
`React.memo`, and stabilize their callback props with `useCallback`. More churn for
the same result.

### 2.2 `VideoControls` polls while hidden
The 500 ms poll (`VideoControls.tsx:48-63`) keeps calling `getProgress()` and
`getCaptionTracks()` when the pill is faded out and when the tab is hidden. Cheap
calls, but free to skip: bail when `document.hidden`, and consider polling caption
tracks at a slower cadence once a non-empty list has been seen (it only changes on
video swap, which is observable).

### 2.3 framer-motion is a ~35 kB (gz) dependency used only for drag
No layout animations, no springs — just `drag` + `dragControls` on three elements,
while resizing is already hand-rolled pointer events. A shared ~60-line `useDrag`
hook would drop the dependency entirely. **Only worth it if bundle size starts to
matter** (the app is otherwise tiny); framer-motion works and the CLAUDE.md-documented
transform-ownership rules are already encoded around it.

---

## 3. Better implementation / code health

- **3.1 Duplicated SVG icon components.** `PlayIcon`/`PauseIcon`/`SeekIcon` exist in
  both `VideoControls.tsx` and `YouTubeMusicPlayer.tsx`; the heart icon is pasted in
  `Sidebar.tsx`, `WelcomeScreen.tsx`, and `VideoPicker.tsx`; chevrons appear in three
  places. One `components/icons.tsx` would collapse ~150 lines.
- **3.2 One storage utility instead of five ad-hoc helpers.** `loadFavorites` /
  `loadTheme` / `loadCustomColor` / `loadCaptionLang` (`App.tsx:24-47`) and
  `loadCustomStations` (`MusicPanel.tsx:38-45`) are the same shape. Port TaskNook's
  `lib/storage.js` (guarded get/set) and keep the `sws.*` keys in one typed module.
  Fixes 1.8 as a side effect.
- **3.3 `loadCustomStations` trusts stored JSON.** It casts `Array.isArray(raw) ? raw
  : []` straight to `Station[]` — a corrupt/hand-edited entry with no `label` or `id`
  renders as a broken chip. Validate `provider`/`id`/`label` per entry.
- **3.4 The Inter font is declared but never loaded.** `index.css:45` and
  `tailwind.config.js:28` name `'Inter'`, but nothing loads it — no `@font-face`, no
  link in `index.html`. Everyone silently gets system-ui unless they happen to have
  Inter installed. Either self-host the woff2 (keeps the exe self-contained) or
  delete it from the stack so the declared design matches the real one.
- **3.5 `musicLink.ts` has quietly diverged from TaskNook's parser.** TaskNook's
  `lib/youtube.js` accepts a **bare pasted playlist id** (`PL…`/`UU…` etc.) and has a
  `searchParams` fallback for `list=`; this port requires the string to contain
  `youtube.com|youtu.be` first (`musicLink.ts:44`), so a bare playlist id falls
  through to "couldn't find a video". Conversely this port rejects `WL`/`LL` where
  TaskNook accepts a bare `LL…`. CLAUDE.md's mirror rule says these should be
  reconciled deliberately — and TaskNook has regression tests
  (`frontend/src/lib/youtube.test.js`) worth porting with it.
- **3.6 No tests at all.** `tsc --noEmit` is the only gate. The purest, highest-value
  targets are already isolated: `parseTimeInput`, the pomodoro phase machine in
  `useTimer`, `resolveMusicLink`, and the luminance solver in `lib/theme.ts` (assert
  contrast ratios per hue — the exact regression the CLAUDE.md warning describes).
  Vitest drops into Vite with near-zero config; TaskNook's test files are templates.
- **3.7 In `YouTubeMusicPlayer`, `onReady` hardcodes `setVolume(60)`** while the
  slider state also inits to 60 (`YouTubeMusicPlayer.tsx:21,54`) — one constant,
  used twice, and the right place to plug in a persisted music volume (see J).

---

## 4. Feature opportunities

### Ports from TaskNook (proven code, known effort)

| # | Feature | Source | Effort | Notes |
|---|---------|--------|--------|-------|
| **A** | **Timer chime + Web Notification at phase edges** | `timer.jsx:146-233` | S | Fixes 1.2. The single highest-value change in this list. |
| **B** | **Ambient mixer upgrade** — 7 layerable channels (rain, storm, snow, wind, fireplace, café, page-turns) with per-channel volume, rain droplet plinks with stereo pan, noise-buffer cache, fade-out + `ctx.suspend()` | `lib/audio.js` (368 lines, UI-free) | M | Strict superset of `ambience.ts`; replacing rather than patching also fixes all of 1.3. Keep this app's softer rain/snow tuning per CLAUDE.md. |
| **C** | **Tasks panel** — to-dos with duration/priority/groups, drag-reorder, daily routines | `TaskPanel.jsx` + `lib/algorithms.js` | M | localStorage-only version is fine here (no backend by design). Pairs naturally with the timer: "what am I focusing on". |
| **D** | **Focus stats** — log completed focus sessions, daily goal ring, 🔥 streak | `lib/stats.js` (local-day math, tested) | M | The app currently remembers nothing about effort spent. Streaks are the retention feature for a study app. |
| **E** | **Break nudge** — presence-based "you've been at it 2 hours" toast | `lib/breaks.js` (pure, tested) | S | Works even when no timer is running. |
| **F** | **Timer QoL** — stopwatch mode, ±1:00 mid-session nudges (with clamped accounting), skip-break, long-break every N rounds | `timer.jsx`, `HudFocusCard.jsx` | S–M | Also: TaskNook guards against resetting phase/round mid-run; `useTimer` here has no such guard. |
| **G** | **Music player robustness** — 12 s IFrame-API timeout + retry (fixes 1.5), bounded auto-skip past broken playlist tracks, "needs internet" vs "won't play" error split | `MusicDock.jsx` | S | The auto-skip matters for the built-in playlist station. |
| **H** | **Named presets** — snapshot video + ambience mix + timer config as one-click "study scenes" | `store.jsx` weather presets | M | Maps TaskNook's "weather preset" idea onto this app's trio. |
| **I** | Real-weather auto-match (keyless Open-Meteo) to drive ambience | `lib/weather.js` | M | Optional flavor; the geolocation-deadline workaround is already written. |

### New ideas (not in either app)

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| **J** | **Persist what's currently forgotten**: video volume, ambience mode+volume, music volume, pomodoro config, panel drag positions/sizes (`onDragEnd` → localStorage), last video | S each | Cheap wins; the desktop app went to real lengths (stable port, storage_path) to make localStorage survive — but most state never reaches it. |
| **K** | **"Continue watching"** — store playback position per video every ~10 s; welcome screen gets a resume tile | S–M | These are 1–2 hour vlogs; losing your place is a real cost. |
| **L** | **Keyboard shortcuts** — space play/pause, ←/→ ±10 s, `F` fullscreen, `M` mute, `T` start/pause timer | S | `disablekb: 1` + `pointer-events: none` mean the app owns every key already; nothing is listening. |
| **M** | **Countdown in `document.title`** while the timer runs | S | Visible from any other tab — pairs with fix 1.1. |
| **N** | **Zen mode** — one key/button hides every panel and pill | S | The panels already support `visibility: hidden`; this is a single boolean. |
| **O** | **Deep links** — read `?v=<id>` on load (skip the welcome screen), write it on video change | S | Makes sessions shareable/bookmarkable; MOA will send each other links. |
| **P** | **Length-aware picking** — with numeric durations (1.9), sort/filter the grid by length, or suggest a video at least as long as the focus block | S–M | Cute tie-in between the two halves of the app. |
| **Q** | Theme picker on the welcome screen (currently buried in the sidebar footer, unreachable before picking a video) | S | |
| **R** | PWA manifest + icon — installable from the browser on any OS, complementing the Windows-only exe | S | |
| **S** | Mobile layout pass — panels spawn at fixed `left/top`, sidebar min-width 340 px overflows phones | M | Depends on whether mobile is a target at all. |

---

## 5. Suggested order

1. **Timer correctness bundle** — 1.1 (deadline-based timer) + A (chime/notification) + M (title countdown). This is the app's core loop; everything else is decoration around it.
2. **1.4** drag constraints (small, prevents a genuinely lost-panel state).
3. **J** persistence quick wins (volume, ambience, pomodoro config, panel positions).
4. **B** ambience port — one change fixes three bugs (1.3) and adds the fireplace/café/layering feature set.
5. **2.1** timer re-render isolation + **G/1.5** IFrame-API failure handling.
6. **L + N + O** keyboard shortcuts, zen mode, deep links — small, all pure UX surplus.
7. **D (stats) then C (tasks)** if the app should grow toward TaskNook's "study home" scope rather than staying a focused video-Pomodoro tool.
8. **3.5 + 3.6** parser reconciliation with tests riding along — first tests in the repo.
