import { useCallback, useEffect, useRef, useState } from 'react'
import {
  editProfile, normalizeProgression, PROGRESSION_KEY, progressionLevel, recordCheckIn,
  rememberCompletedTasks, rewardFocusSession, rewardTaskCompletion, syncFocusHistory,
  type ProfileAvatar, type Progression,
} from '../lib/progression'
import { getFocusDays, localDayKey } from '../lib/stats'
import { storageGetJson, storageSetJson } from '../lib/storage'
import { normalizePlannedTask } from '../lib/taskPlanning'

function loadProgression(): Progression {
  const tasks = storageGetJson<unknown>('sws.tasks', [])
  const completedIds = Array.isArray(tasks) ? tasks.flatMap(value => {
    const task = normalizePlannedTask(value)
    return task?.done ? [task.id] : []
  }) : []
  return rememberCompletedTasks(syncFocusHistory(
    normalizeProgression(storageGetJson<unknown>(PROGRESSION_KEY, null)), getFocusDays()), completedIds)
}

export function useProgression(onNotice: (message: string) => void) {
  const [progression, setProgression] = useState(loadProgression)
  const progressRef = useRef(progression)

  // Synchronous refs make repeated event callbacks idempotent. Persistence stays
  // outside React updaters, which StrictMode may evaluate more than once.
  const commit = useCallback((next: Progression, activity?: string, forceSave = false): boolean => {
    const previous = progressRef.current
    if (next === previous && !forceSave) return true
    progressRef.current = next
    setProgression(next)
    const saved = storageSetJson(PROGRESSION_KEY, next)
    if (!saved) {
      onNotice('Your progress could not be saved. It is kept for this session; check that browser storage is available.')
      return false
    }
    if (activity) {
      const before = progressionLevel(previous)
      const after = progressionLevel(next)
      const earned = after.totalXP - before.totalXP
      if (earned > 0) onNotice(after.level > before.level
        ? `Level ${after.level}! +${earned} XP · ${activity}`
        : `+${earned} XP · ${activity}`)
    }
    return true
  }, [onNotice])

  const recordStudy = useCallback((minutes: number) => {
    commit(rewardFocusSession(progressRef.current, minutes, getFocusDays()), 'Focus session complete')
  }, [commit])
  const completeTask = useCallback((id: string) => {
    commit(rewardTaskCompletion(progressRef.current, id), 'Task complete')
  }, [commit])
  const updateProfile = useCallback((name: string, avatar: ProfileAvatar) =>
    commit(editProfile(progressRef.current, name, avatar), undefined, true), [commit])

  const checkIn = useCallback(() => {
    if (progressRef.current.lastCheckIn && progressRef.current.lastCheckIn >= localDayKey()) return
    commit(recordCheckIn(progressRef.current), 'Daily check-in')
  }, [commit])

  useEffect(() => {
    commit(recordCheckIn(progressRef.current), undefined, true)
    const returned = () => {
      if (document.hidden) return
      commit(syncFocusHistory(progressRef.current, getFocusDays()))
      checkIn()
    }
    // A real open, return or gesture counts. An idle window crossing midnight
    // does not reward check-ins or extend a streak on its own.
    window.addEventListener('focus', returned)
    document.addEventListener('visibilitychange', returned)
    window.addEventListener('pointerdown', checkIn, { passive: true })
    window.addEventListener('keydown', checkIn)
    return () => {
      window.removeEventListener('focus', returned)
      document.removeEventListener('visibilitychange', returned)
      window.removeEventListener('pointerdown', checkIn)
      window.removeEventListener('keydown', checkIn)
    }
  }, [commit, checkIn])

  return { progression, recordStudy, completeTask, updateProfile }
}
