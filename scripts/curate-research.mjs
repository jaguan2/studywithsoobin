// Converts discovered links into refresh-safe curated ids. Discovery results
// are a temporary research file; YouTube metadata is resolved by fetch-playlist.
import { readFile, writeFile } from 'node:fs/promises'
import { membersFromTitle, broadcastDateFromTitle, kindFromTitle, sameBroadcast } from './catalog-metadata.mjs'
const rows = JSON.parse(await readFile('scripts/research-results.json', 'utf8'))
const snapshot = JSON.parse(await readFile('src/data/playlist.json', 'utf8'))
const config = JSON.parse(await readFile('scripts/extra-videos.json', 'utf8'))
const existing = new Map(config.videos.map(v => [v.id, v]))
const seen = new Map(snapshot.videos.map(v => [v.id, { ...v, members: v.members ?? ['soobin'], kind: v.kind ?? kindFromTitle(v.title), broadcastDate: v.broadcastDate ?? broadcastDateFromTitle(v.title) }]))
const videos = [...config.videos]
for (const row of rows) {
  if (!row.id || !row.title || seen.has(row.id)) continue
  const members = membersFromTitle(row.title)
  const kind = kindFromTitle(row.title)
  const durationSeconds = row.duration?.seconds ?? 0
  const officialVlog = row.channelId === 'UCtiObj3CsEAdNU6ZPWDsddQ' && kind === 'vlog' && members.length > 0 && durationSeconds >= 600
  const modernArchive = row.channelId === 'UC7m6u7W7QM1zv1hlPXbSPQA'
  const archiveLive = (modernArchive || ['UC2JQbysBeEG5KmbEuxrSWDw', 'UC2fPZ1O4sXfOVVzdVvN_v5g'].includes(row.channelId)) && kind === 'live' && members.length > 0 && durationSeconds >= 1200 && !/\(\d+\/\d+\)|\bPART\s*\d+/i.test(row.title)
  if (!officialVlog && !archiveLive) continue
  const candidate = { ...row, members, kind, durationSeconds, broadcastDate: broadcastDateFromTitle(row.title, modernArchive ? 'month-first' : 'day-first') }
  if ([...seen.values()].some(v => sameBroadcast(v, candidate))) continue
  seen.set(row.id, candidate)
  if (!existing.has(row.id)) videos.push({ id: row.id, members, kind, broadcastDate: candidate.broadcastDate, note: `${row.author} — ${row.title}` })
}
for (const v of videos) {
  const row = snapshot.videos.find(r => r.id === v.id)
  v.members ??= row ? ['soobin'] : membersFromTitle(v.note)
  v.kind ??= kindFromTitle(row?.title ?? v.note)
  v.broadcastDate ??= broadcastDateFromTitle(row?.title ?? v.note)
}
await writeFile('scripts/extra-videos.json', JSON.stringify({ _comment: ['Curated TXT vlogs and full live archives for all five members.', 'Keep ids and member/broadcast overrides here; fetch-playlist resolves fresh metadata.', 'Prefer TXT official, Moa\'s Diary and V Live; TomorrowByEdits covers newer Weverse lives.', 'Vlogs: 10+ minutes; lives: 20+ minutes. Preserve the shorter upstream entries.', 'Check original date, participants AND duration to avoid alternate uploads of one broadcast.', 'Shared lives are tagged with every named participant; omit ambiguous and multipart clips.', 'TomorrowByEdits numeric dates use month/day/year; other archives here use day/month/year.'], videos }, null, 2) + '\n')
console.log(`Curated ${videos.length} extras (${videos.length - config.videos.length} new).`)
