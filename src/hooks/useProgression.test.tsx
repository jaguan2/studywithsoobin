import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useProgression } from './useProgression'
import { normalizeProgression, PROGRESSION_KEY, progressionLevel, totalFocusMinutes } from '../lib/progression'
import { localDayKey } from '../lib/stats'

type ProfileApi = ReturnType<typeof useProgression>
let root: ReactTestRenderer | undefined
let apis: Record<string, ProfileApi>
let values: Map<string, string>
let writable: boolean
const notice = vi.fn()
const write = vi.fn((key: string, value: string) => {
  if (!writable) throw new Error('Storage full')
  values.set(key, value)
})
function Harness({ name }: { name: string }) {
  apis[name] = useProgression(notice)
  return null
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 16, 12))
  apis = {}
  values = new Map()
  writable = true
  let queue = Promise.resolve()
  vi.stubGlobal('navigator', { locks: { request: <T,>(_key: string, operation: () => T) => {
    const result = queue.then(operation)
    queue = result.then(() => {}, () => {})
    return result
  } } })
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: write })
})
afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function mount() {
  await act(async () => { root = create(<><Harness name="a" /><Harness name="b" /></>) })
}
const saved = () => normalizeProgression(JSON.parse(values.get(PROGRESSION_KEY)!))

describe('mounted progression integration', () => {
  it('keeps task XP when another mounted session saves its stale profile', async () => {
    await mount()
    await act(async () => { apis.a.completeTask('task-a') })
    expect(apis.b.progression.taskClaims).toEqual([])
    await act(async () => { expect(await apis.b.updateProfile('New name', 'book')).toBe(true) })
    expect(saved()).toMatchObject({ bonusXP: 20, taskClaims: ['task-a'], name: 'New name' })
  })

  it('refreshes on storage notifications without an echo write', async () => {
    await mount()
    await act(async () => { await apis.a.updateProfile('Remote name', 'coffee') })
    const before = write.mock.calls.length
    await act(async () => { window.dispatchEvent(Object.assign(new Event('storage'), { key: PROGRESSION_KEY })) })
    expect(apis.b.progression.name).toBe('Remote name')
    expect(write).toHaveBeenCalledTimes(before)
  })

  it('preserves failed in-memory rewards alongside newer rewards from another session', async () => {
    await mount()
    writable = false
    await act(async () => { apis.a.completeTask('task-a') })
    expect(progressionLevel(apis.a.progression).totalXP).toBe(20)
    expect(saved().bonusXP).toBe(10)
    writable = true
    await act(async () => { apis.b.completeTask('task-b') })
    await act(async () => { await apis.a.updateProfile('Recovered', 'leaf') })
    expect(saved()).toMatchObject({ bonusXP: 30, taskClaims: ['task-b', 'task-a'], name: 'Recovered' })
  })

  it('counts overlapping focus callbacks once when ordinary stats already include both blocks', async () => {
    await mount()
    const today = localDayKey()
    await act(async () => {
      values.set('sws.stats', JSON.stringify({ [today]: 25 }))
      apis.a.recordStudy(25)
      values.set('sws.stats', JSON.stringify({ [today]: 50 }))
      apis.b.recordStudy(25)
    })
    expect(totalFocusMinutes(saved())).toBe(50)
    expect(progressionLevel(saved()).totalXP).toBe(60)
  })
})
