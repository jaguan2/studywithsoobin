import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampFocusGoal, computeStreak, formatFocusMinutes, getFocusDays, getTodayMinutes, localDayKey, recordFocusMinutes } from './stats'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('localDayKey', () => {
  it('formats the LOCAL date as YYYY-MM-DD', () => {
    // Late evening local time — toISOString would report the next/previous
    // day depending on the timezone; the local key must not.
    const d = new Date(2026, 7, 8, 23, 30) // Aug 8, 2026 local
    expect(localDayKey(d)).toBe('2026-08-08')
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const days = { '2026-08-06': 30, '2026-08-07': 45, '2026-08-08': 10 }
    expect(computeStreak(days, '2026-08-08')).toBe(3)
  })

  it("doesn't break the streak before today's first session", () => {
    const days = { '2026-08-06': 30, '2026-08-07': 45 }
    expect(computeStreak(days, '2026-08-08')).toBe(2)
  })

  it('stops at a gap', () => {
    const days = { '2026-08-04': 30, '2026-08-06': 45, '2026-08-07': 20 }
    expect(computeStreak(days, '2026-08-07')).toBe(2)
  })

  it('is zero with no recent days', () => {
    expect(computeStreak({}, '2026-08-08')).toBe(0)
    expect(computeStreak({ '2026-08-01': 60 }, '2026-08-08')).toBe(0)
  })

  it('crosses month boundaries', () => {
    const days = { '2026-07-31': 30, '2026-08-01': 45 }
    expect(computeStreak(days, '2026-08-01')).toBe(2)
  })

  it('counts each calendar day once across spring and autumn DST transitions', () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(computeStreak({ '2026-03-07': 25, '2026-03-08': 25, '2026-03-09': 25 }, '2026-03-09')).toBe(3)
    expect(computeStreak({ '2026-03-07': 25, '2026-03-08': 25 }, '2026-03-09')).toBe(2)
    expect(computeStreak({ '2026-10-31': 25, '2026-11-01': 25, '2026-11-02': 25 }, '2026-11-02')).toBe(3)
  })

  it('rejects impossible dates and ignores invalid focus totals', () => {
    expect(computeStreak({ '2026-03-01': 25 }, '2026-02-30')).toBe(0)
    expect(computeStreak({ '2026-08-07': 25, '2026-08-08': Infinity }, '2026-08-08')).toBe(1)
  })

  it('crosses leap-day and year boundaries', () => {
    expect(computeStreak({ '2024-02-28': 25, '2024-02-29': 25, '2024-03-01': 25 }, '2024-03-01')).toBe(3)
    expect(computeStreak({ '2025-12-31': 25, '2026-01-01': 25 }, '2026-01-01')).toBe(2)
  })
})

describe('stored focus history', () => {
  it('drops impossible dates and non-finite totals before displaying or extending history', () => {
    const values = new Map([['sws.stats', '{"2026-02-30":30,"2026-10-14":1e999,"2026-10-13":25,"2026-10-12":-5}']])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    })
    const now = new Date(2026, 9, 14, 12)
    expect(getFocusDays()).toEqual({ '2026-10-13': 25 })
    expect(getTodayMinutes(now)).toBe(0)
    recordFocusMinutes(25, now)
    expect(getTodayMinutes(now)).toBe(25)
    expect(getFocusDays()).toEqual({ '2026-10-13': 25, '2026-10-14': 25 })
  })
})

describe('formatFocusMinutes', () => {
  it.each([
    [45, '45m'],
    [60, '1h 0m'],
    [85, '1h 25m'],
    [0, '0m'],
  ])('formats %d as %s', (minutes, expected) => {
    expect(formatFocusMinutes(minutes)).toBe(expected)
  })
})

describe('clampFocusGoal', () => {
  it('keeps a useful persisted goal within sane limits', () => {
    expect(clampFocusGoal('90')).toBe(90)
    expect(clampFocusGoal(0)).toBe(15)
    expect(clampFocusGoal(9999)).toBe(720)
    expect(clampFocusGoal('bad')).toBe(120)
  })
})
