# TXT discovery and catalog updates

Catalog discovery uses public YouTube sources and the existing manual research
and curation scripts. No YouTube Data API key, Google Cloud project, or GitHub
secret is needed. There is no scheduled discovery workflow.

## Discover and review videos

For every coding task, follow the discovery check in AGENTS.md. Check the four
trusted channels in `scripts/catalog-sources.json` through their public recent
upload feeds/pages or targeted searches. A public feed is a limited recent
window, not a complete history. Record checked sources, candidates and coverage
limits; a failed request does not establish that no new uploads exist.

For broader discovery, run the existing Node research script from the repo root:

```powershell
node scripts/research-catalog.mjs
```

This writes ignored `scripts/research-results.json` without changing the app's
catalog. It searches all five members and enumerates selected archive channels;
it is a research aid rather than an exhaustive channel monitor. Inspect its
results, remove unapproved candidates from that research file, then run:

```powershell
node scripts/curate-research.mjs
```

Review the resulting `scripts/extra-videos.json` diff before refreshing:

```powershell
npm.cmd run fetch-playlist
npm.cmd test
npm.cmd run build
```

Inspect the generated `src/data/playlist.json` and `docs/video-catalog.md` diff.
Do not edit these generated files by hand. Commit/publish reviewed catalog
changes through the normal repository workflow. These scripts do not commit,
push or merge changes themselves. They use `youtubei.js`, which relies on
YouTube's undocumented page data and can need maintenance when that data changes.

## Eligibility rules

- Official TXT vlogs: explicitly named members and at least 10 minutes.
- Trusted archive lives: explicitly named members and at least 20 minutes.
- Exclude ambiguous participants and multipart clips. Shared lives include every
  explicitly named participant; do not infer members from emojis alone.
- Compare original broadcast date, members and duration to identify alternate
  uploads without dropping separate broadcasts of different lengths.
- Parse original dates only from explicit titles or curated overrides using the
  source's date convention. Never substitute upload dates for broadcast dates.
- Verify durations and metadata before accepting a candidate. Actual embedding
  still needs the real player; the app retains its runtime blocked-video handling.

Keep catalog findings separate from unrelated coding work. The standing coding
check discovers and reports candidates; it does not publish them automatically.

## Updating installed apps

New builds check the reviewed catalog at
`https://raw.githubusercontent.com/jaguan2/studywithsoobin/main/src/data/playlist.json`
once on startup. This downloads ordinary public JSON, not YouTube API data.
The bundled catalog is immediately usable. A valid newer snapshot replaces it
and is cached on the device. Failed, malformed or stale downloads leave the
usable catalog alone; checks time out after eight seconds.

Catalog updates preserve the selected video, filters, favorites and timer.
A removed video's current playback/label is retained until selection changes.
Reviewed additions appear on the next launch/reload after publication.

Older EXEs need one upgrade to gain this loader. Afterward, publishing catalog-only
updates does not require another EXE rebuild. Offline launches use a valid newer
cached catalog, otherwise the bundle. For another repository or host, set
`VITE_CATALOG_URL` at build time to a public catalog endpoint that allows browser
CORS requests. It is a data URL and must never contain a credential.
