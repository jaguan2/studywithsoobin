import { useState } from 'react'

interface PanelSizeOptions {
  width: number
  minWidth: number
  maxWidth: number
  height?: number
  minHeight?: number
  maxHeight?: number
}

/** Width/height state for a floating panel plus a pointer handler for a
 *  bottom-right resize handle. Height is optional (width-only panels). */
export function usePanelSize(options: PanelSizeOptions) {
  const [width, setWidth] = useState(options.width)
  const [height, setHeight] = useState(options.height)

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

    const onMove = (ev: PointerEvent) => {
      setWidth(
        Math.min(Math.max(startWidth + ev.clientX - startX, options.minWidth), options.maxWidth),
      )
      if (startHeight !== undefined) {
        setHeight(
          Math.min(
            Math.max(startHeight + ev.clientY - startY, options.minHeight ?? 200),
            options.maxHeight ?? window.innerHeight - 32,
          ),
        )
      }
    }
    // pointercancel too: a touch drag that gets interrupted never fires
    // pointerup, and the move listener would leak until the next release.
    const onEnd = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  return { width, height, startResize }
}
