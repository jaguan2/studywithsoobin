import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'

export interface CaptionTrack {
  code: string
  name: string
}

export interface VideoBackgroundHandle {
  /** Seek relative to the current position (negative = backward). */
  seekBy: (deltaSeconds: number) => void
  /** Seek to an absolute position, for the scrubber. */
  seekTo: (seconds: number) => void
  /** Current position and length, or null until the player reports them.
   *  The IFrame API has no timeupdate event, so callers poll this. */
  getProgress: () => { current: number; duration: number } | null
  /** Subtitle tracks for the current video. Empty until the captions module
   *  has spun up, and varies per video, so callers poll this too. */
  getCaptionTracks: () => CaptionTrack[]
}

interface VideoBackgroundProps {
  videoId: string
  volume: number
  isPlaying: boolean
  /** Preferred subtitle language code, or null for off. Re-applied to each
   *  new video that has a matching track. */
  captionLang: string | null
  onEnded: () => void
  /** Keeps the caller's play/pause state in sync with the real player state. */
  onPlayingChange: (playing: boolean) => void
  /** Fired when YouTube refuses to play the video in an embed (copyright /
   *  embed restrictions — error codes 2, 5, 100, 101, 150). */
  onUnplayable: () => void
}

export const VideoBackground = forwardRef<VideoBackgroundHandle, VideoBackgroundProps>(
  function VideoBackground(
    { videoId, volume, isPlaying, captionLang, onEnded, onPlayingChange, onUnplayable },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YT.Player | null>(null)
    const onEndedRef = useRef(onEnded)
    onEndedRef.current = onEnded
    const onPlayingChangeRef = useRef(onPlayingChange)
    onPlayingChangeRef.current = onPlayingChange
    const onUnplayableRef = useRef(onUnplayable)
    onUnplayableRef.current = onUnplayable
    const captionLangRef = useRef(captionLang)
    captionLangRef.current = captionLang
    const captionRetryRef = useRef<number | undefined>(undefined)

    /** Push the current preference into the player. The tracklist only exists
     *  once the captions module has spun up (a second or two after playback
     *  starts, and again after each video swap), so this retries instead of
     *  giving up on the first miss. */
    const applyCaptions = useCallback(() => {
      window.clearTimeout(captionRetryRef.current)
      let attempts = 0
      const tick = () => {
        const player = playerRef.current
        if (!player?.loadModule) return
        try {
          player.loadModule('captions')
          const lang = captionLangRef.current
          if (!lang) {
            // An empty track object is the only thing that hides captions;
            // unloadModule leaves them rendered on screen.
            player.setOption?.('captions', 'track', {})
            return
          }
          const tracks = player.getOption?.('captions', 'tracklist') as
            | YT.CaptionTrack[]
            | undefined
          if (Array.isArray(tracks) && tracks.length > 0) {
            const match = tracks.find((t) => t.languageCode === lang)
            player.setOption?.('captions', 'track', match ?? {})
            return
          }
        } catch {
          /* module not ready yet — fall through to the retry */
        }
        if (++attempts < 12) captionRetryRef.current = window.setTimeout(tick, 500)
      }
      tick()
    }, [])

    useImperativeHandle(ref, () => ({
      seekBy: (deltaSeconds: number) => {
        const player = playerRef.current
        if (!player) return
        player.seekTo(Math.max(0, player.getCurrentTime() + deltaSeconds), true)
      },
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(Math.max(0, seconds), true)
      },
      getProgress: () => {
        const player = playerRef.current
        // The YT.Player object exists before its methods are wired up, and
        // they throw if called too early — hence the guard and the catch.
        if (!player || typeof player.getDuration !== 'function') return null
        try {
          const duration = player.getDuration()
          const current = player.getCurrentTime()
          if (!Number.isFinite(duration) || !Number.isFinite(current)) return null
          return { current, duration }
        } catch {
          return null
        }
      },
      getCaptionTracks: () => {
        const player = playerRef.current
        if (!player?.getOption) return []
        try {
          const tracks = player.getOption('captions', 'tracklist') as
            | YT.CaptionTrack[]
            | undefined
          if (!Array.isArray(tracks)) return []
          return tracks.map((t) => ({
            code: t.languageCode,
            name: t.languageName ?? t.displayName ?? t.languageCode,
          }))
        } catch {
          return []
        }
      },
    }))

    // Create the player once.
    useEffect(() => {
      let cancelled = false

      loadYouTubeIframeApi().then((YT) => {
        if (cancelled || !containerRef.current) return
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            mute: 1,
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(volume)
              event.target.playVideo()
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) {
                onEndedRef.current()
              } else if (event.data === YT.PlayerState.PLAYING) {
                onPlayingChangeRef.current(true)
                // The tracklist doesn't exist until playback starts, and it's
                // rebuilt per video — so re-apply the preference here rather
                // than once on ready.
                applyCaptions()
              } else if (event.data === YT.PlayerState.PAUSED) {
                onPlayingChangeRef.current(false)
              }
            },
            onError: () => {
              onUnplayableRef.current()
            },
          },
        })
      })

      return () => {
        cancelled = true
        window.clearTimeout(captionRetryRef.current)
        playerRef.current?.destroy()
        playerRef.current = null
      }
      // Player is intentionally created once; video/volume changes are handled below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      applyCaptions()
    }, [captionLang, applyCaptions])

    // Swap videos without recreating the player.
    useEffect(() => {
      playerRef.current?.loadVideoById(videoId)
    }, [videoId])

    useEffect(() => {
      const player = playerRef.current
      if (!player) return
      if (volume <= 0) {
        player.mute()
      } else {
        player.unMute()
        player.setVolume(volume)
      }
    }, [volume])

    useEffect(() => {
      const player = playerRef.current
      if (!player) return
      if (isPlaying) player.playVideo()
      else player.pauseVideo()
    }, [isPlaying])

    return (
      <div className="yt-bg" aria-hidden="true">
        <div className="yt-frame-box">
          <div ref={containerRef} />
        </div>
      </div>
    )
  },
)
