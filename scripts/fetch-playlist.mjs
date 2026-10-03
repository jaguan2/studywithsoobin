// Refresh the source playlist plus curated TXT links; no runtime API or API key.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Innertube } from 'youtubei.js'
import { membersFromTitle, broadcastDateFromTitle, kindFromTitle, validDate, sameBroadcast } from './catalog-metadata.mjs'

const PLAYLIST_ID = 'PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt'
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.join(SCRIPT_DIR, '..', 'src', 'data', 'playlist.json')
const EXTRAS_PATH = path.join(SCRIPT_DIR, 'extra-videos.json')
const LINKS_PATH = path.join(SCRIPT_DIR, '..', 'docs', 'video-catalog.md')

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}
function secondsToDuration(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor(total % 3600 / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
const config = await readJson(EXTRAS_PATH, { videos: [] })
if (!Array.isArray(config.videos)) throw new Error('extra-videos.json must contain a videos array')
const overrides = new Map()
for (const entry of config.videos) {
  if (!/^[\w-]{11}$/.test(entry.id) || overrides.has(entry.id)) throw new Error(`Invalid or duplicate curated id: ${entry.id}`)
  if (!entry.members?.length || entry.members.some(m => !['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai'].includes(m))) throw new Error(`Missing or invalid members: ${entry.id}`)
  if (entry.broadcastDate && !validDate(entry.broadcastDate)) throw new Error(`Invalid broadcast date: ${entry.id}`)
  overrides.set(entry.id, entry)
}
const previous = await readJson(OUT_PATH, { videos: [] })
const cached = new Map(previous.videos.map(v => [v.id, v]))
const yt = await Innertube.create()
let playlist = await yt.getPlaylist(PLAYLIST_ID)
const title = playlist.info.title
const upstream = []
while (true) {
  for (const item of playlist.items) {
    const id = item.content_id ?? item.id
    if (id && !upstream.includes(id)) upstream.push(id)
  }
  if (!playlist.has_continuation) break
  playlist = await playlist.getContinuation()
}
if (!upstream.length) throw new Error('Parsed 0 videos — refusing to overwrite the catalog. Check the YouTube playlist schema.')
const ids = [...new Set([...upstream, ...overrides.keys()])]
console.log(`Resolving ${ids.length} videos (titles, durations, channels and release dates)...`)
let cursor = 0
let successes = 0
let extraSuccesses = 0
let failures = 0
const results = new Array(ids.length)
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < ids.length) {
    const index = cursor++
    const id = ids[index]
    const override = overrides.get(id)
    try {
      const info = await yt.getBasicInfo(id)
      const basic = info.basic_info
      if (!basic.title || !basic.duration) throw new Error('No title/duration returned')
      const micro = info.page[0].microformat
      const inferred = membersFromTitle(basic.title)
      results[index] = {
        id, title: basic.title,
        duration: secondsToDuration(basic.duration), durationSeconds: basic.duration,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        members: override?.members ?? (inferred.length ? inferred : ['soobin']),
        kind: override?.kind ?? kindFromTitle(basic.title),
        publishedAt: validDate(micro?.publish_date) ?? cached.get(id)?.publishedAt ?? null,
        broadcastDate: override?.broadcastDate ?? broadcastDateFromTitle(basic.title),
        channel: basic.author ?? basic.channel?.name ?? '',
      }
      successes++
      if (override) extraSuccesses++
    } catch (error) {
      failures++
      console.warn(`  ${id}: ${error.message}${cached.has(id) ? ' — keeping last verified metadata' : ' — skipping'}`)
      results[index] = cached.get(id)
    }
    if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${ids.length} checked`)
  }
}))
if (!successes || (overrides.size && !extraSuccesses) || failures > ids.length / 4) {
  throw new Error('Too many metadata lookups failed — previous catalog was NOT overwritten. Check connectivity/YouTube schema.')
}
const videos = []
for (const video of results.filter(Boolean)) {
  const duplicate = videos.find(v => sameBroadcast(v, video))
  if (duplicate) { console.warn(`  ${video.id}: duplicate broadcast of ${duplicate.id}, omitted`); continue }
  videos.push(video)
}
const data = { title, sourceUrl: `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`, fetchedAt: new Date().toISOString(), videos }
await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
const escape = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ')
let links = '# TXT video catalog\n\n'
links += `Verified metadata at ${data.fetchedAt} (UTC). ${videos.length} videos. Refresh with \`npm run fetch-playlist\`.\n\n`
links += 'Sources: [Study w/ Soobin playlist](' + data.sourceUrl + '), [TXT official](https://www.youtube.com/@TXT_bighit), [Moa\'s Diary](https://www.youtube.com/channel/UC2JQbysBeEG5KmbEuxrSWDw), [V Live archive](https://www.youtube.com/channel/UC2fPZ1O4sXfOVVzdVvN_v5g), [TomorrowByEdits](https://www.youtube.com/channel/UC7m6u7W7QM1zv1hlPXbSPQA).\n\n'
links += 'Release is the YouTube publication date; original live dates are listed separately when explicitly supplied by the archive title. Shared lives appear under each participant. Metadata verification cannot guarantee runtime embedding; the app skips blocked embeds. This is a curated collection, not a complete archive.\n'
for (const member of ['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai']) {
  const entries = videos.filter(v => v.members.includes(member))
  links += `\n## ${member[0].toUpperCase() + member.slice(1)} (${entries.length})\n\n| Video | Type | Duration | Release | Original live | Channel |\n| --- | --- | --- | --- | --- | --- |\n`
  for (const v of entries) links += `| [${escape(v.title)}](https://www.youtube.com/watch?v=${v.id}) | ${v.kind} | ${v.duration} | ${v.publishedAt ?? 'Unknown'} | ${v.broadcastDate ?? '—'} | ${escape(v.channel)} |\n`
}
await mkdir(path.dirname(LINKS_PATH), { recursive: true })
await writeFile(LINKS_PATH, links, 'utf8')
console.log(`Wrote ${videos.length} videos and docs/video-catalog.md (${successes} fresh metadata lookups, ${failures} failures).`)
