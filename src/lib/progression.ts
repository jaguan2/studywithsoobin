import { calendarDayNumber as dayNumber, localDayKey, type DayLog } from './stats'

export const PROGRESSION_KEY = 'sws.progression'
export const XP_RULES = { studyMinute: 1, task: 10, checkIn: 10, streakMaxBonus: 10 } as const
export const PROFILE_AVATARS = ['leaf', 'book', 'moon', 'coffee'] as const
export type ProfileAvatar = typeof PROFILE_AVATARS[number]
const MAX_XP = 1_000_000_000
const whole = (value: unknown, max = MAX_XP): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0

export interface Progression {
  version: 1
  name: string
  avatar: ProfileAvatar
  /** Per-day high-water marks retain lifetime study credit after stats prune old days. */
  focusDays: DayLog
  bonusXP: number
  /** Lifetime claims survive task reopening, deletion and Undo. */
  taskClaims: string[]
  lastCheckIn: string | null
  checkInStreak: number
  bestStreak: number
}

function normalizeDays(value: unknown): DayLog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const days: DayLog = {}
  for (const [day, minutes] of Object.entries(value)) {
    if (dayNumber(day) !== null && whole(minutes) > 0) days[day] = whole(minutes)
  }
  return days
}
const validTaskId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100
export function normalizeProgression(value: unknown): Progression {
  const source = value && typeof value === 'object' && (value as { version?: unknown }).version === 1
    ? value as Partial<Progression> : {}
  const lastCheckIn = dayNumber(source.lastCheckIn) !== null ? source.lastCheckIn! : null
  const checkInStreak = lastCheckIn ? whole(source.checkInStreak, 36_500) : 0
  const next: Progression = {
    version: 1,
    name: typeof source.name === 'string' ? source.name.trim().slice(0, 32) : '',
    avatar: PROFILE_AVATARS.includes(source.avatar!) ? source.avatar! : 'leaf',
    focusDays: normalizeDays(source.focusDays),
    bonusXP: whole(source.bonusXP),
    taskClaims: Array.isArray(source.taskClaims) ? [...new Set(source.taskClaims.filter(validTaskId))] : [],
    lastCheckIn, checkInStreak,
    bestStreak: Math.max(checkInStreak, whole(source.bestStreak, 36_500)),
  }
  return JSON.stringify(next) === JSON.stringify(value) ? value as Progression : next
}

/** TaskNook's curve: 100 XP, then 150, 200, 250 ... */
export const xpForNextLevel = (level: number): number => 100 + 50 * (Math.max(1, whole(level)) - 1)
export const xpBeforeLevel = (level: number): number => {
  const number = Math.max(1, whole(level))
  return 25 * (number - 1) * (number + 2)
}
export function levelForXP(value: number) {
  const totalXP = whole(value, MAX_XP * 2)
  const level = Math.floor((Math.sqrt(9 + 4 * totalXP / 25) - 1) / 2)
  const earned = totalXP - xpBeforeLevel(level)
  const required = xpForNextLevel(level)
  return { level, totalXP, earned, required, remaining: required - earned }
}
export function totalFocusMinutes(state: Progression): number {
  return Math.min(MAX_XP, Object.values(state.focusDays).reduce((sum, minutes) => sum + minutes, 0))
}
export function progressionLevel(state: Progression) {
  return levelForXP(totalFocusMinutes(state) * XP_RULES.studyMinute + state.bonusXP)
}

/** Backfill available history once; stale reads and pruning never remove earned XP. */
export function syncFocusHistory(saved: unknown, history: unknown): Progression {
  const state = normalizeProgression(saved)
  const days = normalizeDays(history)
  let next = state
  for (const [day, minutes] of Object.entries(days)) {
    if (minutes <= (state.focusDays[day] ?? 0)) continue
    if (next === state) next = { ...state, focusDays: { ...state.focusDays } }
    next.focusDays[day] = minutes
  }
  return next
}

