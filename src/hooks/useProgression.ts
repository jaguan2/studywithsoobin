import { useCallback, useEffect, useState } from 'react'
import {
  editProfile, normalizeProgression, PROGRESSION_KEY, recordCheckIn,
  rememberCompletedTasks, rewardFocusSession, rewardTaskCompletion, syncFocusHistory,
  type ProfileAvatar, type Progression,
} from '../lib/progression'
import { createProgressionSession, type ProgressionUpdate } from '../lib/progressionSession'
import { getFocusDays, localDayKey } from '../lib/stats'
import { storageGetJson, storageSetJson } from '../lib/storage'
import { normalizePlannedTask } from '../lib/taskPlanning'

function readProgression(): Progression {
  // Storage access errors must differ from an absent profile: a failed read
  // must not replace a previously readable profile with an empty snapshot.
  const raw = localStorage.getItem(PROGRESSION_KEY)
  try { return normalizeProgression(raw === null ? null : JSON.parse(raw)) }
  catch { return normalizeProgression(null) }
}

function createSession() {
  const raw = storageGetJson<unknown>(PROGRESSION_KEY, null)
  const migrating = !raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1
  const tasks = storageGetJson<unknown>('sws.tasks', [])
  const completedIds = migrating && Array.isArray(tasks) ? tasks.flatMap(value => {
    const task = normalizePlannedTask(value)
    return task?.done ? [task.id] : []
  }) : []
  const history = getFocusDays()
  return createProgressionSession({
    read: readProgression,
    write: next => storageSetJson(PROGRESSION_KEY, next),
    lock: operation => {
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request(PROGRESSION_KEY, operation)
      }
      // Older browsers still re-read immediately before each synchronous write.
      return Promise.resolve(operation())
    },
    bootstrap: state => rememberCompletedTasks(syncFocusHistory(state, history), completedIds),
  })
}

export function useProgression(onNotice: (message: string) => void) {
  const [session] = useState(createSession)
  const [progression, setProgression] = useState(session.getSnapshot)
  const commit = useCallback(async (update: ProgressionUpdate, activity?: string): Promise<boolean> => {
    const result = await session.update(update, activity)
    if (!result.saved) {
      onNotice('Your progress could not be saved. It is kept for this session; check that browser storage is available.')
    } else if (result.earned > 0) {
      onNotice(result.leveledUp
        ? `Level ${result.level}! +${result.earned} XP · ${result.activity}`
        : `+${result.earned} XP · ${result.activity}`)
    }
    return result.saved
  }, [session, onNotice])

  const recordStudy = useCallback((minutes: number) => {
    // Stats already include this block. Capture the intended high-water marks,
    // so replay after a failed save or another tab's backfill cannot add it twice.
    const credited = rewardFocusSession(session.getSnapshot(), minutes, getFocusDays())
    void commit(state => syncFocusHistory(state, credited.focusDays), 'Focus session complete')
  }, [session, commit])
  const completeTask = useCallback((id: string) => {
    void commit(state => rewardTaskCompletion(state, id), 'Task complete')
  }, [commit])
  const updateProfile = useCallback((name: string, avatar: ProfileAvatar) =>
    commit(state => editProfile(state, name, avatar)), [commit])
  const checkIn = useCallback(() => {
    const now = new Date()
    const snapshot = session.getSnapshot()
    if (snapshot.lastCheckIn && snapshot.lastCheckIn >= localDayKey(now)) return
    void commit(state => recordCheckIn(state, now), 'Daily check-in')
  }, [session, commit])

  useEffect(() => {
    const unsubscribe = session.subscribe(setProgression)
    const now = new Date()
    void commit(state => recordCheckIn(state, now))
    const returned = () => {
      if (document.hidden) return
      const history = getFocusDays()
      void commit(state => syncFocusHistory(state, history))
      checkIn()
    }
    const stored = (event: StorageEvent) => {
      if (event.key === PROGRESSION_KEY || event.key === null) void session.refresh()
    }
    window.addEventListener('storage', stored)
    window.addEventListener('focus', returned)
    document.addEventListener('visibilitychange', returned)
    window.addEventListener('pointerdown', checkIn, { passive: true })
    window.addEventListener('keydown', checkIn)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', stored)
      window.removeEventListener('focus', returned)
      document.removeEventListener('visibilitychange', returned)
      window.removeEventListener('pointerdown', checkIn)
      window.removeEventListener('keydown', checkIn)
    }
  }, [session, commit, checkIn])

  return { progression, recordStudy, completeTask, updateProfile }
}
