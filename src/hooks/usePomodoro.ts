import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerMode = 'pomodoro' | 'short' | 'long'

const DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

export function usePomodoro() {
  const [mode, setMode] = useState<TimerMode>('pomodoro')
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
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

  const switchMode = useCallback((next: TimerMode) => {
    setMode(next)
    setIsRunning(false)
    setSecondsLeft(DURATIONS[next])
  }, [])

  const toggleRunning = useCallback(() => setIsRunning((r) => !r), [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setSecondsLeft(DURATIONS[mode])
  }, [mode])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { mode, switchMode, isRunning, toggleRunning, reset, label }
}
