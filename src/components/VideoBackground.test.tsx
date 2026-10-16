import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { VideoBackground } from './VideoBackground'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'

vi.mock('../hooks/useYouTubeIframeApi', () => ({ loadYouTubeIframeApi: vi.fn() }))
const loadApi = vi.mocked(loadYouTubeIframeApi)
let root: ReactTestRenderer | undefined
let options: YT.PlayerOptions | undefined
const player = {
  destroy: vi.fn(), loadVideoById: vi.fn(), setVolume: vi.fn(), mute: vi.fn(),
  unMute: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn(),
  getVideoData: () => ({ video_id: '' }), getCurrentTime: () => 0, getDuration: () => 0,
}
const construct = vi.fn(function (_element: unknown, configuration: YT.PlayerOptions) {
  options = configuration
  return player
})
const api = { Player: construct, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 } } as unknown as typeof YT
const props = {
  videoId: 'first-video', volume: 40, muted: true, isPlaying: true, captionLang: null,
  onEnded: vi.fn(), onPlayingChange: vi.fn(), onUnplayable: vi.fn(), onApiUnavailable: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  loadApi.mockReset()
  vi.useFakeTimers()
  options = undefined
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setTimeout, clearTimeout, setInterval, clearInterval, location: { origin: 'http://localhost:5173' },
  }))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function mount() {
  await act(async () => { root = create(<VideoBackground {...props} />, { createNodeMock: () => ({}) }) })
}

describe('video initialization recovery', () => {
  it('retries a failed API load when another video is selected', async () => {
    loadApi.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(api)
    await mount()
    expect(props.onApiUnavailable).toHaveBeenCalledTimes(1)
    await act(async () => { root!.update(<VideoBackground {...props} videoId="second-video" />) })
    expect(loadApi).toHaveBeenCalledTimes(2)
    expect(construct).toHaveBeenCalledTimes(1)
    expect(options?.videoId).toBe('second-video')
    act(() => { options?.events?.onReady?.({ target: player as unknown as YT.Player, data: 0 }) })
    expect(player.playVideo).toHaveBeenCalledTimes(1)
    expect(props.onUnplayable).not.toHaveBeenCalled()
  })

  it('retries again when the browser returns online after repeated failures', async () => {
    loadApi.mockRejectedValueOnce(new Error('Offline')).mockRejectedValueOnce(new Error('Still offline')).mockResolvedValue(api)
    await mount()
    await act(async () => { root!.update(<VideoBackground {...props} videoId="second-video" />) })
    expect(props.onApiUnavailable).toHaveBeenCalledTimes(2)
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(loadApi).toHaveBeenCalledTimes(3)
    expect(construct).toHaveBeenCalledTimes(1)
  })

  it('keeps a ready player when normally changing videos', async () => {
    loadApi.mockResolvedValue(api)
    await mount()
    act(() => { options?.events?.onReady?.({ target: player as unknown as YT.Player, data: 0 }) })
    await act(async () => { root!.update(<VideoBackground {...props} videoId="second-video" />) })
    expect(loadApi).toHaveBeenCalledTimes(1)
    expect(player.destroy).not.toHaveBeenCalled()
    expect(player.loadVideoById).toHaveBeenCalledWith('second-video')
  })

  it('uses the latest video and controls when selection changes during loading', async () => {
    let resolve!: (value: typeof YT) => void
    loadApi.mockReturnValue(new Promise(done => { resolve = done }))
    await mount()
    await act(async () => { root!.update(<VideoBackground {...props} videoId="second-video" volume={65} muted={false} isPlaying={false} />) })
    await act(async () => { resolve(api) })
    expect(loadApi).toHaveBeenCalledTimes(1)
    expect(options?.videoId).toBe('second-video')
    act(() => { options?.events?.onReady?.({ target: player as unknown as YT.Player, data: 0 }) })
    expect(player.setVolume).toHaveBeenCalledWith(65)
    expect(player.unMute).toHaveBeenCalled()
    expect(player.pauseVideo).toHaveBeenCalled()
  })

  it('does not create a player or retry after unmounting', async () => {
    let resolve!: (value: typeof YT) => void
    loadApi.mockReturnValue(new Promise(done => { resolve = done }))
    await mount()
    act(() => { root!.unmount() })
    root = undefined
    await act(async () => { resolve(api); window.dispatchEvent(new Event('online')) })
    expect(construct).not.toHaveBeenCalled()
    expect(loadApi).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
