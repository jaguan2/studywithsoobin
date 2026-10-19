import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessCandidate, sources } from './catalog-curation.mjs'
import { validDate } from './catalog-metadata.mjs'
import { renderCatalogLinks, secondsToDuration } from './catalog-output.mjs'
import { discoverUploads } from './youtube-discovery.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Read-only by default. Complete discovery before writing any catalog files. */
export async function updateCatalog({ root = ROOT, apiKey, pages = 3, write = false, fetchImpl = fetch, now = new Date() }) {
  const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'))
  const snapshot = await readJson('src/data/playlist.json')
  const config = await readJson('scripts/extra-videos.json')
  const knownIds = new Set([...snapshot.videos, ...config.videos].map(video => video.id))
  const { rows, scans, unavailable } = await discoverUploads({ apiKey, sources, knownIds, pages, fetchImpl })
  const videos = [...snapshot.videos]
  const extras = [...config.videos]
  const added = []
  const review = []
  for (const row of rows) {
    if (!row.playable) { review.push({ ...row, reason: 'Not a completed public embeddable video' }); continue }
    const { candidate, reason } = assessCandidate(row, videos)
    if (!candidate) { review.push({ ...row, reason }); continue }
    const publishedAt = validDate(row.publishedAt)
    if (!publishedAt) throw new Error(`Invalid release date for ${row.id}; catalog unchanged.`)
    const video = {
      id: row.id, title: row.title, duration: secondsToDuration(row.durationSeconds),
      durationSeconds: row.durationSeconds, thumbnail: `https://i.ytimg.com/vi/${row.id}/hqdefault.jpg`,
      members: candidate.members, kind: candidate.kind, publishedAt,
      broadcastDate: candidate.broadcastDate, channel: row.author,
    }
    videos.push(video)
    added.push(video)
    extras.push({ id: video.id, members: video.members, kind: video.kind, broadcastDate: video.broadcastDate, note: `${video.channel} — ${video.title}` })
  }
  const text = value => String(value).replace(/[\r\n|]/g, ' ')
  const table = entries => entries.map(video => `| [${text(video.title)}](https://www.youtube.com/watch?v=${video.id}) | ${text(video.reason ?? video.members.join(', '))} |`).join('\n')
  const report = [
    '# YouTube catalog discovery', '',
    `Checked ${now.toISOString()}. ${added.length} eligible additions. ${write ? 'Catalog files updated when additions exist.' : 'Dry run: catalog files unchanged.'}`, '',
    ...scans.map(scan => `- ${scan.source}: scanned ${scan.ids.length} uploads${scan.truncated ? `; older uploads remain (increase --pages above ${pages} for a deeper scan)` : ''}.`),
    '', '## Proposed additions', '', '| Video | Members |', '| --- | --- |', table(added), '',
    '## Not added / review queue', '',
    'Review ambiguous titles manually; do not guess members or original broadcast dates. These entries are not published to the app.', '',
    '| Video | Reason |', '| --- | --- |', table(review), '',
    `Unavailable IDs (retry on later scans): ${unavailable.join(', ') || 'none'}.`, '',
    'Existing entries and their metadata are retained. Runtime embedding still needs the real player.', '',
  ].join('\n')
  await mkdir(path.join(root, 'build/catalog-update'), { recursive: true })
  await writeFile(path.join(root, 'build/catalog-update/report.md'), report)
  if (write && added.length) {
    const next = { ...snapshot, fetchedAt: now.toISOString(), videos }
    await writeFile(path.join(root, 'scripts/extra-videos.json'), JSON.stringify({ ...config, videos: extras }, null, 2) + '\n')
    await writeFile(path.join(root, 'src/data/playlist.json'), JSON.stringify(next, null, 2) + '\n')
    await writeFile(path.join(root, 'docs/video-catalog.md'), renderCatalogLinks(next))
  }
  return { added, review, report }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    const pagesArg = args.find(arg => arg.startsWith('--pages='))
    if (args.some(arg => arg !== '--write' && arg !== pagesArg)) throw new Error('Usage: npm run update-catalog -- [--write] [--pages=3]')
    const result = await updateCatalog({ apiKey: process.env.YOUTUBE_API_KEY, pages: pagesArg ? Number(pagesArg.slice(8)) : 3, write: args.includes('--write') })
    console.log(`${result.added.length} eligible additions; report: build/catalog-update/report.md${args.includes('--write') ? '' : ' (dry run)'}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
