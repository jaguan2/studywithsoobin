import { useEffect, useRef } from 'react'

// Presence-based break nudge (idea from TaskNook's lib/breaks.js, simplified:
// presence = tab visible + input in the last few minutes). After two unbroken
// hours it fires once and restarts the clock; five continuous minutes away
// counts as the break taken.

const NUDGE_AFTER_MS = 120 * 60_000
const AWAY_RESETS_MS = 5 * 60_000
const CHECK_MS = 60_000

export function useBreakNudge(onNudge: (message: string) => void) {
  const onNudgeRef = useRef(onNudge)
  onNudgeRef.current = onNudge

  useEffect(() => {
    let streakStart = Date.now()
    let lastActive = Date.now()

    const activity = () => {
      const now = Date.now()
      // Coming back from ≥5 minutes away — that was the break.
      if (now - lastActive >= AWAY_RESETS_MS) streakStart = now
      lastActive = now
    }

    const check = () => {
      const now = Date.now()
      if (document.hidden || now - lastActive >= AWAY_RESETS_MS) return
      if (now - streakStart >= NUDGE_AFTER_MS) {
        onNudgeRef.current("You've been at it for two hours — worth a stretch ☕")
        streakStart = now
      }
    }

    const id = window.setInterval(check, CHECK_MS)
    window.addEventListener('pointermove', activity)
    window.addEventListener('keydown', activity)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pointermove', activity)
      window.removeEventListener('keydown', activity)
    }
  }, [])
}
