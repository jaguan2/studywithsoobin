// Minimal ambient typings for the parts of the YouTube IFrame Player API
// this app uses. Avoids pulling in @types/youtube for a handful of members.
declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerEvent {
    target: Player
    data: number
  }

  /** An entry from the captions module's `tracklist` option. */
  interface CaptionTrack {
    languageCode: string
    languageName?: string
    displayName?: string
    kind?: string
  }

  interface PlayerOptions {
    videoId?: string
    width?: string | number
    height?: string | number
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: PlayerEvent) => void
      onError?: (event: PlayerEvent) => void
    }
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    playVideo(): void
    pauseVideo(): void
    loadVideoById(videoId: string): void
    cueVideoById(videoId: string): void
    mute(): void
    unMute(): void
    isMuted(): boolean
    setVolume(volume: number): void
    getVolume(): number
    getCurrentTime(): number
    getDuration(): number
    /** Undocumented but long-stable. Livestreams report a duration (their DVR
     *  window, often weeks), so this is the only way to tell one from a very
     *  long video. Optional + call it defensively. */
    getVideoData?(): { isLive?: boolean; title?: string; video_id?: string }
    getPlayerState(): number
    seekTo(seconds: number, allowSeekAhead: boolean): void
    destroy(): void

    /** Captions. Undocumented in the current IFrame API reference but stable,
     *  and the only way to drive subtitles while `controls: 0` hides YouTube's
     *  own CC button. Verified against real playlist videos:
     *    on   -> loadModule('captions') then setOption('captions','track',t)
     *    off  -> setOption('captions','track',{})
     *  `unloadModule('captions')` does NOT hide rendered captions — don't use
     *  it to turn them off. Everything here throws if called before the
     *  module is up, so guard every call. */
    loadModule?(module: string): void
    unloadModule?(module: string): void
    setOption?(module: string, option: string, value: unknown): void
    getOption?(module: string, option: string): unknown
    getOptions?(): string[]
  }
}
