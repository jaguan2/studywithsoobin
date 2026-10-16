import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let scripts: TestScript[]
let failAppend: boolean
class TestScript extends EventTarget {
  id = ''
  src = ''
  onerror: (() => void) | null = null
  remove() { scripts = scripts.filter(script => script !== this) }
  fail() { this.dispatchEvent(new Event('error')); this.onerror?.() }
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  scripts = []
  failAppend = false
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('document', {
    getElementById: (id: string) => scripts.find(script => script.id === id),
    createElement: () => new TestScript(),
    head: { appendChild: (script: TestScript) => {
      if (failAppend) throw new Error('Script injection blocked')
      scripts.push(script)
    } },
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function finishLoad() {
  window.YT = { Player: class {} } as unknown as typeof YT
  window.onYouTubeIframeAPIReady?.()
}

describe('YouTube API loading and recovery', () => {
  it('uses an API that is already ready without injecting a script', async () => {
    window.YT = { Player: class {} } as unknown as typeof YT
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    await expect(loadYouTubeIframeApi()).resolves.toBe(window.YT)
    expect(scripts).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shares one script and one pending promise between players', async () => {
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const first = loadYouTubeIframeApi()
    expect(loadYouTubeIframeApi()).toBe(first)
    expect(scripts).toHaveLength(1)
    finishLoad()
    await expect(first).resolves.toBe(window.YT)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('removes a stalled script on timeout and retries with a fresh script', async () => {
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const first = loadYouTubeIframeApi()
    const failure = expect(first).rejects.toThrow('did not load')
    const stale = scripts[0]
    await vi.advanceTimersByTimeAsync(12000)
    await failure
    const retry = loadYouTubeIframeApi()
    expect(scripts).toHaveLength(1)
    expect(scripts[0]).not.toBe(stale)
    stale.fail() // a late event from the old attempt must not reject the retry
    finishLoad()
    await expect(retry).resolves.toBe(window.YT)
  })

  it('recovers from a network error without keeping failed callbacks', async () => {
    const previous = vi.fn()
    window.onYouTubeIframeAPIReady = previous
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const failure = expect(loadYouTubeIframeApi()).rejects.toThrow('failed to load')
    scripts[0].fail()
    await failure
    expect(window.onYouTubeIframeAPIReady).toBe(previous)
    const retry = loadYouTubeIframeApi()
    finishLoad()
    await expect(retry).resolves.toBe(window.YT)
    expect(previous).toHaveBeenCalledTimes(1)
    expect(window.onYouTubeIframeAPIReady).toBe(previous)
  })

  it('also replaces an existing failed script', async () => {
    const existing = new TestScript()
    existing.id = 'youtube-iframe-api'
    scripts.push(existing)
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const failure = expect(loadYouTubeIframeApi()).rejects.toThrow('failed to load')
    existing.fail()
    await failure
    const retry = loadYouTubeIframeApi()
    expect(scripts[0]).not.toBe(existing)
    finishLoad()
    await expect(retry).resolves.toBe(window.YT)
  })

  it('allows a retry after script injection throws synchronously', async () => {
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    failAppend = true
    await expect(loadYouTubeIframeApi()).rejects.toThrow('Script injection blocked')
    failAppend = false
    const retry = loadYouTubeIframeApi()
    expect(scripts).toHaveLength(1)
    finishLoad()
    await expect(retry).resolves.toBe(window.YT)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('settles players even if a pre-existing ready callback throws', async () => {
    window.onYouTubeIframeAPIReady = () => { throw new Error('Other consumer failed') }
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const pending = loadYouTubeIframeApi()
    expect(finishLoad).toThrow('Other consumer failed')
    await expect(pending).resolves.toBe(window.YT)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects a premature ready callback instead of resolving an unusable API', async () => {
    const { loadYouTubeIframeApi } = await import('./useYouTubeIframeApi')
    const failure = expect(loadYouTubeIframeApi()).rejects.toThrow('failed to load')
    window.onYouTubeIframeAPIReady?.()
    await failure
    expect(scripts).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    const retry = loadYouTubeIframeApi()
    finishLoad()
    await expect(retry).resolves.toBe(window.YT)
  })
})
