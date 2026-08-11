import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureNotifyPermission, timerCue } from '../lib/cues'
import { recordFocusMinutes } from '../lib/stats'

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
  /** Add/remove time mid-session (e.g. ±60s) without stopping the clock. */
  nudge: (deltaSeconds: number) => void
  startPomodoro: (config: PomodoroConfig) => void
  stopPomodoro: () => void
  /** During a pomodoro break: jump straight into the next focus round. */
  skipBreak: () => void
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
  // Counting down by decrementing on a 1s interval drifts badly: browsers
  // throttle background-tab timers to as little as one tick per minute, and
  // the study-session use case is precisely "this tab is in the background".
  // So the source of truth is an absolute deadline; the interval only
  // refreshes the display from it.
  const endAtRef = useRef<number | null>(null)
  const secondsLeftRef = useRef(secondsLeft)
  secondsLeftRef.current = secondsLeft
  const pomodoroRef = useRef(pomodoro)
  pomodoroRef.current = pomodoro
  const durationRef = useRef(durationSeconds)
  durationRef.current = durationSeconds

  useEffect(() => {
    if (!isRunning) return
    // (Re)arm the deadline from whatever is on the clock right now. Starting
    // a finished plain timer restarts it from its duration rather than
    // instantly re-firing the completion cue.
    let base = secondsLeftRef.current
    if (base <= 0 && !pomodoroRef.current) {
      base = durationRef.current
      setSecondsLeft(base)
    }
    endAtRef.current = Date.now() + base * 1000
    const tick = () => {
      if (endAtRef.current === null) return
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        setIsRunning(false)
        // Pomodoro phase edges cue (and log focus) from the advancement
        // effect below; a plain timer has no other place to announce itself.
        if (!pomodoroRef.current) {
          timerCue("Time's up", 'Your focus timer finished.')
          recordFocusMinutes(durationRef.current / 60)
        }
      }
    }
    // 250ms so a throttled-then-restored tab snaps to the right time quickly;
    // setState with an unchanged value skips the re-render, so the visible
    // update rate is still once a second.
    const id = window.setInterval(tick, 250)
    const onVisible = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      endAtRef.current = null
    }
  }, [isRunning])

  // Pomodoro phase advancement: when a focus/break block hits zero, roll into
  // the next block (or finish after the last focus round).
  useEffect(() => {
    if (!pomodoro || pomodoro.completed || secondsLeft > 0) return
    if (pomodoro.phase === 'focus' && pomodoro.round >= pomodoro.rounds) {
      setPomodoro({ ...pomodoro, completed: true })
      timerCue('All rounds done! 🎉', `${pomodoro.rounds} focus rounds complete — great work.`)
      recordFocusMinutes(pomodoro.focusMinutes)
      return
    }
    const nextPhase = pomodoro.phase === 'focus' ? 'break' : 'focus'
    const nextRound = pomodoro.phase === 'break' ? pomodoro.round + 1 : pomodoro.round
    setPomodoro({ ...pomodoro, phase: nextPhase, round: nextRound })
    setSecondsLeft(
      (nextPhase === 'focus' ? pomodoro.focusMinutes : pomodoro.breakMinutes) * 60,
    )
    setIsRunning(true)
    if (nextPhase === 'break') {
      timerCue('Focus round done', `Take a ${pomodoro.breakMinutes} minute break.`)
      recordFocusMinutes(pomodoro.focusMinutes)
    } else {
      timerCue('Break over', `Round ${nextRound} — ${pomodoro.focusMinutes} minutes of focus.`)
    }
  }, [secondsLeft, pomodoro])

  const toggle = useCallback(() => {
    setIsRunning((r) => {
      if (!r) ensureNotifyPermission()
      return !r
    })
  }, [])
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

  // The deadline is the source of truth while running, so a nudge adjusts it
  // directly; the display refreshes from it. Over-subtracting completes the
  // block naturally on the next tick.
  const nudge = useCallback((deltaSeconds: number) => {
    if (endAtRef.current !== null) {
      endAtRef.current = Math.max(Date.now(), endAtRef.current + deltaSeconds * 1000)
      setSecondsLeft(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
    } else {
      setSecondsLeft((prev) => Math.max(0, prev + deltaSeconds))
    }
  }, [])

  const skipBreak = useCallback(() => {
    const p = pomodoroRef.current
    if (!p || p.completed || p.phase !== 'break') return
    setPomodoro({ ...p, phase: 'focus', round: p.round + 1 })
    setSecondsLeft(p.focusMinutes * 60)
    // Already running → the isRunning effect won't re-arm, so re-arm here.
    if (endAtRef.current !== null) endAtRef.current = Date.now() + p.focusMinutes * 60_000
    setIsRunning(true)
  }, [])

  const startPomodoro = useCallback((config: PomodoroConfig) => {
    const focusMinutes = Math.min(Math.max(Math.round(config.focusMinutes), 1), 180)
    const breakMinutes = Math.min(Math.max(Math.round(config.breakMinutes), 1), 60)
    const rounds = Math.min(Math.max(Math.round(config.rounds), 1), 12)
    ensureNotifyPermission()
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
    nudge,
    startPomodoro,
    stopPomodoro,
    skipBreak,
  }
}
