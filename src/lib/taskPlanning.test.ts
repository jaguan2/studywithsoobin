import { describe, expect, it } from 'vitest'
import {
  clampTaskDuration,
  normalizePlannedTask,
  orderTasks,
  plannedMinutes,
  type PlannedTask,
} from './taskPlanning'

const task = (
  id: string,
  duration: number,
  priority: PlannedTask['priority'],
  done = false,
): PlannedTask => ({ id, text: id, duration, priority, done, completedAt: null })

describe('task planning', () => {
  const tasks = [task('long-low', 60, 'low'), task('short-high', 10, 'high'), task('done', 5, 'high', true)]

  it('keeps custom order while sinking completed work', () => {
    expect(orderTasks(tasks, 'custom').map((item) => item.id)).toEqual(['long-low', 'short-high', 'done'])
  })

  it('sorts quick wins and priority without moving completed work up', () => {
    expect(orderTasks(tasks, 'shortest').map((item) => item.id)).toEqual(['short-high', 'long-low', 'done'])
    expect(orderTasks(tasks, 'priority').map((item) => item.id)).toEqual(['short-high', 'long-low', 'done'])
  })

  it('totals only unfinished planned minutes', () => {
    expect(plannedMinutes(tasks)).toBe(70)
  })

  it('sanitizes durations', () => {
    expect(clampTaskDuration('')).toBe(1)
    expect(clampTaskDuration('25')).toBe(25)
    expect(clampTaskDuration(999)).toBe(720)
    expect(clampTaskDuration('nope')).toBe(25)
  })

  it('migrates the original checklist shape without losing the task', () => {
    expect(normalizePlannedTask({ id: 'old', text: 'Legacy task', done: false })).toEqual({
      id: 'old',
      text: 'Legacy task',
      done: false,
      duration: 25,
      priority: 'medium',
      completedAt: null,
    })
    expect(normalizePlannedTask({ text: 'missing id', done: false })).toBeNull()
  })
})
