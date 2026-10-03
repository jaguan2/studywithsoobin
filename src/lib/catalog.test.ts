import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filterVideos } from './catalog'
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
