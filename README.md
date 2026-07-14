# Study w/ Soobin 🐰

A LifeAt-style Pomodoro study app. Instead of generic cafe/nature scenery, the
background is TXT Soobin's vlogs and VLIVEs — company for a study session, the
same way the [original "Study w/ Soobin" playlist](https://www.youtube.com/playlist?list=PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt)
gets used.

## ⚡ Just want the app?

Download **[`StudyWithSoobin.exe`](StudyWithSoobin.exe)** from the repo root
and double-click it — no install, no setup. It opens in its own window; your
favorites and theme are remembered between launches. (Windows only; it needs
an internet connection since the videos stream from YouTube.)

## Features

- Start screen to pick your study-companion video (or hit 🎲 Surprise me)
- Looping YouTube video that always stays fully in frame — it resizes to fit
  beside the sidebar, and expands when you collapse it (autoplay, muted until
  you turn up the volume slider)
- Pomodoro timer with Pomodoro / Short Break / Long Break modes
- Paged thumbnail grid to switch videos mid-session
- Favorites (❤) and a light/dark theme, both remembered between visits
- Auto-advances to a random video when the current one ends
- No backend, no API key, no login — everything runs client-side

## Getting started

Requires [Node.js](https://nodejs.org/) 20+.

```
npm install
npm run dev
```

Open the printed local URL (defaults to http://localhost:5173).

Other commands:

```
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run lint       # eslint
```

## Refreshing the playlist

The video list lives in `src/data/playlist.json`, a static snapshot (id,
title, duration, thumbnail) of the YouTube playlist. It's not fetched live —
this keeps the app free of API keys and rate limits. When new videos are
added to the source playlist, regenerate it with:

```
npm run fetch-playlist
```

This uses [`youtubei.js`](https://github.com/LuanRT/YouTube.js) to read the
playlist server-side (Node-only), so no Google API credentials are needed. To
point it at a different playlist, edit `PLAYLIST_ID` in
`scripts/fetch-playlist.mjs`.

## Desktop app

Study w/ Soobin can also run as a **native desktop application** — its own
window, no browser tab. `desktop.py` serves the built app on a local port and
opens it in an OS window via [pywebview](https://pywebview.flowrl.com/)
(WebView2 on Windows, WebKit on macOS).

```bash
# one-time setup (requires Python 3.10+)
npm install && npm run build
pip install -r requirements-desktop.txt

# launch the native window
python desktop.py
```

**To rebuild `StudyWithSoobin.exe` (Windows):** run `build-exe.bat` from the
repo root. It builds the frontend, installs the desktop deps + PyInstaller,
and packages everything into **`StudyWithSoobin.exe`** at the repo root — one
double-clickable file, no console window, nothing else to install. Your
favorites/theme persist in `%LOCALAPPDATA%\StudyWithSoobin\`.

> Note: the exe still needs an internet connection — the videos stream from
> YouTube; only the app shell is bundled.

## Project structure

```
studywithsoobin/
├── StudyWithSoobin.exe       # ⭐ ready-to-run Windows app (rebuild: build-exe.bat)
├── desktop.py                # native-window launcher (pywebview + local server)
├── build-exe.bat             # one-command exe rebuild (PyInstaller)
├── requirements-desktop.txt  # Python deps for desktop.py (pip)
├── requirements.txt          # product requirements spec (plain language)
├── scripts/
│   └── fetch-playlist.mjs    # refresh src/data/playlist.json from YouTube
├── src/
│   ├── App.tsx               # top-level state: current video, volume, favorites
│   ├── components/
│   │   ├── WelcomeScreen.tsx     # start screen: pick a video (or 🎲 random)
│   │   ├── VideoBackground.tsx   # letterboxed YouTube IFrame player
│   │   ├── Sidebar.tsx           # LifeAt-style control panel + dark mode
│   │   ├── TimerPanel.tsx        # Pomodoro / Short Break / Long Break
│   │   ├── VideoPicker.tsx       # paged 4x2 thumbnail grid
│   │   └── VolumeControl.tsx     # ambience slider
│   ├── hooks/
│   │   ├── usePomodoro.ts        # countdown state machine
│   │   └── useYouTubeIframeApi.ts # one-time YT API script loader
│   ├── data/playlist.json    # checked-in snapshot of the playlist
│   └── types/                # playlist types + minimal YT ambient types
├── index.html                # Vite entry point
└── *.config.js / tsconfig.json  # Vite / Tailwind / ESLint / TypeScript config
```

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS
- YouTube IFrame Player API (background playback)
- `youtubei.js` (dev-only, for the playlist-refresh script)

## Notes

- Video/channel branding (thumbnails, titles, watermarks) belongs to the
  original creators; this project only embeds and links to their public
  YouTube content.
- The bundled `src/data/playlist.json` was last refreshed 2026-07-12.
