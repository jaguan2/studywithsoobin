# Findings — code review & feature opportunities

*Reviewed 2026-08-08. Covers every file in `src/`, plus `scripts/fetch-playlist.mjs`,
`desktop.py`, and the build config. TaskNook (`../TaskNook`) was surveyed alongside as
the reference sibling — several of its libs are the proven, battle-tested versions of
things this app ports or lacks.*

> **Status (2026-08-08, third pass): nearly everything here is built** and struck
> through — all of sections 1–3, all of section 6 except the manual exe check
> (6.5), all of section 7 except touch targets (7.6 → folded into S), and all of
> section 4 except **H** (presets), **I** (weather), **S** (mobile), plus the
> stopwatch/long-break corners of **F**. Verified by `npm test` (58 passing),
> `npm run build`, and `npm run lint`. Section 5 lists what's left.

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
| ~~**C**~~ | ~~**Tasks panel**~~ ✅ done (simplified) | `TaskPanel.jsx` | M | `TasksCard.tsx`: a draggable/resizable checklist (add, check, delete, clear done), persisted. Deliberately no priorities/groups/routines — a study session wants a short list, not a planner. |
| ~~**D**~~ | ~~**Focus stats** — log completed focus sessions, 🔥 streak~~ ✅ done | `lib/stats.js` (local-day math, tested) | M | `lib/stats.ts` logs every completed focus block; the timer card shows "today 1h 25m · 🔥 3 day streak". Local-day keys (never `toISOString`), tested. No goal ring (yet). |
| ~~**E**~~ | ~~**Break nudge** — presence-based "you've been at it 2 hours" toast~~ ✅ done | `lib/breaks.js` | S | `useBreakNudge`: 2 h of visible presence → toast; 5 continuous minutes away counts as the break. Simplified from TaskNook (no timer-running presence signal, no toggle). |
| **F** | **Timer QoL** — ~~±1:00 mid-session nudges, skip-break~~ ✅ + stopwatch mode and long-break every N rounds still open | `timer.jsx`, `HudFocusCard.jsx` | S–M | Nudges adjust the deadline directly (over-subtracting completes the block); "skip break →" jumps to the next focus round. |
| ~~**G**~~ | ~~**Music player robustness** — bounded auto-skip past broken playlist tracks~~ ✅ done | `MusicDock.jsx` | S | Up to 5 consecutive dead tracks are skipped; the budget resets whenever something plays. |
| **H** | **Named presets** — snapshot video + ambience mix + timer config as one-click "study scenes" | `store.jsx` weather presets | M | Maps TaskNook's "weather preset" idea onto this app's trio. |
| **I** | Real-weather auto-match (keyless Open-Meteo) to drive ambience | `lib/weather.js` | M | Optional flavor; the geolocation-deadline workaround is already written. |

### New ideas (not in either app)

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| ~~**J**~~ | ~~**Persist what's currently forgotten**: video volume, ambience mode+volume, pomodoro config, panel drag positions/sizes, last video~~ ✅ done | S each | All persist now: `sws.volume`, ambience mode+volume, pomodoro config, panel positions (`usePanelPosition`, clamped) + sizes, last video (welcome-screen "continue" button). The control pill's position stays transient by design. |
| ~~**K**~~ | ~~**"Continue watching"** — store playback position per video every ~10 s~~ ✅ done | S–M | `lib/positions.ts` + `VideoBackground`: position saved every 10 s, resumed (minus 5 s) on a video's first PLAYING; cleared near the start/end or on watching to the end. |
| ~~**L**~~ | ~~**Keyboard shortcuts** — space play/pause, ←/→ ±10 s, `F` fullscreen, `M` mute, `T` start/pause timer~~ ✅ done | S | Plus `Z` for zen and `Esc` to leave it. Skipped while typing or when a control has focus. |
| ~~**M**~~ | ~~**Countdown in `document.title`** while the timer runs~~ ✅ done | S | `⏱ 24:59 · study with soobin` while running. |
| ~~**N**~~ | ~~**Zen mode** — one key/button hides every panel and pill~~ ✅ done | S | `Z` key or the 👁 button top-right; `Z`/`Esc` restores. Panel collapse states are untouched underneath. |
| ~~**O**~~ | ~~**Deep links** — read `?v=<id>` on load, write it on video change~~ ✅ done | S | Invalid/unknown ids fall back to the welcome screen; the param clears when returning to it. |
| ~~**P**~~ | ~~**Length-aware picking** — sort the grid by length~~ ✅ done | S–M | Welcome-screen sort chips: playlist order / longest / shortest. Falls back to parsing the display duration when a snapshot predates `durationSeconds`. |
| ~~**Q**~~ | ~~Theme picker on the welcome screen~~ ✅ done | S | `ThemeSwitcher` extracted; now in both the sidebar footer and the welcome screen's top-right. |
| ~~**R**~~ | ~~PWA manifest + icon — installable from the browser~~ ✅ done | S | `public/manifest.webmanifest` (SVG icon, standalone display) + theme-color meta. No service worker — the app needs YouTube anyway. |
| **S** | Mobile layout pass — panels spawn at fixed `left/top`, sidebar min-width 340 px overflows phones | M | Depends on whether mobile is a target at all. Fold 7.6 (touch targets) in here. |
| ~~**T**~~ | ~~Auto-pause/resume video with pomodoro phases~~ ✅ done | S | "pause the video during breaks" checkbox in the pomodoro form, persisted. |

