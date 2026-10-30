import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useAppearance } from './useAppearance'
import { DEFAULT_CUSTOM_COLOR } from '../lib/theme'

let root: ReactTestRenderer | undefined
let api: ReturnType<typeof useAppearance>
let values: Map<string, string>
let styles: Map<string, string>
let classes: Set<string>
function Harness() { api = useAppearance(); return null }
function mount() { act(() => { root = create(<Harness />) }) }
beforeEach(() => {
  values = new Map()
  styles = new Map()
  classes = new Set()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  vi.stubGlobal('document', { documentElement: {
    classList: { toggle: (key: string, active: boolean) => active ? classes.add(key) : classes.delete(key) },
    style: {
      setProperty: (key: string, value: string) => styles.set(key, value),
      removeProperty: (key: string) => styles.delete(key),
    },
  } })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.unstubAllGlobals()
})

describe('appearance ownership', () => {
  it('clears inline custom colors when changing to a preset and persists the choice', () => {
    values.set('sws.theme', 'custom')
    values.set('sws.customColor', '#ffdd00')
    mount()
    expect(styles.has('--clay-500')).toBe(true)
    act(() => api.setTheme('dark'))
    expect(styles.has('--clay-500')).toBe(false)
    expect(classes).toEqual(new Set(['dark']))
    expect(values.get('sws.theme')).toBe('dark')
    act(() => api.setTheme('coffee'))
    expect(classes).toEqual(new Set(['coffee']))
  })

  it.each([['', 88], ['NaN', 88], ['20', 65], ['120', 100], ['77.6', 78]])(
    'normalizes saved opacity %s to %s without changing text styles', (saved, expected) => {
      values.set('sws.panelOpacity', saved)
      mount()
      expect(api.panelOpacity).toBe(expected)
      expect(styles.get('--panel-opacity')).toBe(String(expected / 100))
      expect(styles.has('opacity')).toBe(false)
    },
  )

  it('falls back safely when preferences are invalid or storage is unavailable', () => {
    values.set('sws.theme', 'invalid')
    values.set('sws.customColor', 'not-a-color')
    mount()
    expect(api.theme).toBe('light')
    expect(api.customColor).toBe(DEFAULT_CUSTOM_COLOR)
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Unavailable') }, setItem: () => { throw Error('Unavailable') } })
    act(() => api.setTheme('dark'))
    expect(classes.has('dark')).toBe(true)
  })
})
