import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_SECONDS = 10
const MAX_SECONDS = 12 * 60 * 60

export interface PomodoroConfig {
  focusMinutes: number
  breakMinutes: number
  rounds: number
}

export interface PomodoroState extends PomodoroConfig {
  phase: 'focus' | 'break'
  round: number
  completed: boolean
}

export interface TimerApi {
  label: string
  isRunning: boolean
  durationSeconds: number
  pomodoro: PomodoroState | null
  toggle: () => void
  pause: () => void
  reset: () => void
  setDurationSeconds: (seconds: number) => void
  startPomodoro: (config: PomodoroConfig) => void
  stopPomodoro: () => void
}

export function formatTime(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Accepts "45" (minutes), "25:30" (mm:ss) or "1:30:00" (h:mm:ss).
 *  Returns seconds clamped to a sane range, or null if unparseable. */
export function parseTimeInput(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  let seconds: number
  if (/^\d+$/.test(t)) {
    seconds = Number(t) * 60
  } else {
    const parts = t.split(':')
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
    const n = parts.map(Number)
    seconds = parts.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2]
  }
  return Math.min(Math.max(seconds, MIN_SECONDS), MAX_SECONDS)
}

export function useTimer(initialMinutes = 25): TimerApi {
  const [durationSeconds, setDuration] = useState(initialMinutes * 60)
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [pomodoro, setPomodoro] = useState<PomodoroState | null>(null)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(intervalRef.current)
  }, [isRunning])

  // Pomodoro phase advancement: when a focus/break block hits zero, roll into
  // the next block (or finish after the last focus round).
  useEffect(() => {
    if (!pomodoro || pomodoro.completed || secondsLeft > 0) return
    if (pomodoro.phase === 'focus' && pomodoro.round >= pomodoro.rounds) {
      setPomodoro({ ...pomodoro, completed: true })
      return
    }
    const nextPhase = pomodoro.phase === 'focus' ? 'break' : 'focus'
    const nextRound = pomodoro.phase === 'break' ? pomodoro.round + 1 : pomodoro.round
    setPomodoro({ ...pomodoro, phase: nextPhase, round: nextRound })
    setSecondsLeft(
      (nextPhase === 'focus' ? pomodoro.focusMinutes : pomodoro.breakMinutes) * 60,
    )
    setIsRunning(true)
  }, [secondsLeft, pomodoro])

  const toggle = useCallback(() => setIsRunning((r) => !r), [])
  const pause = useCallback(() => setIsRunning(false), [])

  const reset = useCallback(() => {
    setIsRunning(false)
    if (pomodoro) {
      setPomodoro({ ...pomodoro, phase: 'focus', round: 1, completed: false })
      setSecondsLeft(pomodoro.focusMinutes * 60)
    } else {
      setSecondsLeft(durationSeconds)
    }
  }, [durationSeconds, pomodoro])

  const setDurationSeconds = useCallback((seconds: number) => {
    const clamped = Math.min(Math.max(seconds, MIN_SECONDS), MAX_SECONDS)
    setPomodoro(null)
    setDuration(clamped)
    setSecondsLeft(clamped)
    setIsRunning(false)
  }, [])

  const startPomodoro = useCallback((config: PomodoroConfig) => {
    const focusMinutes = Math.min(Math.max(Math.round(config.focusMinutes), 1), 180)
    const breakMinutes = Math.min(Math.max(Math.round(config.breakMinutes), 1), 60)
    const rounds = Math.min(Math.max(Math.round(config.rounds), 1), 12)
    setPomodoro({ focusMinutes, breakMinutes, rounds, phase: 'focus', round: 1, completed: false })
    setSecondsLeft(focusMinutes * 60)
    setIsRunning(true)
  }, [])

  const stopPomodoro = useCallback(() => {
    setPomodoro(null)
    setIsRunning(false)
    setSecondsLeft(durationSeconds)
  }, [durationSeconds])

  return {
    label: formatTime(secondsLeft),
    isRunning,
    durationSeconds,
    pomodoro,
    toggle,
    pause,
    reset,
    setDurationSeconds,
    startPomodoro,
    stopPomodoro,
  }
}
