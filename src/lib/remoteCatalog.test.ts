import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import realCatalog from '../data/playlist.json'
import type { Playlist } from '../types/playlist'
import { cachedCatalog, CATALOG_CACHE_KEY, downloadCatalog, newerCatalog, parseCatalog } from './remoteCatalog'

const bundled: Playlist = { title: 'Study w/ Soobin', sourceUrl: 'https://www.youtube.com/playlist?list=example', fetchedAt: '2026-01-01T00:00:00Z', videos: [{ id: 'oldvlog0001', title: 'Soobin vlog', duration: '20:00', durationSeconds: 1200, thumbnail: 'https://i.ytimg.com/vi/oldvlog0001/hqdefault.jpg', members: ['soobin'], kind: 'vlog', publishedAt: '2026-01-01', broadcastDate: null, channel: 'TXT official' }] }
const incoming = () => ({ ...bundled, fetchedAt: '2026-10-20T00:00:00Z', videos: [...bundled.videos, { ...bundled.videos[0], id: 'newvlog0001', title: 'New Soobin vlog' }] })
let values: Map<string, string>
beforeEach(() => {
  values = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())

describe('downloaded catalog', () => {
  it('accepts the real generated catalog and rejects malformed snapshots as a whole', () => {
    expect(parseCatalog(realCatalog)).toEqual(realCatalog)
    expect(parseCatalog(incoming())?.videos[1].title).toBe('New Soobin vlog')
    for (const bad of [null, {}, { ...incoming(), videos: [] }, { ...incoming(), videos: [bundled.videos[0], bundled.videos[0]] }, { ...incoming(), fetchedAt: 'invalid' }, { ...incoming(), videos: [{ ...bundled.videos[0], members: ['unknown'] }] }, { ...incoming(), videos: [{ ...bundled.videos[0], duration: 12 }] }, { ...incoming(), videos: [{ ...bundled.videos[0], publishedAt: '2026-02-30' }] }]) {
      expect(parseCatalog(bad)).toBeNull()
    }
  })
  it('uses newer cached data offline and ignores corrupt or older caches', () => {
    expect(cachedCatalog(bundled).videos.length).toBe(1)
    values.set(CATALOG_CACHE_KEY, JSON.stringify(incoming()))
    expect(cachedCatalog(bundled).videos.length).toBe(2)
    values.set(CATALOG_CACHE_KEY, 'broken JSON')
    expect(cachedCatalog(bundled).videos.length).toBe(1)
    expect(newerCatalog(bundled, { ...bundled, fetchedAt: '2020-01-01' })).toBe(bundled)
  })
  it('downloads and caches a newer catalog without accepting a later stale response', async () => {
    const next = await downloadCatalog(bundled, new AbortController().signal, async () => new Response(JSON.stringify(incoming())))
    expect(next.videos[1].title).toBe('New Soobin vlog')
    expect(cachedCatalog(bundled).videos[1].id).toBe('newvlog0001')
    const stale = await downloadCatalog(next, new AbortController().signal, async () => new Response(JSON.stringify(bundled)))
    expect(stale.videos.length).toBe(2)
  })
  it('keeps the usable catalog on invalid JSON, HTTP errors, network failure, cancellation or storage failure', async () => {
    const signal = new AbortController().signal
    const responses: typeof fetch[] = [async () => new Response('not json'), async () => new Response('{}', { status: 503 }), async () => { throw new Error('offline') }]
    for (const fetchImpl of responses) expect(await downloadCatalog(bundled, signal, fetchImpl)).toBe(bundled)
    const cancelled = new AbortController()
    cancelled.abort()
    expect(await downloadCatalog(bundled, cancelled.signal, async () => new Response(JSON.stringify(incoming())))).toBe(bundled)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('disabled') }, setItem: () => { throw new Error('quota') } })
    expect(cachedCatalog(bundled).videos.length).toBe(1)
    expect((await downloadCatalog(bundled, signal, async () => new Response(JSON.stringify(incoming())))).videos.length).toBe(2)
  })
})
