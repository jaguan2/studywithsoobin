import { describe, expect, it } from 'vitest'
import {
  checkInXP, currentCheckInStreak, editProfile, levelForXP, normalizeProgression,
  progressionLevel, progressionMilestones, recordCheckIn, rememberCompletedTasks,
  rewardFocusSession, rewardTaskCompletion, syncFocusHistory, totalFocusMinutes,
  xpBeforeLevel, xpForNextLevel,
} from './progression'

const fresh = () => normalizeProgression(null)
const local = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12)

describe('profile levels', () => {
  it.each([[0, 1], [99, 1], [100, 2], [249, 2], [250, 3], [449, 3], [450, 4], [700, 5]])(
    'puts %d XP in level %d', (xp, level) => expect(levelForXP(xp).level).toBe(level),
  )
  it('increases the level requirement by 50 and resets progress at each boundary', () => {
    for (const level of [1, 2, 3, 10, 100, 1000]) {
      const result = levelForXP(xpBeforeLevel(level))
      expect(result).toMatchObject({ level, earned: 0, required: xpForNextLevel(level), remaining: xpForNextLevel(level) })
      expect(levelForXP(xpBeforeLevel(level) + result.required - 1)).toMatchObject({ level, remaining: 1 })
    }
  })
  it.each([-100, NaN, Infinity])('handles invalid XP %s', value => {
    expect(levelForXP(value)).toMatchObject({ level: 1, totalXP: 0, earned: 0, required: 100 })
  })
})

describe('study credit', () => {
  it('backfills existing history only once and never loses credit on a stale or pruned read', () => {
    const state = syncFocusHistory(fresh(), { '2025-01-01': 60, '2026-10-14': 25 })
    expect(totalFocusMinutes(state)).toBe(85)
    expect(progressionLevel(state).totalXP).toBe(85)
    expect(syncFocusHistory(state, { '2025-01-01': 60, '2026-10-14': 25 })).toBe(state)
    expect(syncFocusHistory(state, { '2026-10-14': 10 })).toBe(state)
    expect(syncFocusHistory(state, {})).toBe(state)
    const next = rewardFocusSession(state, 25, { '2026-10-14': 50 }, local(2026, 10, 14))
    expect(totalFocusMinutes(next)).toBe(110)
    expect(next.focusDays['2025-01-01']).toBe(60)
  })
  it('counts a new session exactly once when ordinary stats already include it', () => {
    const state = syncFocusHistory(fresh(), { '2026-10-14': 30 })
    const next = rewardFocusSession(state, 25, { '2026-10-14': 55 }, local(2026, 10, 14))
    expect(totalFocusMinutes(next)).toBe(55)
    expect(syncFocusHistory(next, { '2026-10-14': 55 })).toBe(next)
    const relaunched = normalizeProgression(JSON.parse(JSON.stringify(next)))
    expect(totalFocusMinutes(rewardFocusSession(relaunched, 25, { '2026-10-14': 80 }, local(2026, 10, 14)))).toBe(80)
  })
  it('retains session credit when storage history is unavailable and on the next successful completion', () => {
    const next = rewardFocusSession(fresh(), 25, null, local(2026, 10, 14))
    expect(totalFocusMinutes(next)).toBe(25)
    expect(totalFocusMinutes(rewardFocusSession(next, 25, { '2026-10-14': 25 }, local(2026, 10, 14)))).toBe(50)
  })
  it.each([0, -10, NaN, Infinity, 10 / 60])('does not reward non-focus or zero-rounded duration %s', minutes => {
    const state = fresh()
    expect(rewardFocusSession(state, minutes, {}, local(2026, 10, 14))).toBe(state)
  })
  it('ignores malformed dates and non-numeric history', () => {
    const state = syncFocusHistory(fresh(), { '2026-02-30': 60, bad: 50, '2026-10-14': '25', '2026-10-13': Infinity, '2026-10-12': -10 })
    expect(state.focusDays).toEqual({})
  })
})

describe('task rewards', () => {
  it('rewards each id once across repeated check-offs, reopening, Undo and relaunch', () => {
    const state = rewardTaskCompletion(fresh(), 'task-a')
    expect(state.bonusXP).toBe(10)
    expect(state.taskClaims).toEqual(['task-a'])
    expect(rewardTaskCompletion(state, 'task-a')).toBe(state)
    const relaunched = normalizeProgression(JSON.parse(JSON.stringify(state)))
    expect(rewardTaskCompletion(relaunched, 'task-a').bonusXP).toBe(10)
    expect(rewardTaskCompletion(relaunched, 'task-b').bonusXP).toBe(20)
  })
  it('remembers old completed snapshots without awarding retroactive task bonuses', () => {
    const state = rememberCompletedTasks(fresh(), ['old', 'old', ''])
    expect(state.taskClaims).toEqual(['old'])
    expect(state.bonusXP).toBe(0)
    expect(rewardTaskCompletion(state, 'old')).toBe(state)
    expect(rememberCompletedTasks(state, [])).toBe(state)
    expect(rewardTaskCompletion(state, '').bonusXP).toBe(0)
  })
})

