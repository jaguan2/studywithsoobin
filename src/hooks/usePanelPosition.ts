import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import { storageGetJson, storageSetJson } from '../lib/storage'

// Keep at least this much of a panel's left/top edge reachable, so its drag
// handle can always be grabbed back.
const VISIBLE_EDGE = 72
const MARGIN = 4
// Panels are at least this wide (TimerCard's minWidth); used to bound how far
// past the left edge a panel may sit without having to measure it.
const MIN_PANEL_WIDTH = 272

interface BasePosition {
  left: number
  top: number
}

function clampOffset(dx: number, dy: number, base: BasePosition): [number, number] {
  const left = Math.min(
    Math.max(base.left + dx, MARGIN - (MIN_PANEL_WIDTH - VISIBLE_EDGE)),
    window.innerWidth - VISIBLE_EDGE,
  )
  const top = Math.min(Math.max(base.top + dy, MARGIN), window.innerHeight - 48)
  return [left - base.left, top - base.top]
}

/** Persisted drag offset for a floating panel. The motion values are handed
 *  to framer-motion via `style={{ x, y }}` so drags update them directly;
 *  `savePosition` goes on `onDragEnd`. Offsets are clamped on restore and on
 *  window resize — `dragConstraints` only applies *during* a drag, so a
 *  window shrink could otherwise strand a panel off screen. */
export function usePanelPosition(storageKey: string, base: BasePosition) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(() => {
    const stored = storageGetJson<{ x?: unknown; y?: unknown }>(storageKey, {})
    if (typeof stored.x === 'number' && typeof stored.y === 'number') {
      const [cx, cy] = clampOffset(stored.x, stored.y, base)
      x.set(cx)
      y.set(cy)
    }
    const onResize = () => {
      const [cx, cy] = clampOffset(x.get(), y.get(), base)
      x.set(cx)
      y.set(cy)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // storageKey and base are per-panel constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const savePosition = () => {
    const [cx, cy] = clampOffset(x.get(), y.get(), base)
    x.set(cx)
    y.set(cy)
    storageSetJson(storageKey, { x: cx, y: cy })
  }

  return { x, y, savePosition }
}
