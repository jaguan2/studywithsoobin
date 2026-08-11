import { useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { usePanelPosition } from '../hooks/usePanelPosition'
import { usePanelSize } from '../hooks/usePanelSize'
import { ResizeGrip } from './ResizeGrip'
import { storageGetJson, storageSetJson } from '../lib/storage'

// Spawns on the right, clear of the top-right button cluster. Evaluated once
// at module load; after that the persisted/clamped offset takes over.
const BASE = { left: Math.max(16, window.innerWidth - 336), top: 72 }

const TASKS_KEY = 'sws.tasks'

export interface Task {
  id: string
  text: string
  done: boolean
}

function loadTasks(): Task[] {
  const raw = storageGetJson<unknown>(TASKS_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (t): t is Task =>
      typeof t === 'object' &&
      t !== null &&
      typeof (t as Task).id === 'string' &&
      typeof (t as Task).text === 'string' &&
      typeof (t as Task).done === 'boolean',
  )
}

interface TasksCardProps {
  bounds: React.RefObject<HTMLDivElement | null>
  zIndex: number
  onFocus: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** A cozy checklist — "what am I focusing on" next to the timer. Deliberately
 *  simpler than TaskNook's task system (no priorities/groups/routines): a
 *  study session wants a short list, not a planner. */
export function TasksCard({ bounds, zIndex, onFocus, collapsed, onToggleCollapsed }: TasksCardProps) {
  const dragControls = useDragControls()
  const { width, startResize } = usePanelSize({
    width: 300,
    minWidth: 260,
    maxWidth: 420,
    storageKey: 'sws.size.tasks',
  })
  const { x, y, savePosition } = usePanelPosition('sws.pos.tasks', BASE)
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [draft, setDraft] = useState('')

  const update = (next: Task[]) => {
    setTasks(next)
    storageSetJson(TASKS_KEY, next)
  }

  const addTask = () => {
    const text = draft.trim()
    if (!text) return
    update([...tasks, { id: crypto.randomUUID(), text, done: false }])
    setDraft('')
  }

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={bounds}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={savePosition}
      onPointerDownCapture={onFocus}
      // visibility (not unmount) so the dragged position survives minimize
      style={{ x, y, width, left: BASE.left, top: BASE.top, zIndex, visibility: collapsed ? 'hidden' : 'visible' }}
      className="absolute select-none rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <header
        onPointerDown={(e) => dragControls.start(e)}
        title="Drag to move"
        className="flex cursor-grab items-center justify-between px-4 pb-1 pt-3 active:cursor-grabbing"
      >
        <span className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          📝 Tasks
          {tasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-ink-700/60 dark:text-cream-300/50">
              {doneCount}/{tasks.length}
            </span>
          )}
        </span>
        <button
          onClick={onToggleCollapsed}
          aria-label="Minimize tasks"
          title="Minimize"
          className="grid h-6 w-6 place-items-center rounded-full text-ink-700 transition hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-700"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="px-4 pb-4">
        {tasks.length > 0 && (
          <ul className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto">
            {tasks.map((task) => (
              <li key={task.id} className="group flex items-center gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      update(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
                    }
                    className="h-3.5 w-3.5 shrink-0 accent-clay-500"
                  />
                  <span
                    className={
                      'min-w-0 flex-1 truncate text-sm ' +
                      (task.done
                        ? 'text-ink-700/40 line-through dark:text-cream-300/30'
                        : 'text-ink-800 dark:text-cream-200')
                    }
                    title={task.text}
                  >
                    {task.text}
                  </span>
                </label>
                <button
                  onClick={() => update(tasks.filter((t) => t.id !== task.id))}
                  aria-label={`Delete "${task.text}"`}
                  className="shrink-0 text-ink-700/40 opacity-0 transition hover:text-ink-900 group-hover:opacity-100 dark:text-cream-300/40 dark:hover:text-cream-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a task…"
            className="min-w-0 flex-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-700/40 focus:outline-none focus:ring-1 focus:ring-clay-500 dark:bg-ink-800/80 dark:text-cream-100 dark:placeholder:text-cream-300/40"
          />
          <button
            onClick={addTask}
            className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800"
          >
            Add
          </button>
        </div>

        {doneCount > 0 && (
          <button
            onClick={() => update(tasks.filter((t) => !t.done))}
            className="mt-2 text-[11px] text-ink-700/60 underline-offset-2 hover:underline dark:text-cream-300/60"
          >
            clear done
          </button>
        )}
      </div>
      <ResizeGrip onStart={startResize} />
    </motion.div>
  )
}