describe('daily check-ins', () => {
  it('rewards opening/returning once per local calendar day', () => {
    const first = recordCheckIn(fresh(), local(2026, 10, 14))
    expect(first).toMatchObject({ bonusXP: 10, checkInStreak: 1, lastCheckIn: '2026-10-14' })
    expect(recordCheckIn(first, new Date(2026, 9, 14, 23, 59))).toBe(first)
    const second = recordCheckIn(first, local(2026, 10, 15))
    expect(second).toMatchObject({ bonusXP: 21, checkInStreak: 2, bestStreak: 2 })
    expect(checkInXP(100)).toBe(20)
  })
  it('resets only the current streak after a gap, preserving best streak, XP and milestones', () => {
    let state = fresh()
    for (let day = 1; day <= 3; day++) state = recordCheckIn(state, local(2026, 10, day))
    expect(currentCheckInStreak(state, local(2026, 10, 4))).toBe(3)
    expect(currentCheckInStreak(state, local(2026, 10, 5))).toBe(0)
    const next = recordCheckIn(state, local(2026, 10, 5))
    expect(next).toMatchObject({ checkInStreak: 1, bestStreak: 3, bonusXP: state.bonusXP + 10 })
    expect(progressionMilestones(next).find(item => item.id === 'three-days')?.earned).toBe(true)
  })
  it.each([[local(2026, 3, 7), local(2026, 3, 8)], [local(2026, 10, 31), local(2026, 11, 1)], [local(2026, 12, 31), local(2027, 1, 1)]])(
    'uses calendar days across DST/month/year boundaries', (first, second) => {
      expect(recordCheckIn(recordCheckIn(fresh(), first), second).checkInStreak).toBe(2)
    },
  )
  it('does not reopen reward days after the clock moves backward', () => {
    const state = recordCheckIn(fresh(), local(2026, 10, 15))
    expect(recordCheckIn(state, local(2026, 10, 14))).toBe(state)
    expect(recordCheckIn(state, local(2026, 10, 15))).toBe(state)
    expect(recordCheckIn(state, local(2026, 10, 16)).bonusXP).toBe(21)
  })
})

describe('profile persistence and milestones', () => {
  it('sanitizes malformed saved data without admitting infinite XP or invalid avatars', () => {
    const state = normalizeProgression({ version: 1, name: ' A very long name '.repeat(10), avatar: 'unknown', focusDays: { '2026-02-30': 99 },
      bonusXP: Infinity, taskClaims: ['a', 'a', 1, '', 'b'], lastCheckIn: 'bad', checkInStreak: 100, bestStreak: -1 })
    expect(state).toMatchObject({ avatar: 'leaf', focusDays: {}, bonusXP: 0, taskClaims: ['a', 'b'], lastCheckIn: null, checkInStreak: 0, bestStreak: 0 })
    expect(state.name.length).toBeLessThanOrEqual(32)
    expect(normalizeProgression({ version: 99, bonusXP: 10000 })).toEqual(fresh())
    expect(normalizeProgression(state)).toBe(state)
  })
  it('edits profile details without changing XP or task and study credit', () => {
    const state = rewardTaskCompletion(syncFocusHistory(fresh(), { '2026-10-14': 60 }), 'a')
    const next = editProfile(state, '  MOA  ', 'book')
    expect(next).toMatchObject({ name: 'MOA', avatar: 'book', bonusXP: 10, taskClaims: ['a'] })
    expect(progressionLevel(next)).toEqual(progressionLevel(state))
    expect(next.focusDays).toEqual(state.focusDays)
    expect(state.name).toBe('')
  })
  it('earns focus and task milestones from historical credit and keeps them through pruning', () => {
    const state = rewardTaskCompletion(syncFocusHistory(fresh(), { '2025-01-01': 600 }), 'a')
    const earned = progressionMilestones(syncFocusHistory(state, {})).filter(item => item.earned).map(item => item.id)
    expect(earned).toEqual(['first-focus', 'first-task', 'one-hour', 'ten-hours'])
  })
})
