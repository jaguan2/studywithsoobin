import { memo, useMemo, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { usePanelPosition } from '../hooks/usePanelPosition'
import { usePanelSize } from '../hooks/usePanelSize'
import {
  clampTaskDuration,
  isTaskOrder,
  normalizePlannedTask,
  orderTasks,
  plannedMinutes,
  type PlannedTask,
  type TaskOrder,
  type TaskPriority,
} from '../lib/taskPlanning'
import { storageGet, storageGetJson, storageSet, storageSetJson } from '../lib/storage'
import { ResizeGrip } from './ResizeGrip'

const BASE = { left: Math.max(16, window.innerWidth - 336), top: 72 }
const TASKS_KEY = 'sws.tasks'
const ORDER_KEY = 'sws.tasks.order'
const ACTIVE_KEY = 'sws.tasks.active'

const ORDER_OPTIONS: { value: TaskOrder; label: string; title: string }[] = [
  { value: 'custom', label: '✋ My order', title: 'Keep the order tasks were added' },
  { value: 'shortest', label: '⚡ Quick wins', title: 'Shortest tasks first' },
  { value: 'priority', label: '🔥 Priority', title: 'High priority first, then shortest' },
]

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: 'bg-red-500/15 text-red-700 dark:text-red-300',
  medium: 'bg-clay-500/15 text-clay-600 dark:text-clay-400',
  low: 'bg-cream-300/60 text-ink-700 dark:bg-ink-700 dark:text-cream-300',
}

export type Task = PlannedTask

function taskId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

