import { describe, expect, it } from 'vitest'
import { formatTime, parseTimeInput } from './useTimer'

describe('parseTimeInput', () => {
  it.each([
    ['bare minutes', '45', 45 * 60],
    ['mm:ss', '25:30', 25 * 60 + 30],
    ['h:mm:ss', '1:30:00', 90 * 60],
    ['whitespace around the value', ' 25 ', 25 * 60],
    ['leading zeros', '05:00', 5 * 60],
  ])('parses %s', (_name, input, expected) => {
    expect(parseTimeInput(input)).toBe(expected)
  })

  it('clamps to the sane range', () => {
    expect(parseTimeInput('0')).toBe(10) // MIN_SECONDS
    expect(parseTimeInput('99999')).toBe(12 * 60 * 60) // MAX_SECONDS
  })

  it.each([
    ['empty', ''],
    ['words', 'abc'],
    ['too many colons', '1:2:3:4'],
    ['negative', '-5'],
    ['mixed garbage', '12:xx'],
  ])('rejects %s', (_name, input) => {
    expect(parseTimeInput(input)).toBeNull()
  })
})

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [59, '00:59'],
    [61, '01:01'],
    [25 * 60, '25:00'],
    [3600, '1:00:00'],
    [5361, '1:29:21'],
  ])('formats %d as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected)
  })
})
