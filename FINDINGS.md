# Findings — code review & feature opportunities

*Reviewed 2026-08-08. Covers every file in `src/`, plus `scripts/fetch-playlist.mjs`,
`desktop.py`, and the build config. TaskNook (`../TaskNook`) was surveyed alongside as
the reference sibling — several of its libs are the proven, battle-tested versions of
things this app ports or lacks.*

> **Status (2026-08-08): sections 1–3 are all fixed** (struck through below), verified
> by `npm test` (48 passing), `npm run build`, and `npm run lint`. A second review
> pass added section 6 (now fully fixed except 6.5/6.6, which need a manual exe
> check and a playlist re-fetch respectively) and section 7 (UI/UX suggestions —
> 7.4 done). From section 4, **A** (timer cues), **J** (persistence: volume,
> ambience, pomodoro config, panel positions/sizes, last video + unmute chip +
> welcome-screen timer pill), and **B** (the 7-channel ambience mixer port) are
> done; the rest remain open.

---

## 1. Bugs & correctness (prioritized)

### ~~1.1 The timer drifts when the tab is backgrounded~~ ✅ fixed
`useTimer` now counts against an absolute deadline (`endAtRef`) instead of
decrementing on an interval, and re-syncs on `visibilitychange` — browser timer
throttling now only delays the *display*, never the accuracy. Starting a finished
timer restarts it from its duration.

