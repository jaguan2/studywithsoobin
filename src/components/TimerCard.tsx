import { motion, useDragControls } from 'framer-motion'
import type { TimerApi } from '../hooks/useTimer'
import { usePanelSize } from '../hooks/usePanelSize'
import { ResizeGrip } from './ResizeGrip'
import { TimerPanel } from './TimerPanel'

interface TimerCardProps {
  timer: TimerApi
  zIndex: number
  onFocus: () => void
}

// A floating, draggable timer card — same framer-motion pattern as TaskNook's
// FocusTimer: drag starts only from the grab strip, no momentum, and the
// element is positioned with explicit left/top because framer-motion owns the
// inline transform.
export function TimerCard({ timer, zIndex, onFocus }: TimerCardProps) {
  const dragControls = useDragControls()
  const { width, startResize } = usePanelSize({ width: 300, minWidth: 272, maxWidth: 480 })

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onPointerDownCapture={onFocus}
      style={{ width, left: 16, top: 16, zIndex }}
      className="absolute select-none rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        title="Drag to move"
        className="flex cursor-grab justify-center pb-1 pt-2 active:cursor-grabbing"
      >
        <div className="h-1.5 w-10 rounded-full bg-ink-700/20 dark:bg-cream-300/20" />
      </div>
      <div className="px-4 pb-4">
        <TimerPanel timer={timer} />
      </div>
      <ResizeGrip onStart={startResize} />
    </motion.div>
  )
}
