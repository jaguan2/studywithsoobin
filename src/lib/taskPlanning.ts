export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskOrder = 'custom' | 'shortest' | 'priority'

export interface PlannedTask {
  id: string
  text: string
  done: boolean
  duration: number
  priority: TaskPriority
  completedAt: string | null
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

/** Stable ordering: completed work always sinks below the current plan. */
export function orderTasks(tasks: PlannedTask[], order: TaskOrder): PlannedTask[] {
  const active = tasks.filter((task) => !task.done)
  const done = tasks.filter((task) => task.done)

  if (order === 'shortest') {
    return [...active].sort((a, b) => a.duration - b.duration).concat(done)
  }
  if (order === 'priority') {
    return [...active]
      .sort(
        (a, b) =>
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          a.duration - b.duration,
      )
      .concat(done)
  }
  return active.concat(done)
}

export function plannedMinutes(tasks: PlannedTask[]): number {
  return tasks.reduce((total, task) => total + (task.done ? 0 : task.duration), 0)
}

export function clampTaskDuration(value: unknown, fallback = 25): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? Math.min(720, Math.max(1, Math.round(number))) : fallback
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'low' || value === 'medium' || value === 'high'
}

export function isTaskOrder(value: unknown): value is TaskOrder {
  return value === 'custom' || value === 'shortest' || value === 'priority'
}

/** Accept both the current shape and the original {id,text,done} checklist. */
export function normalizePlannedTask(value: unknown): PlannedTask | null {
  if (typeof value !== 'object' || value === null) return null
  const task = value as Record<string, unknown>
  if (typeof task.id !== 'string' || typeof task.text !== 'string' || typeof task.done !== 'boolean') {
    return null
  }
  return {
    id: task.id,
    text: task.text,
    done: task.done,
    duration: clampTaskDuration(task.duration),
    priority: isTaskPriority(task.priority) ? task.priority : 'medium',
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
  }
}
