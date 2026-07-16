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
  }
}