/** Completion is an explicit action. Credit it even if saving ordinary stats failed. */
export function rewardFocusSession(saved: unknown, minutes: number, history: unknown, now = new Date()): Progression {
  const state = normalizeProgression(saved)
  const rounded = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0
  if (rounded <= 0) return state
  const today = localDayKey(now)
  const days = normalizeDays(history)
  const next = syncFocusHistory(state, { ...days, [today]: 0 })
  return { ...next, focusDays: { ...next.focusDays, [today]: Math.min(MAX_XP,
    Math.max((state.focusDays[today] ?? 0) + rounded, days[today] ?? 0)) } }
}

/** Existing completed snapshots establish eligibility without retroactive task bonuses. */
export function rememberCompletedTasks(saved: unknown, ids: string[]): Progression {
  const state = normalizeProgression(saved)
  const taskClaims = [...new Set([...state.taskClaims, ...ids.filter(validTaskId)])]
  return taskClaims.length === state.taskClaims.length ? state : { ...state, taskClaims }
}
export function rewardTaskCompletion(saved: unknown, id: string): Progression {
  const state = normalizeProgression(saved)
  if (!validTaskId(id) || state.taskClaims.includes(id)) return state
  return { ...state, taskClaims: [...state.taskClaims, id], bonusXP: whole(state.bonusXP + XP_RULES.task) }
}

export const checkInXP = (streak: number): number => XP_RULES.checkIn + Math.min(XP_RULES.streakMaxBonus, Math.max(0, whole(streak) - 1))
export function recordCheckIn(saved: unknown, now = new Date()): Progression {
  const state = normalizeProgression(saved)
  const today = localDayKey(now)
  // A corrected clock cannot reopen a previously credited calendar day.
  if (state.lastCheckIn && state.lastCheckIn >= today) return state
  const previous = dayNumber(state.lastCheckIn)
  const consecutive = previous !== null && dayNumber(today)! - previous === 1
  const checkInStreak = consecutive ? Math.min(36_500, state.checkInStreak + 1) : 1
  return { ...state, lastCheckIn: today, checkInStreak, bestStreak: Math.max(state.bestStreak, checkInStreak),
    bonusXP: whole(state.bonusXP + checkInXP(checkInStreak)) }
}
export function currentCheckInStreak(state: Progression, now = new Date()): number {
  const previous = dayNumber(state.lastCheckIn)
  const gap = previous === null ? Infinity : dayNumber(localDayKey(now))! - previous
  return gap >= 0 && gap <= 1 ? state.checkInStreak : 0
}
export function editProfile(saved: unknown, name: string, avatar: ProfileAvatar): Progression {
  const state = normalizeProgression(saved)
  const nextName = name.trim().slice(0, 32)
  const nextAvatar = PROFILE_AVATARS.includes(avatar) ? avatar : state.avatar
  return nextName === state.name && nextAvatar === state.avatar ? state : { ...state, name: nextName, avatar: nextAvatar }
}

export function progressionMilestones(state: Progression) {
  const minutes = totalFocusMinutes(state)
  const tasks = state.taskClaims.length
  return [
    { id: 'first-focus', title: 'First focus', description: 'Save your first focus minute', earned: minutes >= 1, current: minutes, target: 1 },
    { id: 'first-task', title: 'First step', description: 'Complete your first task', earned: tasks >= 1, current: tasks, target: 1 },
    { id: 'one-hour', title: 'Finding focus', description: 'Study for one hour in total', earned: minutes >= 60, current: minutes, target: 60 },
    { id: 'ten-tasks', title: 'Getting things done', description: 'Complete 10 different tasks', earned: tasks >= 10, current: tasks, target: 10 },
    { id: 'three-days', title: 'A little rhythm', description: 'Check in 3 days in a row', earned: state.bestStreak >= 3, current: state.bestStreak, target: 3 },
    { id: 'ten-hours', title: 'In your element', description: 'Study for 10 hours in total', earned: minutes >= 600, current: minutes, target: 600 },
    { id: 'seven-days', title: 'A steady week', description: 'Check in 7 days in a row', earned: state.bestStreak >= 7, current: state.bestStreak, target: 7 },
    { id: 'fifty-tasks', title: 'Making it happen', description: 'Complete 50 different tasks', earned: tasks >= 50, current: tasks, target: 50 },
  ]
}