---

## 5. What's still open

- **H** named presets ("study scenes": video + ambience mix + timer config in one click)
- **I** real-weather auto-match (Open-Meteo)
- **S** mobile layout pass (+ 7.6 touch targets)
- **F leftovers**: stopwatch mode, long-break every N rounds
- **D leftover**: a daily goal ring, if the stats line ever wants a target
- **6.5**: manually confirm notifications fire in the packaged exe

Everything else in this file is done and struck through.

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
- ~~**6.6 `durationSeconds` isn't in the shipped snapshot yet.**~~ ✅ done — the
  snapshot was refreshed (needed a `youtubei.js` 13 → 17 bump; the old parser no
  longer matched YouTube's page schema, exactly as CLAUDE.md warns). Note: the
  refresh is 21 videos, down one — the ZB1 Hanbin vlog (`U8XxnODShmE`) is no
  longer in the live playlist upstream.
- ~~**6.7 The timer is invisible from the welcome screen.**~~ ✅ fixed — a running
  timer now shows a bottom-center pill on the welcome screen (with the pomodoro
  phase when applicable), so its chime never comes out of nowhere.

---

## 7. UI/UX suggestions (from an alignment/design pass)

Ordered roughly by value; none are bugs.

1. ~~**Opening the pomodoro form makes the timer card overlap the sidebar.**~~ ✅
   done — the sidebar now spawns at `top: 300`, clear of the expanded card.
2. ~~**Pomodoro phases look identical at a glance.**~~ ✅ done — the timer card
   wears a clay ring while focusing and a quiet one on break.
3. ~~**Keyboard/focus affordances.**~~ ✅ done — global `:focus-visible` clay
   outline, Escape closes the CC menu, and the app is keyboard-driven via L.
4. ~~**Slider inconsistency.**~~ ✅ done — `src/components/Slider.tsx` is now the one
   style for the three plain sliders (video volume, music volume, ambience); the
   seek bars stay on `Scrubber`, which needs its gradient fill.
5. ~~**The top-right cluster never fades.**~~ ✅ done — the cluster rides the
   control pill's idle fade (`onVisibleChange`), and zen mode hides it outright.
6. **Touch targets run small.** Several controls are 24–28 px (minimize buttons,
   pager chevrons, CC menu items) against the ~44 px touch guideline. Fine for
   mouse-first today, but worth padding via larger hit areas (not larger icons) if
   mobile/touch matters — see feature S.
7. ~~**Respect `prefers-reduced-motion`.**~~ ✅ done — a global reduced-motion rule
   flattens transitions/animations; drag remains user-driven.
8. ~~**Welcome screen is a dead end for settings.**~~ ✅ done — theme switcher,
   length sorting, continue button, and the running-timer pill all live there now.

---

## 8. Stability patch (post-build hardening pass)

A code re-review plus a headless-browser smoke test (welcome → main UI → timer
→ zen → deep link → tasks, screenshots inspected) over the three feature
batches. All fixed:

- ~~**8.1 Nudge over-subtract cascaded pomodoro phases.**~~ ✅ −1:00 past zero
  wrote `secondsLeft = 0` without re-arming the deadline; the advance effect
  then skipped phases against the stale deadline with doubled chimes. Nudges
  now clamp to 1 s and let the tick complete the block.
- ~~**8.2 Restored ambience was silent on deep-linked loads.**~~ ✅ `?v=` skips
  the welcome click, so the AudioContext started suspended and retunes never
  resumed it. The first real gesture now resumes it.
- ~~**8.3 A render crash showed a blank window.**~~ ✅ `ErrorBoundary` around the
  app (friendly reload screen) — the worst case in the exe was a white void.
- ~~**8.4 Shortcuts died after clicking any button.**~~ ✅ Focus lingers on a
  clicked button and the guard swallowed every key; buttons now keep only
  their activation keys (Space/Enter). Found by the smoke test: Z right after
  clicking Start didn't enter zen.
- ~~**8.5 Fresh users got volume 0, not 40.**~~ ✅ `Number(storageGet(...))`
  coerces `null` to `0`, which passed validation — the video and music volume
  defaults never applied. Found by screenshot: muted icon + slider at zero +
  no unmute chip on a clean profile.
- ~~**8.6 Playlist refresh lost every title.**~~ ✅ youtubei.js 17 moved titles
  to `metadata.title`; all 21 read "Untitled" (screenshot catch). Fixed the
  extractor and added an all-Untitled guard beside the zero-videos one.
- ~~**8.7 Smaller hardening.**~~ ✅ `TasksCard` memoized (was re-rendering every
  timer tick), `crypto.randomUUID` fallback for non-secure contexts, sidebar
  default height accounts for its new spawn point.
