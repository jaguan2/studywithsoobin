import { describe, expect, it } from 'vitest'
import { membersFromTitle, broadcastDateFromTitle, sameBroadcast, validDate } from './catalog-metadata.mjs'

describe('archive metadata', () => {
  it('recognizes Korean names and multiple participants without using search keywords', () => {
    expect(membersFromTitle('수빈이의 첫 밀라노 방문 | TXT-LOG')).toEqual(['soobin'])
    expect(membersFromTitle('SOOBIN & Huening Kai')).toEqual(['soobin', 'hueningkai'])
    expect(membersFromTitle('TXT in U.S.')).toEqual([])
  })
  it('parses archive date formats without guessing an upload date', () => {
    for (const title of ['{02nd April, 2022}', '| 220402 |', '{2022.04.02}', '(02/04/2022)']) {
      expect(broadcastDateFromTitle(title)).toBe('2022-04-02')
    }
    expect(broadcastDateFromTitle('SOOBIN IN JAPAN')).toBeNull()
    expect(broadcastDateFromTitle('(05/19/2026)', 'month-first')).toBe('2026-05-19')
    expect(broadcastDateFromTitle('(03/04/2026)', 'month-first')).toBe('2026-03-04')
    expect(validDate('2022-02-30')).toBeNull()
  })
  it('deduplicates matching broadcasts but preserves separate lives on the same day', () => {
    const live = { kind: 'live', members: ['soobin', 'yeonjun'], broadcastDate: '2022-04-02', durationSeconds: 3600 }
    expect(sameBroadcast(live, { ...live, members: ['yeonjun', 'soobin'], durationSeconds: 3601 })).toBe(true)
    expect(sameBroadcast(live, { ...live, durationSeconds: 2400 })).toBe(false)
    expect(sameBroadcast(live, { ...live, members: ['soobin'] })).toBe(false)
    expect(sameBroadcast(live, { ...live, broadcastDate: '2022-04-03' })).toBe(false)
  })
})
