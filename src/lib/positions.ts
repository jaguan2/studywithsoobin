// Per-video resume points, so a 1–2 hour vlog picks up where it left off.
// One small JSON map videoId -> seconds; positions near the start or end are
// dropped (resuming at 0:12 or during the outro is worse than starting over).

import { storageGetJson, storageSetJson } from './storage'

const KEY = 'sws.positions'
const MIN_SAVE_SECONDS = 30
const END_GUARD_SECONDS = 60

function load(): Record<string, number> {
  const raw = storageGetJson<unknown>(KEY, {})
  if (typeof raw !== 'object' || raw === null) return {}
  const map: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) map[k] = v
  }
  return map
}

export function getSavedPosition(videoId: string): number | null {
  return load()[videoId] ?? null
}

/** Save (or clear, near the edges) the current position for a video. */
export function savePosition(videoId: string, current: number, duration: number) {
  const map = load()
  if (current > MIN_SAVE_SECONDS && duration - current > END_GUARD_SECONDS) {
    map[videoId] = Math.floor(current)
  } else {
    delete map[videoId]
  }
  storageSetJson(KEY, map)
}
