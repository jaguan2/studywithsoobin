import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useVideoCatalog } from './useVideoCatalog'
import { EMPTY_FILTERS } from '../lib/catalog'
import type { Video } from '../types/playlist'

const videos: Video[] = [
  { id: 'one', title: 'First', duration: '25:00', thumbnail: '', members: ['soobin'], publishedAt: '2024-01-01' },
  { id: 'two', title: 'Second', duration: '15:00', thumbnail: '', members: ['yeonjun'], publishedAt: '2025-01-01' },
  { id: 'three', title: 'Third', duration: '35:00', thumbnail: '', members: ['soobin'], publishedAt: '2023-01-01' },
]
let root: ReactTestRenderer | undefined
let api: ReturnType<typeof useVideoCatalog>
let values: Map<string, string>
let location: URL
const blocked = vi.fn()
const repeat = vi.fn()
function Harness({ catalog = videos }: { catalog?: Video[] }) {
  api = useVideoCatalog(catalog, blocked, repeat)
  return null
}
function mount(url = 'https://study.example/?keep=yes#catalog', catalog = videos) {
  location = new URL(url)
  act(() => { root = create(<Harness catalog={catalog} />) })
}
beforeEach(() => {
  vi.clearAllMocks()
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  vi.stubGlobal('window', {
    get location() { return location },
    history: { replaceState: (_state: unknown, _unused: string, url: string | URL) => { location = new URL(url) } },
  })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('catalog selection and persistence', () => {
  it('validates deep links and preserves other URL state when returning to welcome', () => {
    mount('https://study.example/?keep=yes&v=two#catalog')
    expect(api.videoId).toBe('two')
    expect(values.get('sws.lastVideo')).toBe('two')
    act(() => api.setVideoId(null))
    expect(location.href).toBe('https://study.example/?keep=yes#catalog')
    expect(api.lastVideo?.id).toBe('two')
  })

  it.each(['', '?v=unknown'])('starts at welcome for an absent or invalid deep link %s', search => {
    mount(`https://study.example/${search}`)
    expect(api.videoId).toBeNull()
    expect(location.search).toBe('')
  })

  it('keeps selection stable while filters and favorites change, then uses the filtered order', () => {
    mount('https://study.example/?v=two')
    act(() => api.setCatalogFilters({ ...EMPTY_FILTERS, member: 'soobin', sort: 'oldest' }))
    expect(api.videoId).toBe('two')
    expect(api.filteredVideos.map(video => video.id)).toEqual(['three', 'one'])
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('three')
    act(() => api.handlePreviousVideo())
    expect(api.videoId).toBe('one')
    act(() => api.toggleFavorite('three'))
    act(() => api.setCatalogFilters({ ...EMPTY_FILTERS, favoritesOnly: true }))
    expect(api.videoId).toBe('one')
    expect(JSON.parse(values.get('sws.favorites')!)).toEqual(['three'])
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('three')
    act(() => api.handleEnded())
    expect(repeat).toHaveBeenCalledOnce()
  })

  it('excludes blocked videos and returns to welcome when none can play', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mount('https://study.example/?v=one')
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('two')
    expect(api.playable.map(video => video.id)).toEqual(['two', 'three'])
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('three')
    act(() => api.handleUnplayable())
    expect(api.videoId).toBeNull()
    expect(api.playable).toEqual([])
    expect(api.lastVideo).toBeNull()
    act(() => api.handleUnplayable())
    expect(blocked).toHaveBeenCalledTimes(3)
  })

  it('advances at random without repeating the current candidate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mount('https://study.example/?v=one')
    act(() => api.handleEnded())
    expect(api.videoId).toBe('two')
    expect(repeat).not.toHaveBeenCalled()
  })

  it('handles empty catalogs and unreadable saved preferences', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Unavailable') }, setItem: () => { throw Error('Unavailable') } })
    mount('https://study.example/?v=one', [])
    expect(api.videoId).toBeNull()
    expect(api.favorites).toEqual([])
    act(() => api.handleSurprise())
    act(() => api.handleNextVideo())
    expect(api.videoId).toBeNull()
  })
})
