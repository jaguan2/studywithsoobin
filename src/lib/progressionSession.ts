import { normalizeProgression, progressionLevel, type Progression } from './progression'

export type ProgressionUpdate = (state: Progression) => Progression
export type ProgressionLock = <T>(operation: () => T) => Promise<T>
interface PendingUpdate { update: ProgressionUpdate; activity?: string }
interface SaveResult { saved: boolean; earned: number; level: number; leveledUp: boolean; activity?: string }

/** One queue per document; the browser lock serializes read/modify/write across tabs. */
export function createProgressionSession(options: {
  read: () => Progression
  write: (state: Progression) => boolean
  lock: ProgressionLock
  bootstrap?: ProgressionUpdate
}) {
  let persisted: Progression
  try { persisted = options.read() } catch { persisted = normalizeProgression(null) }
  const pending: PendingUpdate[] = options.bootstrap ? [{ update: options.bootstrap }] : []
  let current = pending.reduce((state, action) => action.update(state), persisted)
  let queue = Promise.resolve()
  const listeners = new Set<(state: Progression) => void>()
  const publish = (next: Progression) => {
    current = next
    for (const listener of listeners) listener(next)
  }
  let storageReadable = true
  const latest = () => {
    try { persisted = options.read(); storageReadable = true }
    catch { storageReadable = false } // never overwrite unseen remote progress
    return persisted
  }
  const schedule = <T,>(operation: () => T): Promise<T> => {
    const result = queue.then(() => options.lock(operation))
    queue = result.then(() => {}, () => {})
    return result
  }
  const flush = (): SaveResult => {
    let next = latest()
    const before = progressionLevel(next)
    let earned = 0
    let activity: string | undefined
    for (const action of pending) {
      const previousXP = progressionLevel(next).totalXP
      next = action.update(next)
      if (action.activity) {
        const gain = progressionLevel(next).totalXP - previousXP
        if (gain > 0) { earned += gain; activity = action.activity }
      }
    }
    let saved = false
    try { if (storageReadable) saved = options.write(next) } catch { /* session-only until a later retry */ }
    if (saved) { persisted = next; pending.length = 0 }
    publish(next)
    const after = progressionLevel(next)
    return { saved, earned, level: after.level, leveledUp: after.level > before.level, activity }
  }
  return {
    getSnapshot: () => current,
    subscribe(listener: (state: Progression) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update(update: ProgressionUpdate, activity?: string): Promise<SaveResult> {
      pending.push({ update, activity })
      publish(update(current))
      return schedule(flush).catch(() => ({
        saved: false, earned: 0, level: progressionLevel(current).level, leveledUp: false,
      }))
    },
    refresh(): Promise<void> {
      // Storage notifications only read: writing here would cause feedback between tabs.
      return schedule(() => { publish(pending.reduce((state, action) => action.update(state), latest())) })
        .catch(() => {})
    },
  }
}
