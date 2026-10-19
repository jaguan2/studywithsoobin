import { afterEach, describe, expect, it, vi } from 'vitest'
import { storageGet, storageGetJson, storageRemove, storageSet, storageSetJson } from './storage'

afterEach(() => vi.unstubAllGlobals())

describe('guarded persistence', () => {
  it('reports successful writes and round-trips a progression-style JSON value', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    })
    const profile = { version: 1, bonusXP: 10, taskClaims: ['a'] }
    expect(storageSetJson('profile', profile)).toBe(true)
    expect(storageGetJson('profile', null)).toEqual(profile)
    storageRemove('profile')
    expect(storageGet('profile')).toBeNull()
  })
  it('reports write failures without throwing, so progression can remain usable in memory', () => {
    const blocked = () => { throw new Error('Storage unavailable') }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
    expect(storageSet('profile', '{}')).toBe(false)
    expect(storageSetJson('profile', { bonusXP: 10 })).toBe(false)
    expect(storageGetJson('profile', 'fallback')).toBe('fallback')
    expect(() => storageRemove('profile')).not.toThrow()
  })
  it('falls back from corrupt JSON rather than breaking the profile at startup', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{bad JSON' })
    expect(storageGetJson('profile', null)).toBeNull()
  })
})
