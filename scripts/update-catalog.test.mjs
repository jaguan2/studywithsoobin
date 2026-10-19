import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { updateCatalog } from './update-catalog.mjs'
import { sources } from './catalog-curation.mjs'
import { renderCatalogLinks } from './catalog-output.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const old = { id: 'oldlive0001', title: 'Soobin VLIVE', duration: '30:00', durationSeconds: 1800, members: ['soobin'], kind: 'live', broadcastDate: '2025-01-02', publishedAt: '2025-01-03', channel: 'V Live', thumbnail: '' }
const initial = { title: 'Study w/ Soobin', sourceUrl: 'https://www.youtube.com/playlist?list=example', fetchedAt: '2025-01-01T00:00:00.000Z', videos: [old] }
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'sws-catalog-'))
  roots.push(root)
  for (const dir of ['src/data', 'scripts', 'docs']) await mkdir(path.join(root, dir), { recursive: true })
  await writeFile(path.join(root, 'src/data/playlist.json'), JSON.stringify(initial))
  await writeFile(path.join(root, 'scripts/extra-videos.json'), JSON.stringify({ _comment: ['Keep curator notes'], videos: [] }))
  await writeFile(path.join(root, 'docs/video-catalog.md'), 'original docs')
  return root
}
const json = (root, file) => readFile(path.join(root, file), 'utf8').then(JSON.parse)
const apiVideo = (id, title, channelId, duration = 'PT30M', overrides = {}) => ({
  id, snippet: { title, channelId, channelTitle: 'Archive', publishedAt: '2026-10-19T12:00:00Z', liveBroadcastContent: 'none' },
  contentDetails: { duration }, status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: true }, ...overrides,
})
const uploads = [
  apiVideo('newvlog0001', '[TXT-LOG] SOOBIN vlog', sources[0].id, 'PT10M'),
  apiVideo('newlive0001', 'SOOBIN YEONJUN Weverse live 10/18/2026', sources[3].id),
  apiVideo('duplive0001', 'SOOBIN VLIVE 02/01/2025', sources[1].id),
  apiVideo('unknown0001', 'Weverse live 10/18/2026', sources[3].id),
  apiVideo('partial0001', 'SOOBIN Weverse live PART 1', sources[3].id),
  apiVideo('shorter0001', 'SOOBIN vlog', sources[0].id, 'PT9M59S'),
  apiVideo('blocked0001', 'SOOBIN VLIVE', sources[1].id, 'PT30M', { status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: false } }),
]
function mockApi({ fail = false, paginated = false, videos = uploads } = {}) {
  return async url => {
    const resource = url.pathname.split('/').at(-1)
    let data
    if (resource === 'channels') data = { items: sources.map(source => ({ id: source.id, contentDetails: { relatedPlaylists: { uploads: source.id } } })) }
    if (resource === 'playlistItems') {
      if (fail) return new Response('{}', { status: 403 })
      const channel = url.searchParams.get('playlistId')
      const ids = videos.filter(video => video.snippet.channelId === channel).map(video => video.id)
      const secondPage = url.searchParams.has('pageToken')
      data = { items: (paginated && !secondPage ? ['oldlive0001'] : ids).map(videoId => ({ contentDetails: { videoId } })), ...(paginated && !secondPage ? { nextPageToken: 'next' } : {}) }
    }
    if (resource === 'videos') data = { items: videos.filter(video => url.searchParams.get('id').split(',').includes(video.id)) }
    if (!data) throw new Error('Unexpected endpoint')
    return new Response(JSON.stringify(data))
  }
}

describe('scheduled catalog updates', () => {
  it('discovers through pagination, appends eligible videos and retains curated history', async () => {
    const root = await setup()
    const result = await updateCatalog({ root, apiKey: 'test-key', write: true, fetchImpl: mockApi({ paginated: true }), now: new Date('2026-10-19T13:00:00Z') })
    const catalog = await json(root, 'src/data/playlist.json')
    expect(catalog.videos.map(video => video.id)).toEqual(['oldlive0001', 'newvlog0001', 'newlive0001'])
    expect(catalog.videos[0]).toEqual(old)
    expect(catalog.videos[2]).toMatchObject({ members: ['soobin', 'yeonjun'], broadcastDate: '2026-10-18', publishedAt: '2026-10-19', duration: '30:00' })
    expect((await json(root, 'scripts/extra-videos.json'))._comment).toEqual(['Keep curator notes'])
    expect((await json(root, 'scripts/extra-videos.json')).videos.map(video => video.id)).toEqual(['newvlog0001', 'newlive0001'])
    expect(await readFile(path.join(root, 'docs/video-catalog.md'), 'utf8')).toContain('newlive0001')
    expect(result.report).toContain('Alternate upload of oldlive0001')
    expect(result.report).toContain('Review: no explicitly named member')
    expect(result.report).toContain('Multipart clip')
    expect(result.report).toContain('Below minimum duration')
    expect(result.report).toContain('Not a completed public embeddable video')
    const before = await readFile(path.join(root, 'src/data/playlist.json'), 'utf8')
    const again = await updateCatalog({ root, apiKey: 'test-key', write: true, fetchImpl: mockApi(), now: new Date('2026-10-20') })
    expect(again.added).toEqual([])
    expect(await readFile(path.join(root, 'src/data/playlist.json'), 'utf8')).toBe(before)
  })
  it('reports candidates without changing the catalog in a dry run', async () => {
    const root = await setup()
    const result = await updateCatalog({ root, apiKey: 'test-key', fetchImpl: mockApi() })
    expect(result.added.map(video => video.id)).toEqual(['newvlog0001', 'newlive0001'])
    expect(await json(root, 'src/data/playlist.json')).toEqual(initial)
    expect(await readFile(path.join(root, 'docs/video-catalog.md'), 'utf8')).toBe('original docs')
  })
  it('reports scan limits without stopping at known IDs or inventing original dates', async () => {
    const root = await setup()
    const limited = await updateCatalog({ root, apiKey: 'test-key', pages: 1, fetchImpl: mockApi({ paginated: true }) })
    expect(limited.report).toContain('older uploads remain (increase --pages above 1')
    expect(limited.added).toEqual([])
    const result = await updateCatalog({ root, apiKey: 'test-key', fetchImpl: mockApi({ videos: [apiVideo('nodate00001', 'SOOBIN Weverse live', sources[3].id)] }) })
    expect(result.added[0]).toMatchObject({ id: 'nodate00001', broadcastDate: null, publishedAt: '2026-10-19' })
  })
  it('leaves existing files unchanged when discovery fails and explains missing credentials', async () => {
    const root = await setup()
    await expect(updateCatalog({ root, apiKey: 'test-key', write: true, fetchImpl: mockApi({ fail: true }) })).rejects.toThrow('HTTP 403')
    await expect(updateCatalog({ root, write: true, fetchImpl: mockApi() })).rejects.toThrow('Set YOUTUBE_API_KEY')
    expect(await json(root, 'src/data/playlist.json')).toEqual(initial)
    expect((await json(root, 'scripts/extra-videos.json')).videos).toEqual([])
  })
  it('keeps the shared markdown renderer compatible with the checked-in catalog', async () => {
    const catalog = JSON.parse(await readFile(new URL('../src/data/playlist.json', import.meta.url), 'utf8'))
    // The checked-in header was localized manually; generated rows must stay identical.
    const body = text => text.replaceAll('\r\n', '\n').split('\n').slice(4).join('\n')
    expect(body(renderCatalogLinks(catalog))).toBe(body(await readFile(new URL('../docs/video-catalog.md', import.meta.url), 'utf8')))
  })
})
