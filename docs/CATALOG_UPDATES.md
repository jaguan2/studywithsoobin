# Automatic YouTube catalog updates

The `Discover TXT videos` GitHub Actions workflow checks the four channels in
`scripts/catalog-sources.json` daily at 09:23 UTC (05:23 Eastern daylight time,
04:23 Eastern standard time). You can also run it manually. Scheduled runs can
be delayed by GitHub; public repositories can have their schedules disabled
after 60 days without repository activity.

It reads channels' uploads playlists using the official YouTube Data API v3,
then fetches metadata for IDs outside the existing catalog/curated extras. It
does not require YouTube login, download videos, or query Weverse directly.

## One-time activation

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. In **APIs & Services → Library**, enable **YouTube Data API v3**.
3. In **APIs & Services → Credentials**, create an API key. Under its API
   restrictions, restrict it to **YouTube Data API v3**. This is a server-side
   scheduled job, so a browser HTTP-referrer restriction will not work. GitHub
   hosted runners do not provide a fixed outgoing IP for a simple IP restriction.
4. In the [GitHub repository's Actions secrets](https://github.com/jaguan2/studywithsoobin/settings/secrets/actions),
   add a repository secret named **`YOUTUBE_API_KEY`** containing that key.
   Never put it in source, a `VITE_` variable, a screenshot, or the frontend.
5. In **Settings → Actions → General → Workflow permissions**, enable
   **Allow GitHub Actions to create and approve pull requests**. The workflow
   requests `contents: write` and `pull-requests: write`; it never approves or
   merges its own pull requests. Repository/organization policies must permit
   the pinned Actions used by the workflow.
6. Publish these code changes to the default branch. In **Actions → Discover
   TXT videos → Run workflow**, leave `pages` at `3` and run it once.
7. Inspect the run's summary/artifact and the `automation/catalog-update` pull
   request. Review the proposed videos and metadata, then merge the catalog PR
   to publish it. No additions means no new catalog commit or PR. Ambiguous
   matches remain in the run report even when no PR is opened.

The GitHub secret and the first live API run have to be configured separately;
local fixture tests do not establish that the account's credentials work.
With the default four channels and three pages, discovery makes at most 25
Data API list requests (one channels request, twelve upload-page requests and
twelve batches of video metadata). Check the project's quota page for actual
usage. API failures fail the workflow before any catalog is published.

## What is included

- Official TXT vlogs: explicitly named members and at least 10 minutes.
- Trusted archive lives: explicitly named members and at least 20 minutes.
- Only completed, public videos whose API metadata allows embedding.
- No multipart clips; matching broadcast date, members and near-equal duration
  identify alternate uploads of an existing broadcast.
- Shared lives are assigned to every explicitly named member. Unknown members
  and unclear video types go to the report, not the published catalog.
- Original dates are parsed only from titles using each source's date order.
  An undated live stays undated; its upload date is never used as a substitute.

All proposed videos still receive human review through the catalog PR. Actual
playback may refuse an embed despite API metadata; the app's existing error
handling remains responsible for that case. Discovery appends entries, retaining
existing videos, ordering, metadata and curator overrides. It does not refresh
the original source playlist or remove deleted videos. The existing
`npm run fetch-playlist` remains the separate full refresh command.

The default scan covers the newest **150 uploads per channel**, not just 150
eligible videos. It scans past known IDs because older uploads may still be
missing. Reports identify channels whose histories extend beyond the scan.
For a first backfill or a long outage, increase the manual `pages` input; 100
pages covers up to 5,000 uploads per channel and consumes more quota. Discovery
cannot find videos on channels outside the source list; add trusted channels
deliberately and review their title/date conventions first.

## Updating installed apps

New builds check the reviewed catalog at
`https://raw.githubusercontent.com/jaguan2/studywithsoobin/main/src/data/playlist.json`
once on startup. The bundled catalog is immediately usable. A valid newer
snapshot replaces it and is cached on the device; failed, invalid or stale
downloads leave the usable catalog alone. Startup checks time out after eight
seconds. An update does not change the selected video, filters, favorites or
timer, and a removed video's current playback/label is retained until selection
changes. Approved additions appear on the next launch/reload, not in a running
session hours later.

People with an older EXE need to download the newly rebuilt EXE **once** to get
this loader. Afterward, merging catalog-only updates does not require another
EXE rebuild. The API key never ships in either build. Offline launches use a
valid cached catalog when newer than the bundle, otherwise the bundle itself.
For a fork or another host, set `VITE_CATALOG_URL` at build time to a publicly
readable HTTPS catalog endpoint that allows browser CORS requests; it is a data
URL, not an API credential.

## Local commands

Set `YOUTUBE_API_KEY` in the current shell through your normal secret-management
method. With Node 22+ and dependencies installed:

```powershell
npm.cmd run update-catalog                      # dry run; report only
npm.cmd run update-catalog -- --write            # update generated catalog + extras
npm.cmd run update-catalog -- --pages=10         # deeper dry run
npm.cmd test
npm.cmd run build
```

The report is `build/catalog-update/report.md` (ignored by Git). Existing
manual research/curation scripts share the eligibility rules with this updater.
Neither this command nor the app automatically commits or pushes local work.

References: [YouTube uploads playlist listing](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list),
[API keys](https://cloud.google.com/docs/authentication/api-keys),
[GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[GitHub workflow permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).
