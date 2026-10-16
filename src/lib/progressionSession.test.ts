import { describe, expect, it, vi } from 'vitest'
import { createProgressionSession, type ProgressionLock } from './progressionSession'
import { editProfile, normalizeProgression, progressionLevel, recordCheckIn, rewardTaskCompletion, syncFocusHistory } from './progression'

function setup() {
  let stored = JSON.stringify(normalizeProgression(null))
  let writable = true
  let readable = true
  let queue = Promise.resolve()
  const lock: ProgressionLock = operation => {
    const result = queue.then(operation)
    queue = result.then(() => {}, () => {})
    return result
  }
  const write = vi.fn((state: ReturnType<typeof normalizeProgression>) => {
    if (!writable) return false
    stored = JSON.stringify(state)
    return true
  })
  const read = () => {
    if (!readable) throw new Error('Storage blocked')
    return normalizeProgression(JSON.parse(stored))
  }
  const options = { read, write, lock }
  return {
    open: () => createProgressionSession(options), read, write,
    setWritable: (value: boolean) => { writable = value },
    setReadable: (value: boolean) => { readable = value },
  }
}

describe('progression across independent sessions', () => {
  it('preserves earned XP and claims when a stale tab saves a profile', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    await a.update(state => rewardTaskCompletion(state, 'task-a'))
    await b.update(state => editProfile(state, 'Study friend', 'book'))
    expect(shared.read()).toMatchObject({ bonusXP: 10, taskClaims: ['task-a'], name: 'Study friend', avatar: 'book' })
  })

  it('serializes overlapping distinct rewards and deduplicates the same task', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    await Promise.all([
      a.update(state => rewardTaskCompletion(state, 'task-a')),
      b.update(state => rewardTaskCompletion(state, 'task-b')),
      b.update(state => rewardTaskCompletion(state, 'task-a')),
    ])
    expect(shared.read().bonusXP).toBe(20)
    expect(shared.read().taskClaims).toEqual(['task-a', 'task-b'])
  })

  it('awards one daily check-in while preserving task rewards from both tabs', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    const day = new Date(2026, 9, 16, 12)
    await Promise.all([
      a.update(state => recordCheckIn(state, day)),
      b.update(state => recordCheckIn(state, day)),
      a.update(state => rewardTaskCompletion(state, 'task-a')),
      b.update(state => rewardTaskCompletion(state, 'task-b')),
    ])
    expect(shared.read()).toMatchObject({ bonusXP: 30, checkInStreak: 1 })
    const nextDay = new Date(2026, 9, 17, 12)
    await Promise.all([a.update(state => recordCheckIn(state, nextDay)), b.update(state => recordCheckIn(state, nextDay))])
    expect(shared.read()).toMatchObject({ bonusXP: 41, checkInStreak: 2 })
  })

  it('replays unsaved actions onto newer persisted progress without losing either', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    shared.setWritable(false)
    expect((await a.update(state => rewardTaskCompletion(state, 'task-a'))).saved).toBe(false)
    expect(a.getSnapshot().bonusXP).toBe(10)
    shared.setWritable(true)
    await b.update(state => rewardTaskCompletion(state, 'task-b'))
    await a.update(state => editProfile(state, 'Recovered', 'moon'))
    expect(shared.read()).toMatchObject({ bonusXP: 20, taskClaims: ['task-b', 'task-a'], name: 'Recovered' })
  })

  it('does not count a pending focus block twice after another tab backfills it', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    shared.setWritable(false)
    await a.update(state => syncFocusHistory(state, { '2026-10-16': 25 }))
    shared.setWritable(true)
    await b.update(state => syncFocusHistory(state, { '2026-10-16': 50 }))
    await a.update(state => editProfile(state, 'Recovered', 'leaf'))
    expect(progressionLevel(shared.read()).totalXP).toBe(50)
  })

  it('refreshes remote changes without writing them back', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    const observed = vi.fn()
    a.subscribe(observed)
    await b.update(state => editProfile(state, 'Remote edit', 'coffee'))
    const writes = shared.write.mock.calls.length
    await a.refresh()
    expect(a.getSnapshot().name).toBe('Remote edit')
    expect(observed).toHaveBeenCalledWith(a.getSnapshot())
    expect(shared.write).toHaveBeenCalledTimes(writes)
  })

  it('does not overwrite unseen remote progress if reading fails while writes still work', async () => {
    const shared = setup()
    const a = shared.open(), b = shared.open()
    await b.update(state => rewardTaskCompletion(state, 'remote-task'))
    const writes = shared.write.mock.calls.length
    shared.setReadable(false)
    const result = await a.update(state => editProfile(state, 'Local edit', 'book'))
    expect(result.saved).toBe(false)
    expect(shared.write).toHaveBeenCalledTimes(writes)
    shared.setReadable(true)
    await a.update(state => state)
    expect(shared.read()).toMatchObject({ bonusXP: 10, taskClaims: ['remote-task'], name: 'Local edit' })
  })

  it('retains the last readable profile when storage access fails', async () => {
    const shared = setup()
    const a = shared.open()
    await a.update(state => rewardTaskCompletion(state, 'task-a'))
    shared.setReadable(false)
    shared.setWritable(false)
    await a.update(state => rewardTaskCompletion(state, 'task-b'))
    expect(a.getSnapshot().bonusXP).toBe(20)
    shared.setReadable(true)
    shared.setWritable(true)
    await a.update(state => editProfile(state, 'Recovered', 'leaf'))
    expect(shared.read().bonusXP).toBe(20)
  })
})
