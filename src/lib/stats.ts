// Focus-time accounting: minutes per local day plus a streak, stored as one
// small JSON object. Day keys are LOCAL dates — `toISOString` would shift
// evening sessions into tomorrow east of UTC (rule carried from TaskNook's
// stats.js).

import { storageGetJson, storageSetJson } from './storage'

const KEY = 'sws.stats'
const KEEP_DAYS = 400

export type DayLog = Record<string, number> // 'YYYY-MM-DD' (local) -> minutes

/** Local calendar date as YYYY-MM-DD ('en-CA' formats exactly that way). */
export function localDayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

function loadDays(): DayLog {
  const raw = storageGetJson<unknown>(KEY, {})
  if (typeof raw !== 'object' || raw === null) return {}
  const days: DayLog = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && v > 0) days[k] = v
  }
  return days
}

export function recordFocusMinutes(minutes: number, now = new Date()) {
  if (!Number.isFinite(minutes) || minutes <= 0) return
  const days = loadDays()
  const key = localDayKey(now)
  days[key] = (days[key] ?? 0) + Math.round(minutes)
  // prune ancient entries so the object never grows unbounded
  const cutoff = localDayKey(new Date(now.getTime() - KEEP_DAYS * 86400_000))
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
  const dated = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  let cursor = dated(todayKey)
  if (!days[todayKey]) cursor = new Date(cursor.getTime() - 86400_000) // start from yesterday
  let streak = 0
  while (days[localDayKey(cursor)]) {
    streak += 1
    cursor = new Date(cursor.getTime() - 86400_000)
  }
  return streak
}

export function getStreakDays(now = new Date()): number {
  return computeStreak(loadDays(), localDayKey(now))
}

/** 85 → "1h 25m", 45 → "45m". */
export function formatFocusMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
