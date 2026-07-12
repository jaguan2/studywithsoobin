# Study w/ Soobin 🐰

A LifeAt-style Pomodoro study app. Instead of generic cafe/nature scenery, the
background is TXT Soobin's vlogs and VLIVEs — company for a study session, the
same way the [original "Study w/ Soobin" playlist](https://www.youtube.com/playlist?list=PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt)
gets used.

## Features

- Fullscreen, looping YouTube video background (autoplay, muted until you turn
  up the volume slider)
- Pomodoro timer with Pomodoro / Short Break / Long Break modes
- Paged thumbnail grid to pick which video plays behind you
- Auto-advances to a random video when the current one ends
- Collapsible sidebar so the video can take over the full screen
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

This is a plain web app today (Vite + React + TypeScript + Tailwind). It runs
fine in any browser, and because it's a static client-side build, it can be
wrapped as a desktop app later (e.g. with Electron or Tauri) with no changes
to the app code — that hasn't been set up yet.

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
