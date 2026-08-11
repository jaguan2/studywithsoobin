import { describe, expect, it } from 'vitest'
import { computeStreak, formatFocusMinutes, localDayKey } from './stats'

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
