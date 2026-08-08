import { useState } from 'react'
import { storageGetJson, storageSetJson } from '../lib/storage'

interface PanelSizeOptions {
  width: number
  minWidth: number
  maxWidth: number
  height?: number
  minHeight?: number
  maxHeight?: number
  /** Persist the size under this key; omit for a session-only size. */
  storageKey?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** Width/height state for a floating panel plus a pointer handler for a
 *  bottom-right resize handle. Height is optional (width-only panels). */
export function usePanelSize(options: PanelSizeOptions) {
  const maxHeight = options.maxHeight ?? window.innerHeight - 32
  const [width, setWidth] = useState(() => {
    const stored = options.storageKey
      ? storageGetJson<{ w?: unknown }>(options.storageKey, {})
      : {}
    return typeof stored.w === 'number'
      ? clamp(stored.w, options.minWidth, options.maxWidth)
      : options.width
  })
  const [height, setHeight] = useState(() => {
    if (options.height === undefined) return undefined
    const stored = options.storageKey
      ? storageGetJson<{ h?: unknown }>(options.storageKey, {})
      : {}
    return typeof stored.h === 'number'
      ? clamp(stored.h, options.minHeight ?? 200, maxHeight)
      : options.height
  })

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture so the grip keeps receiving events during a fast drag that
    // leaves the element (or the window).
    try {
      ;(e.target as Element).setPointerCapture(e.pointerId)
    } catch {
      /* capture unsupported — window listeners below still work */
    }
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = width
    const startHeight = height
    // Latest values for the save on release — the state setters above don't
    // update this closure.
    const latest = { w: startWidth, h: startHeight }

    const onMove = (ev: PointerEvent) => {
      latest.w = clamp(startWidth + ev.clientX - startX, options.minWidth, options.maxWidth)
      setWidth(latest.w)
      if (startHeight !== undefined) {
        latest.h = clamp(startHeight + ev.clientY - startY, options.minHeight ?? 200, maxHeight)
        setHeight(latest.h)
      }
    }
    // pointercancel too: a touch drag that gets interrupted never fires
    // pointerup, and the move listener would leak until the next release.
    const onEnd = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      if (options.storageKey) storageSetJson(options.storageKey, { w: latest.w, h: latest.h })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  return { width, height, startResize }
}