/** Migrate the original {id,text,done} checklist shape without losing data. */
function loadTasks(): Task[] {
  const raw = storageGetJson<unknown>(TASKS_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.flatMap((value): Task[] => {
    const task = normalizePlannedTask(value)
    return task ? [task] : []
  })
}

function loadOrder(): TaskOrder {
  const value = storageGet(ORDER_KEY)
  return isTaskOrder(value) ? value : 'custom'
}

interface TasksCardProps {
  bounds: React.RefObject<HTMLDivElement | null>
  zIndex: number
  onFocus: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  onUseDuration: (seconds: number) => void
}

function TasksCardInner({ bounds, zIndex, onFocus, collapsed, onToggleCollapsed, onUseDuration }: TasksCardProps) {
  const dragControls = useDragControls()
  const { width, startResize } = usePanelSize({ width: 320, minWidth: 290, maxWidth: 460, storageKey: 'sws.size.tasks' })
  const { x, y, savePosition } = usePanelPosition('sws.pos.tasks', BASE)
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [draft, setDraft] = useState('')
  const [duration, setDuration] = useState(25)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [order, setOrder] = useState<TaskOrder>(loadOrder)
  const [activeId, setActiveId] = useState<string | null>(() => storageGet(ACTIVE_KEY))

  const visibleTasks = useMemo(() => orderTasks(tasks, order), [tasks, order])
  const doneCount = tasks.filter((task) => task.done).length
  const minutesLeft = plannedMinutes(tasks)

  const update = (next: Task[]) => {
    setTasks(next)
    storageSetJson(TASKS_KEY, next)
  }

  const addTask = () => {
    const text = draft.trim()
    if (!text) return
    update([...tasks, { id: taskId(), text, done: false, duration: clampTaskDuration(duration), priority, completedAt: null }])
    setDraft('')
  }

  const chooseOrder = (next: TaskOrder) => {
    setOrder(next)
    storageSet(ORDER_KEY, next)
  }

  const focusTask = (task: Task) => {
    setActiveId(task.id)
    storageSet(ACTIVE_KEY, task.id)
    onUseDuration(task.duration * 60)
  }

  return (
    <motion.div
      drag dragListener={false} dragControls={dragControls} dragConstraints={bounds}
      dragMomentum={false} dragElastic={0} onDragEnd={savePosition} onPointerDownCapture={onFocus}
      style={{ x, y, width, left: BASE.left, top: BASE.top, zIndex, visibility: collapsed ? 'hidden' : 'visible' }}
      className="absolute select-none rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <header onPointerDown={(event) => dragControls.start(event)} title="Drag to move"
        className="flex cursor-grab items-center justify-between px-4 pb-1 pt-3 active:cursor-grabbing">
        <span className="text-sm font-semibold text-ink-900 dark:text-cream-100">
          📝 Study plan
          {tasks.length > 0 && <span className="ml-2 text-xs font-normal text-ink-700/60 dark:text-cream-300/50">{doneCount}/{tasks.length}</span>}
        </span>
        <button onClick={onToggleCollapsed} aria-label="Minimize tasks" title="Minimize"
          className="grid h-6 w-6 place-items-center rounded-full text-ink-700 transition hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" strokeLinecap="round" /></svg>
        </button>
      </header>

      <div className="px-4 pb-4">
        {tasks.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {ORDER_OPTIONS.map((option) => (
              <button key={option.value} onClick={() => chooseOrder(option.value)} title={option.title}
                className={'rounded-full px-2 py-1 text-[10px] font-medium transition ' + (order === option.value
                  ? 'bg-clay-500 text-white'
                  : 'bg-white/70 text-ink-700 hover:bg-white dark:bg-ink-700/70 dark:text-cream-300')}>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <ul className="scrollbar-thin max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {visibleTasks.map((task) => {
              const active = activeId === task.id && !task.done
              return (
                <li key={task.id} className={'group rounded-lg border px-2 py-1.5 transition ' + (active
                  ? 'border-clay-500/60 bg-clay-400/10'
                  : 'border-transparent bg-white/50 dark:bg-ink-700/35')}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={task.done}
                      onChange={() => {
                        const done = !task.done
                        if (done && activeId === task.id) { setActiveId(null); storageSet(ACTIVE_KEY, '') }
                        update(tasks.map((item) => item.id === task.id
                          ? { ...item, done, completedAt: done ? new Date().toISOString() : null }
                          : item))
                      }}
                      aria-label={`Mark ${task.text} ${task.done ? 'not done' : 'done'}`}
                      className="h-3.5 w-3.5 shrink-0 accent-clay-500" />
                    <button onClick={() => !task.done && focusTask(task)} disabled={task.done}
                      title={task.done ? task.text : `Set timer to ${task.duration} minutes for ${task.text}`}
                      className="min-w-0 flex-1 text-left disabled:cursor-default">
                      <span className={'block truncate text-sm ' + (task.done
                        ? 'text-ink-700/40 line-through dark:text-cream-300/30'
                        : 'text-ink-800 dark:text-cream-200')}>{task.text}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-700/60 dark:text-cream-300/55">
                        <span>{task.duration} min</span>
                        <span className={`rounded-full px-1.5 py-0.5 ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                        {active && <span className="font-semibold text-clay-600 dark:text-clay-400">● timer loaded</span>}
                      </span>
                    </button>
                    <button onClick={() => {
                      if (activeId === task.id) { setActiveId(null); storageSet(ACTIVE_KEY, '') }
                      update(tasks.filter((item) => item.id !== task.id))
                    }} aria-label={`Delete ${task.text}`}
                      className="shrink-0 text-ink-700/40 opacity-0 transition hover:text-ink-900 group-hover:opacity-100 focus:opacity-100 dark:text-cream-300/40 dark:hover:text-cream-100">×</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input type="text" value={draft} maxLength={200} onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addTask()} placeholder="What needs doing?"
              className="min-w-0 flex-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-700/40 focus:outline-none focus:ring-1 focus:ring-clay-500 dark:bg-ink-800/80 dark:text-cream-100 dark:placeholder:text-cream-300/40" />
            <button onClick={addTask} disabled={!draft.trim()}
              className="rounded-lg bg-clay-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-clay-600 disabled:opacity-40">Add</button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-700/70 dark:text-cream-300/60">
            <label className="flex items-center gap-1 rounded-md bg-white/60 px-1.5 py-1 dark:bg-ink-700/50">
              ⏱ <input type="number" min={1} max={720} value={duration}
                onChange={(event) => setDuration(clampTaskDuration(event.target.value))} aria-label="Estimated minutes"
                className="w-10 bg-transparent text-center tabular-nums text-ink-900 outline-none dark:text-cream-100" /> min
            </label>
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} aria-label="Task priority"
              className="rounded-md bg-white/60 px-1.5 py-1 text-ink-800 outline-none dark:bg-ink-700/50 dark:text-cream-200">
              <option value="low">low priority</option><option value="medium">medium priority</option><option value="high">high priority</option>
            </select>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-700/60 dark:text-cream-300/60">
            <span>{minutesLeft > 0 ? `${minutesLeft} min planned` : 'plan complete 🎉'}</span>
            {doneCount > 0 && <button onClick={() => update(tasks.filter((task) => !task.done))} className="underline-offset-2 hover:underline">clear done</button>}
          </div>
        )}
      </div>
      <ResizeGrip onStart={startResize} />
    </motion.div>
  )
}

export const TasksCard = memo(TasksCardInner)
