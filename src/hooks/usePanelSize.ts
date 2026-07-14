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
    const onUp = () => window.removeEventListener('pointermove', onMove)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  return { width, height, startResize }
}
