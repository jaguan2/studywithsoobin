import { describe, expect, it } from 'vitest'
import { adjacentVideo, EMPTY_FILTERS, filterVideos } from './catalog'
import type { Video } from '../types/playlist'
import playlist from '../data/playlist.json'

const video = (id: string, members: Video['members'], publishedAt?: string): Video => ({ id, members, publishedAt, title: id, duration: '20:00', thumbnail: '' })
const videos = [video('solo', ['soobin'], '2023-07-17'), video('shared', ['soobin', 'yeonjun'], '2024-07-17'), video('other', ['taehyun'], '2024-03-02'), video('unknown', ['soobin'])]

describe('catalog filters', () => {
  it('keeps playlist order and includes unknown dates without date filters', () => {
    expect(filterVideos(videos, EMPTY_FILTERS)).toEqual(videos)
  })
  it('includes shared lives for each participant', () => {
    expect(filterVideos(videos, { ...EMPTY_FILTERS, member: 'yeonjun' }).map(v => v.id)).toEqual(['shared'])
  })
  it('combines member, year and month', () => {
    expect(filterVideos(videos, { member: 'soobin', year: '2024', month: '07' }).map(v => v.id)).toEqual(['shared'])
  })
  it('supports month across years and excludes unknown dates', () => {
    expect(filterVideos(videos, { ...EMPTY_FILTERS, month: '07' }).map(v => v.id)).toEqual(['solo', 'shared'])
  })
  it('returns no matches for impossible combinations', () => {
    expect(filterVideos(videos, { member: 'taehyun', year: '2023', month: '' })).toEqual([])
  })
  it('searches case-insensitive title/member/channel terms together', () => {
    const entry = { ...videos[0], title: 'IN JAPAN', channel: 'TXT Official' }
    expect(filterVideos([entry], { ...EMPTY_FILTERS, query: '  SOOBIN japan official ' })).toEqual([entry])
    expect(filterVideos([entry], { ...EMPTY_FILTERS, query: 'soobin france' })).toEqual([])
  })
  it('combines favorites, solo and type filters', () => {
    const entries = videos.map(v => ({ ...v, kind: 'live' as const }))
    expect(filterVideos(entries, { ...EMPTY_FILTERS, favoritesOnly: true, soloOnly: true, kind: 'live' }, ['solo', 'shared']).map(v => v.id)).toEqual(['solo'])
    expect(filterVideos(entries, { ...EMPTY_FILTERS, favoritesOnly: true }, [])).toEqual([])
  })
  it('uses original dates for live archives without guessing missing broadcast dates', () => {
    const entries: Video[] = [
      { ...videos[0], kind: 'live', broadcastDate: '2019-07-22' },
      { ...videos[1], kind: 'live' },
      { ...videos[2], kind: 'vlog' },
    ]
    expect(filterVideos(entries, { ...EMPTY_FILTERS, dateSource: 'original', year: '2019' }).map(v => v.id)).toEqual(['solo'])
    expect(filterVideos(entries, { ...EMPTY_FILTERS, dateSource: 'original', year: '2024' }).map(v => v.id)).toEqual(['other'])
  })
  it('sorts both date directions with unknown dates last and preserves the input', () => {
    expect(filterVideos(videos, { ...EMPTY_FILTERS, sort: 'newest' }).map(v => v.id)).toEqual(['shared', 'other', 'solo', 'unknown'])
    expect(filterVideos(videos, { ...EMPTY_FILTERS, sort: 'oldest' }).map(v => v.id)).toEqual(['solo', 'other', 'shared', 'unknown'])
    expect(videos.map(v => v.id)).toEqual(['solo', 'shared', 'other', 'unknown'])
  })
  it('navigates only the filtered order, wraps, and handles excluded current videos', () => {
    const pool = filterVideos(videos, { ...EMPTY_FILTERS, member: 'soobin' })
    expect(adjacentVideo(pool, 'solo', 1)).toBe('shared')
    expect(adjacentVideo(pool, 'solo', -1)).toBe('unknown')
    expect(adjacentVideo(pool, 'other', 1)).toBe('solo')
    expect(adjacentVideo([], 'solo', 1)).toBeNull()
    expect(adjacentVideo([videos[0]], 'solo', 1)).toBe('solo')
  })
  it('ships unique ids and real member/date metadata for every catalog entry', () => {
    expect(new Set(playlist.videos.map(v => v.id)).size).toBe(playlist.videos.length)
    for (const v of playlist.videos) {
      expect(v.members.length).toBeGreaterThan(0)
      expect(v.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(v.durationSeconds).toBeGreaterThan(0)
    }
    for (const member of ['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai']) {
      expect(playlist.videos.some(v => (v.members as string[]).includes(member))).toBe(true)
    }
  })
})
