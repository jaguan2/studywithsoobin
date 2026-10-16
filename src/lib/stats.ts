// Focus-time accounting: minutes per local day plus a streak, stored as one
// small JSON object. Day keys are LOCAL dates — `toISOString` would shift
// evening sessions into tomorrow east of UTC (rule carried from TaskNook's
// stats.js).

import { storageGet, storageGetJson, storageSet, storageSetJson } from './storage'

const KEY = 'sws.stats'
const GOAL_KEY = 'sws.focusGoal'
const KEEP_DAYS = 400
export const DEFAULT_FOCUS_GOAL = 120

export type DayLog = Record<string, number> // 'YYYY-MM-DD' (local) -> minutes

/** Local calendar date as YYYY-MM-DD ('en-CA' formats exactly that way). */
export function localDayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

/** Calendar ordinal, independent of local DST and rejecting rolled-over dates. */
export function calendarDayNumber(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? Math.floor(date.getTime() / 86_400_000) : null
}

function loadDays(): DayLog {
  const raw = storageGetJson<unknown>(KEY, {})
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const days: DayLog = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (calendarDayNumber(k) !== null && typeof v === 'number' && Number.isFinite(v) && v > 0) days[k] = v
  }
  return days
}

/** A snapshot for progression backfill; progression keeps its own lifetime ledger. */
export function getFocusDays(): DayLog {
  return loadDays()
}

export function recordFocusMinutes(minutes: number, now = new Date()) {
  if (!Number.isFinite(minutes) || minutes <= 0) return
  const days = loadDays()
  const key = localDayKey(now)
  days[key] = (days[key] ?? 0) + Math.round(minutes)
  // prune ancient entries so the object never grows unbounded
  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS)
  const cutoff = localDayKey(cutoffDate)
  for (const k of Object.keys(days)) if (k < cutoff) delete days[k]
  storageSetJson(KEY, days)
}

export function getTodayMinutes(now = new Date()): number {
  return loadDays()[localDayKey(now)] ?? 0
}

/** Consecutive days with any focus, counting back from today — or from
 *  yesterday, so the streak isn't shown as broken before today's first
 *  session. Pure core exported for tests. */
export function computeStreak(days: DayLog, todayKey: string): number {
  let cursor = calendarDayNumber(todayKey)
  if (cursor === null) return 0
  const hasFocus = (day: number) => {
    const minutes = days[new Date(day * 86_400_000).toISOString().slice(0, 10)]
    return Number.isFinite(minutes) && minutes > 0
  }
  if (!hasFocus(cursor)) cursor -= 1 // start from yesterday
  let streak = 0
  while (hasFocus(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}

export function getStreakDays(now = new Date()): number {
  return computeStreak(loadDays(), localDayKey(now))
}

export function clampFocusGoal(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number)
    ? Math.min(12 * 60, Math.max(15, Math.round(number)))
    : DEFAULT_FOCUS_GOAL
}

export function getFocusGoal(): number {
  const stored = storageGet(GOAL_KEY)
  return stored === null ? DEFAULT_FOCUS_GOAL : clampFocusGoal(stored)
}

export function saveFocusGoal(minutes: number): void {
  storageSet(GOAL_KEY, String(clampFocusGoal(minutes)))
}

/** 85 → "1h 25m", 45 → "45m". */
export function formatFocusMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
