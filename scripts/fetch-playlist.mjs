// Refreshes src/data/playlist.json from the public "Study w/ Soobin" YouTube
// playlist. Uses youtubei.js (an unofficial InnerTube client) so no Google
// API key is required. Re-run with `npm run fetch-playlist` whenever new
// videos are added to the playlist.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Innertube } from 'youtubei.js'

const PLAYLIST_ID = 'PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt'
const OUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'playlist.json',
)

function extractTitle(item) {
  if (typeof item.title === 'string') return item.title
  return item.title?.text ?? 'Untitled'
}

function extractDuration(item) {
  const overlay = item.content_image?.overlays?.find(
    (o) => o.type === 'ThumbnailBottomOverlayView',
  )
  return overlay?.badges?.[0]?.text ?? ''
}

function extractThumbnail(item) {
  const url = item.content_image?.image?.[0]?.url
  return url ? url.split('?')[0] : `https://i.ytimg.com/vi/${item.content_id}/hqdefault.jpg`
}

const yt = await Innertube.create()
const playlist = await yt.getPlaylist(PLAYLIST_ID)

const videos = playlist.items
  .filter((item) => item.content_id)
  .map((item) => ({
    id: item.content_id,
    title: extractTitle(item),
    duration: extractDuration(item),
    thumbnail: extractThumbnail(item),
  }))

const data = {
  title: playlist.info.title,
  sourceUrl: `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
  fetchedAt: new Date().toISOString(),
  videos,
}

await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
console.log(`Wrote ${videos.length} videos to ${OUT_PATH}`)
