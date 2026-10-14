import { describe, expect, it } from 'vitest'
import {
  clampTaskDuration,
  normalizePlannedTask,
  movePlannedTask,
  orderTasks,
  plannedMinutes,
  restoreRemovedTasks,
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

  it('moves unfinished work while preserving completed items and input data', () => {
    const before = [task('a', 25, 'medium'), task('done', 10, 'low', true), task('b', 15, 'high')]
    const moved = movePlannedTask(before, 'b', -1)
    expect(moved.map(item => item.id)).toEqual(['b', 'a', 'done'])
    expect(before.map(item => item.id)).toEqual(['a', 'done', 'b'])
    expect(movePlannedTask(before, 'a', -1)).toBe(before)
    expect(movePlannedTask(before, 'done', -1)).toBe(before)
    expect(movePlannedTask(before, 'missing', 1)).toBe(before)
    expect(movePlannedTask(before, 'b', 1)).toBe(before)
  })

  it('undoes a removal without losing a task added afterward', () => {
    const before = [task('a', 25, 'medium'), task('b', 15, 'high'), task('c', 10, 'low')]
    const current = [before[0], before[2], task('new', 20, 'medium')]
    expect(restoreRemovedTasks(current, before, ['b']).map(item => item.id)).toEqual(['a', 'b', 'c', 'new'])
    expect(current.map(item => item.id)).toEqual(['a', 'c', 'new'])
  })

  it('preserves check-offs and edits made after a different task was deleted', () => {
    const before = [task('a', 25, 'medium'), task('b', 15, 'high')]
    const current = [{ ...before[0], text: 'Renamed', duration: 40, done: true, completedAt: '2026-10-14T12:00:00Z' }]
    const restored = restoreRemovedTasks(current, before, ['b'])
    expect(restored[0]).toEqual(current[0])
    expect(restored[1]).toEqual(before[1])
    expect(plannedMinutes(restored)).toBe(15)
  })

  it('preserves the relative order of surviving tasks when undoing after a reorder', () => {
    const before = ['a', 'b', 'c', 'd'].map(id => task(id, 25, 'medium'))
    const current = [before[3], before[0], before[2], task('new', 10, 'low')]
    const restored = restoreRemovedTasks(current, before, ['b'])
    expect(restored.filter(item => item.id !== 'b')).toEqual(current)
    expect(restored.map(item => item.id)).toEqual(['d', 'a', 'b', 'c', 'new'])
  })

  it('restores several cleared completed tasks in order without duplicating existing ids', () => {
    const before = [task('active', 25, 'medium'), task('done-a', 15, 'high', true), task('done-b', 10, 'low', true)]
    const current = [before[0], task('new', 30, 'low')]
    const restored = restoreRemovedTasks(current, before, ['done-a', 'done-b'])
    expect(restored.map(item => item.id)).toEqual(['active', 'new', 'done-a', 'done-b'])
    expect(restored.filter(item => item.done).map(item => item.id)).toEqual(['done-a', 'done-b'])
    expect(restoreRemovedTasks(restored, before, ['done-a', 'done-b'])).toEqual(restored)
  })
})
