import { motion, useDragControls } from 'framer-motion'
import type { TimerApi } from '../hooks/useTimer'
import { usePanelSize } from '../hooks/usePanelSize'
import { ResizeGrip } from './ResizeGrip'
import { TimerPanel } from './TimerPanel'

interface TimerCardProps {
  timer: TimerApi
  zIndex: number
  onFocus: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

// A floating, draggable timer card — same framer-motion pattern as TaskNook's
// FocusTimer: drag starts only from the grab strip, no momentum, and the
// element is positioned with explicit left/top because framer-motion owns the
// inline transform.
export function TimerCard({ timer, zIndex, onFocus, collapsed, onToggleCollapsed }: TimerCardProps) {
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
      // visibility (not unmount) so the dragged position survives minimize
      style={{ width, left: 16, top: 16, zIndex, visibility: collapsed ? 'hidden' : 'visible' }}
      className="absolute select-none rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        title="Drag to move"
        className="flex cursor-grab justify-center pb-1 pt-2 active:cursor-grabbing"
      >
        <div className="h-1.5 w-10 rounded-full bg-ink-700/20 dark:bg-cream-300/20" />
      </div>
      <button
        onClick={onToggleCollapsed}
        aria-label="Minimize timer"
        title="Minimize"
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-ink-700 transition hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-700"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <div className="px-4 pb-4">
        <TimerPanel timer={timer} />
      </div>
      <ResizeGrip onStart={startResize} />
    </motion.div>
  )
}