### ~~1.2 Nothing happens when the timer finishes~~ ✅ fixed
`src/lib/cues.ts` (pattern from TaskNook's timer provider): a procedural two-note
chime plus a Web Notification at every phase edge — time's up, focus→break,
break→focus, all rounds done. Permission is requested when a timer starts, not on
page load.

### ~~1.3 Ambience volume bugs~~ ✅ fixed
All three: thunder reads the slider volume at strike time and routes through a bus
that fades out on stop; `setAmbienceVolume` rescales the LFO depth (capped below the
base gain, so snow can't dip negative); the `AudioContext` suspends when idle.

### ~~1.4 The sidebar and timer card can be dragged off-screen, unrecoverably~~ ✅ fixed
Both panels now get `dragConstraints` bound to the viewport root, same as the
control pill. (Residual edge: window *resize* can still strand a panel — see 6.3.)

### ~~1.5 `loadYouTubeIframeApi` can never fail~~ ✅ fixed
12 s timeout + script `onerror`, and the cached promise clears on failure so a retry
works. The video background surfaces a "couldn't reach YouTube" toast;
`YouTubeMusicPlayer` distinguishes "needs internet" from "this station won't embed."

### ~~1.6 Player-creation race in `VideoBackground`~~ ✅ fixed
The player is created from `videoIdRef.current` at promise-resolution time, not the
mount-time closure value.

### ~~1.7 Small pointer-handling gaps in `usePanelSize`~~ ✅ fixed
`pointercancel` now detaches the move listener, and the grip takes pointer capture.

### ~~1.8 Unguarded `localStorage` writes, some inside setState updaters~~ ✅ fixed
All storage access goes through guarded `src/lib/storage.ts`; the favorites write
moved out of the setState updater into an effect.

### ~~1.9 `fetch-playlist.mjs` will happily write an empty playlist~~ ✅ fixed
The script throws (without writing) when it parses zero videos, and now emits a
numeric `durationSeconds` per video. Note: the checked-in `playlist.json` won't have
`durationSeconds` until the next `npm run fetch-playlist` (see 6.6).

---

## 2. Performance / efficiency

### ~~2.1 The whole app re-renders every second while the timer runs~~ ✅ fixed
`Sidebar`, `VideoBackground`, `VideoControls`, and `WelcomeScreen` are memoized and
every callback App passes them is `useCallback`-stable, so a timer tick re-renders
only the timer card (which displays it) and App's own now-trivial body.

### ~~2.2 `VideoControls` polls while hidden~~ ✅ fixed
Both 500 ms polls (video controls, music player) skip work while `document.hidden`.

### ~~2.3 framer-motion is a ~35 kB (gz) dependency used only for drag~~ ⏭️ won't do
Deliberately skipped: it works, the transform-ownership rules are documented around
it, and bundle size isn't currently a pain point. Revisit only if it becomes one.

---

## 3. Better implementation / code health

- ~~**3.1 Duplicated SVG icon components.**~~ ✅ Play/Pause/Seek/Skip/Heart now live in
  `src/components/icons.tsx`; single-use icons stayed put.
- ~~**3.2 One storage utility instead of five ad-hoc helpers.**~~ ✅ `src/lib/storage.ts`
  (guarded get/set/JSON helpers), used by App, MusicPanel, and the music player.
- ~~**3.3 `loadCustomStations` trusts stored JSON.**~~ ✅ Each entry is validated
  (provider/id/label) before use.
- ~~**3.4 The Inter font is declared but never loaded.**~~ ✅ Self-hosted via
  `@fontsource/inter` (400–700), imported in `main.tsx`, bundled into `dist/` so the
  offline exe gets it too.
- ~~**3.5 `musicLink.ts` has quietly diverged from TaskNook's parser.**~~ ✅ Reconciled:
  bare playlist ids (`PL`/`OL`/`UU`/`FL`) accepted, `list=`/`v=` searchParams
  fallbacks added — the `v=` fallback now host-checked (a test caught that
  `example.com/watch?v=…` used to parse as YouTube). WL/LL/RD still deliberately
  rejected; the divergence is documented in a comment.
- ~~**3.6 No tests at all.**~~ ✅ Vitest, 48 tests: `musicLink` (URL forms, playlist
  precedence, rejections), `parseTimeInput`/`formatTime`, and the theme luminance
  solver (per-hue luminance preservation + the white-on-clay contrast regression).
- ~~**3.7 `YouTubeMusicPlayer` hardcoded volume.**~~ ✅ One constant, and the music
  volume persists to `sws.music.volume`.

---

## 4. Feature opportunities

### Ports from TaskNook (proven code, known effort)

| # | Feature | Source | Effort | Notes |
|---|---------|--------|--------|-------|
| ~~**A**~~ | ~~**Timer chime + Web Notification at phase edges**~~ ✅ done | `timer.jsx:146-233` | S | Shipped as `src/lib/cues.ts` with fix 1.2. |
| ~~**B**~~ | ~~**Ambient mixer upgrade** — 7 layerable channels (rain, storm, snow, wind, fireplace, café, page-turns) with per-channel volume, rain droplet plinks with stereo pan, noise-buffer cache, fade-out + `ctx.suspend()`~~ ✅ done | `lib/audio.js` (368 lines, UI-free) | M | Ported as the new `lib/ambience.ts` + mixer UI in `AmbiencePanel` (old single-mode storage keys migrate). Snow/storm keep this app's softer tuning; the LFO-depth cap is a divergence worth mirroring back to TaskNook. |
| **C** | **Tasks panel** — to-dos with duration/priority/groups, drag-reorder, daily routines | `TaskPanel.jsx` + `lib/algorithms.js` | M | localStorage-only version is fine here (no backend by design). Pairs naturally with the timer: "what am I focusing on". |
| **D** | **Focus stats** — log completed focus sessions, daily goal ring, 🔥 streak | `lib/stats.js` (local-day math, tested) | M | The app currently remembers nothing about effort spent. Streaks are the retention feature for a study app. |
| **E** | **Break nudge** — presence-based "you've been at it 2 hours" toast | `lib/breaks.js` (pure, tested) | S | Works even when no timer is running. |
| **F** | **Timer QoL** — stopwatch mode, ±1:00 mid-session nudges (with clamped accounting), skip-break, long-break every N rounds | `timer.jsx`, `HudFocusCard.jsx` | S–M | Also: TaskNook guards against resetting phase/round mid-run; `useTimer` here has no such guard. |
| **G** | **Music player robustness** — bounded auto-skip past broken playlist tracks | `MusicDock.jsx` | S | The API-timeout/retry/error-split parts shipped with 1.5; the auto-skip for the built-in playlist station remains. |
| **H** | **Named presets** — snapshot video + ambience mix + timer config as one-click "study scenes" | `store.jsx` weather presets | M | Maps TaskNook's "weather preset" idea onto this app's trio. |
| **I** | Real-weather auto-match (keyless Open-Meteo) to drive ambience | `lib/weather.js` | M | Optional flavor; the geolocation-deadline workaround is already written. |

### New ideas (not in either app)

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| ~~**J**~~ | ~~**Persist what's currently forgotten**: video volume, ambience mode+volume, pomodoro config, panel drag positions/sizes, last video~~ ✅ done | S each | All persist now: `sws.volume`, ambience mode+volume, pomodoro config, panel positions (`usePanelPosition`, clamped) + sizes, last video (welcome-screen "continue" button). The control pill's position stays transient by design. |
| **K** | **"Continue watching"** — store playback position per video every ~10 s; welcome screen gets a resume tile | S–M | These are 1–2 hour vlogs; losing your place is a real cost. |
| **L** | **Keyboard shortcuts** — space play/pause, ←/→ ±10 s, `F` fullscreen, `M` mute, `T` start/pause timer | S | `disablekb: 1` + `pointer-events: none` mean the app owns every key already; nothing is listening. |
| **M** | **Countdown in `document.title`** while the timer runs | S | Visible from any other tab — pairs with fix 1.1. |
| **N** | **Zen mode** — one key/button hides every panel and pill | S | The panels already support `visibility: hidden`; this is a single boolean. |
| **O** | **Deep links** — read `?v=<id>` on load (skip the welcome screen), write it on video change | S | Makes sessions shareable/bookmarkable; MOA will send each other links. |
| **P** | **Length-aware picking** — with numeric durations (1.9 ✅), sort/filter the grid by length, or suggest a video at least as long as the focus block | S–M | Needs one `npm run fetch-playlist` re-run first (6.6). |
| **Q** | Theme picker on the welcome screen (currently buried in the sidebar footer, unreachable before picking a video) | S | |
| **R** | PWA manifest + icon — installable from the browser on any OS, complementing the Windows-only exe | S | |
| **S** | Mobile layout pass — panels spawn at fixed `left/top`, sidebar min-width 340 px overflows phones | M | Depends on whether mobile is a target at all. |
| **T** | Auto-pause/resume video with pomodoro phases (optional toggle: pause video during breaks or play chime only) | S | |

---

## 5. Suggested order (remaining work)

1. ~~**J** persistence quick wins — volume, ambience, pomodoro config, panel positions (also closes 6.3).~~ ✅ done
2. ~~**B** ambience mixer port — the biggest single upgrade left.~~ ✅ done
3. **L + M + N + O** keyboard shortcuts, title countdown, zen mode, deep links — small, all pure UX surplus.
4. **D (stats) then C (tasks)** if the app should grow toward TaskNook's "study home" scope.
5. **G** playlist auto-skip, **K** continue-watching (playback *position* — the video itself now resumes), and the section-7 polish items as they appeal.

*(Done from the original list: the timer correctness bundle, drag constraints, re-render isolation, IFrame-API failure handling, parser reconciliation + first tests, and the J persistence bundle.)*

---

## 6. Second-pass findings (missed in the first sweep)

- ~~**6.1 The unplayable-video toast can hide under a panel.**~~ ✅ fixed — notices
  rendered at `z-10` while the draggable panels are z-30/40, so a sidebar parked
  bottom-center covered the "skipped to another one" message. Now `z-50`.
- ~~**6.2 No empty state when every video is blocked.**~~ ✅ fixed — if all embeds get
  session-blocked, the welcome grid rendered silently empty; it now explains and
  suggests a reload.
- ~~**6.3 Window resize can still strand a dragged panel.**~~ ✅ fixed —
  `usePanelPosition` clamps the stored offset on restore *and* on window `resize`,
  so a panel always keeps a grabbable edge on screen.
- ~~**6.4 The volume slider lies after a remount.**~~ ✅ fixed — App tracks a `muted`
  flag (reset whenever the player is recreated) and shows a "🔇 Tap to unmute"
  chip while sound is off with a non-zero slider; the chip or the slider unmutes.
- **6.5 Notifications in the packaged exe are unverified.** pywebview/WebView2 does
  not surface permission prompts the way a browser does, so `Notification.
  requestPermission()` may silently stay `default` — the chime still works, the
  system notification may not. Worth a manual check of `StudyWithSoobin.exe`
  before relying on it.
- **6.6 `durationSeconds` isn't in the shipped snapshot yet.** The fetch script now
  emits it, but `playlist.json` predates the change. Next `npm run fetch-playlist`
  run picks it up (diff the JSON as usual — the playlist itself may have changed).
- ~~**6.7 The timer is invisible from the welcome screen.**~~ ✅ fixed — a running
  timer now shows a bottom-center pill on the welcome screen (with the pomodoro
  phase when applicable), so its chime never comes out of nowhere.

---

## 7. UI/UX suggestions (from an alignment/design pass)

Ordered roughly by value; none are bugs.

1. **Opening the pomodoro form makes the timer card overlap the sidebar.** The
   sidebar spawns at `top: 232` and the expanded card reaches past it. Cheapest:
   spawn the sidebar a bit lower (~`top: 280`); nicer: measure the card and stack
   dynamically, since both panels are draggable anyway.
2. **Pomodoro phases look identical at a glance.** Focus vs break is one small
   badge; the time itself doesn't change character. A phase-tinted card accent
   (clay for focus, cream/green for break) or a thin progress ring around the time
   would read from across the room — which is how a Pomodoro timer is actually used.
3. **Keyboard/focus affordances.** Most buttons rely on the browser's default
   outline, and several inputs use `focus:outline-none` with only a faint ring; the
   CC menu has no Escape-to-close. Adding consistent `focus-visible` rings (clay,
   2px) and Escape handling would make the app fully keyboard-friendly — and pairs
   with feature L.
4. ~~**Slider inconsistency.**~~ ✅ done — `src/components/Slider.tsx` is now the one
   style for the three plain sliders (video volume, music volume, ambience); the
   seek bars stay on `Scrubber`, which needs its gradient fill.
5. **The top-right cluster never fades.** The control pill auto-hides for immersion
   but "Change video / Join MOA! / fullscreen" stay pinned over the video forever.
   Letting that cluster fade on the same idle timer (any `pointermove` brings it
   back) would complete the theater effect — with zen mode (N) as the always-hidden
   version.
6. **Touch targets run small.** Several controls are 24–28 px (minimize buttons,
   pager chevrons, CC menu items) against the ~44 px touch guideline. Fine for
   mouse-first today, but worth padding via larger hit areas (not larger icons) if
   mobile/touch matters — see feature S.
7. **Respect `prefers-reduced-motion`.** Thumbnail zooms, hover lifts, and the
   pill's fade are all unconditional. Tailwind's `motion-reduce:` variant makes
   this a find-and-annotate pass; TaskNook has an explicit motion mode for the
   same reason.
8. **Welcome screen is a dead end for settings.** Theme (Q) and — once durations
   are in the snapshot — length sorting (P) naturally live there. (The
   running-timer pill and the continue-last-video button landed with 6.7/J.)
