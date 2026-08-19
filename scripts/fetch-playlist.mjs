// Refreshes src/data/playlist.json from the public "Study w/ Soobin" YouTube
// playlist, then appends the hand-curated extras in scripts/extra-videos.json.
// Uses youtubei.js (an unofficial InnerTube client) so no Google API key is
// required. Re-run with `npm run fetch-playlist` whenever new videos are added
// to the playlist (or to extra-videos.json).
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Innertube } from 'youtubei.js'

const PLAYLIST_ID = 'PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt'
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.join(SCRIPT_DIR, '..', 'src', 'data', 'playlist.json')
// Soobin vlogs/VLIVEs that aren't in the source playlist. Kept as bare ids and
// resolved here so a refresh re-derives their metadata instead of dropping
// them — hand-editing playlist.json would be undone by the next run.
const EXTRAS_PATH = path.join(SCRIPT_DIR, 'extra-videos.json')

function extractTitle(item) {
  // youtubei.js ≤13 exposed the title on the item; 17's LockupView nests it
  // under metadata. Check every shape seen so far.
  for (const candidate of [item.title, item.metadata?.title]) {
    if (typeof candidate === 'string' && candidate) return candidate
    if (candidate?.text) return candidate.text
  }
  return 'Untitled'
}

function extractDuration(item) {
  const overlay = item.content_image?.overlays?.find(
    (o) => o.type === 'ThumbnailBottomOverlayView',
  )
  return overlay?.badges?.[0]?.text ?? ''
}

/** "1:29:21" → 5361; returns 0 for anything unparseable (e.g. "LIVE"). */
function durationToSeconds(text) {
  const parts = text.split(':').map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return 0
  return parts.reduce((total, n) => total * 60 + n, 0)
}

function extractThumbnail(item) {
  const url = item.content_image?.image?.[0]?.url
  return url ? url.split('?')[0] : `https://i.ytimg.com/vi/${item.content_id}/hqdefault.jpg`
}

/** 5361 → "1:29:21", 1272 → "21:12" — the display format the playlist uses. */
function secondsToDuration(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Resolve the curated extras (bare ids) into full video entries.
 *  A single dead id shouldn't abort a refresh of the other 30-odd videos, so
 *  failures are reported and skipped rather than thrown. */
async function fetchExtras(yt, alreadyHave) {
  let config
  try {
    config = JSON.parse(await readFile(EXTRAS_PATH, 'utf-8'))
  } catch (error) {
    if (error.code === 'ENOENT') return [] // no curated extras is fine
    throw error
  }

  const entries = Array.isArray(config.videos) ? config.videos : []
  const resolved = []
  for (const entry of entries) {
    const id = entry?.id
    if (typeof id !== 'string' || !id) continue
    if (alreadyHave.has(id)) {
      console.warn(`  - ${id}: already in the playlist upstream, skipping the extra`)
      continue
    }
    try {
      const info = await yt.getBasicInfo(id)
      const seconds = info.basic_info?.duration ?? 0
      const title = info.basic_info?.title
      if (!title || !seconds) {
        console.warn(`  - ${id}: no title/duration came back, skipping`)
        continue
      }
      resolved.push({
        id,
        title,
        duration: secondsToDuration(seconds),
        durationSeconds: seconds,
        // The scraped thumbnail URLs carry expiring query params; the canonical
        // form is stable and is what the playlist entries already use.
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      })
    } catch (error) {
      console.warn(`  - ${id}: could not resolve (${error.message}), skipping`)
    }
  }

  // All of them failing means YouTube blocked us or the API shape moved — not
  // that every curated video died at once. Say so instead of quietly shipping
  // a shorter playlist.
  if (entries.length > 0 && resolved.length === 0) {
    throw new Error(
      `All ${entries.length} curated extras failed to resolve — refusing to write a ` +
        'playlist without them. Check connectivity and the ids in extra-videos.json.',
    )
  }
  return resolved
}

const yt = await Innertube.create()
const playlist = await yt.getPlaylist(PLAYLIST_ID)

const videos = playlist.items
  .filter((item) => item.content_id)
  .map((item) => {
    const duration = extractDuration(item)
    return {
      id: item.content_id,
      title: extractTitle(item),
      duration,
      durationSeconds: durationToSeconds(duration),
      thumbnail: extractThumbnail(item),
    }
  })

// The extraction paths above depend on YouTube's internal page schema, which
// shifts without notice. Refuse to clobber a good snapshot with a bad scrape.
if (videos.length === 0) {
  throw new Error(
    'Parsed 0 videos — YouTube\'s page schema probably changed. ' +
      'playlist.json was NOT overwritten; fix the field lookups in this script first.',
  )
}
// Same guard for a partial schema break (this exact failure shipped once:
// ids and durations parsed, every title fell back to "Untitled").
if (videos.every((v) => v.title === 'Untitled')) {
  throw new Error(
    'Every title parsed as "Untitled" — the title field path probably changed. ' +
      'playlist.json was NOT overwritten; fix extractTitle first.',
  )
}

// Curated extras go after the playlist so "playlist order" in the UI still
// means the real playlist's order.
console.log(`Resolving curated extras from ${path.basename(EXTRAS_PATH)}...`)
const extras = await fetchExtras(yt, new Set(videos.map((v) => v.id)))

const data = {
  title: playlist.info.title,
  sourceUrl: `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
  fetchedAt: new Date().toISOString(),
  videos: [...videos, ...extras],
}

await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
console.log(
  `Wrote ${data.videos.length} videos to ${OUT_PATH} ` +
    `(${videos.length} from the playlist + ${extras.length} curated)`,
)
