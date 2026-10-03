import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'
import { getSavedPosition, savePosition } from '../lib/positions'
import { isUnavailableVideo, playerErrorMessage } from '../lib/videoPlayback'

// How often to save the playback position for "continue where you left off".
const SAVE_POSITION_MS = 10_000

export interface CaptionTrack {
  code: string
  name: string
}

export interface VideoBackgroundHandle {
  /** Replay when the filtered catalog contains only the current video. */
  restart: () => void
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
  /** True until the user makes an explicit unmute gesture (autoplay policy
   *  forces every freshly-created player to start muted). */
  muted: boolean
  isPlaying: boolean
  /** Preferred subtitle language code, or null for off. Re-applied to each
   *  new video that has a matching track. */
  captionLang: string | null
  onEnded: () => void
  /** Keeps the caller's play/pause state in sync with the real player state. */
  onPlayingChange: (playing: boolean) => void
  /** Fired when YouTube refuses to play the video in an embed (copyright /
   *  embed restrictions — error codes 2, 100, 101, 150). */
  onUnplayable: () => void
  /** Fired when the IFrame API itself can't be loaded (offline / blocked) —
   *  distinct from onUnplayable, which blocklists the *video*. */
  onApiUnavailable: (message?: string) => void
}

const VideoBackgroundInner = forwardRef<VideoBackgroundHandle, VideoBackgroundProps>(
  function VideoBackground(
    { videoId, volume, muted, isPlaying, captionLang, onEnded, onPlayingChange, onUnplayable, onApiUnavailable },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YT.Player | null>(null)
    const readyRef = useRef(false)
    const requestedIdRef = useRef(videoId)
    const volumeRef = useRef(volume)
    volumeRef.current = volume
    const mutedRef = useRef(muted)
    mutedRef.current = muted
    const onEndedRef = useRef(onEnded)
    onEndedRef.current = onEnded
    const onPlayingChangeRef = useRef(onPlayingChange)
    onPlayingChangeRef.current = onPlayingChange
    const onUnplayableRef = useRef(onUnplayable)
    onUnplayableRef.current = onUnplayable
    const onApiUnavailableRef = useRef(onApiUnavailable)
    onApiUnavailableRef.current = onApiUnavailable
    const captionLangRef = useRef(captionLang)
    captionLangRef.current = captionLang
    // Read at player-creation time: if videoId changes while the IFrame API is
    // still loading, the swap effect no-ops (no player yet) — creating with
    // the mount-time id would then play the wrong video.
    const videoIdRef = useRef(videoId)
    videoIdRef.current = videoId
    const isPlayingRef = useRef(isPlaying)
    isPlayingRef.current = isPlaying
    // Which video the saved position has been applied to — one resume per
    // video, not one per PLAYING event (pause/resume also fires PLAYING).
    const resumedForRef = useRef<string | null>(null)
    const captionRetryRef = useRef<number | undefined>(undefined)

    const rememberPosition = useCallback(() => {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      try {
        const loadedId = player.getVideoData?.()?.video_id
        // Never file the previous video's time under the newly requested id.
        if (loadedId && loadedId !== requestedIdRef.current) return
        const current = player.getCurrentTime()
        const duration = player.getDuration()
        if (Number.isFinite(current) && Number.isFinite(duration) && duration > 0) {
          savePosition(requestedIdRef.current, current, duration)
        }
      } catch { /* not ready */ }
    }, [])

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
      restart: () => {
        if (!readyRef.current) return
        try {
          savePosition(videoIdRef.current, 0, 0)
          playerRef.current?.seekTo(0, true)
          playerRef.current?.playVideo()
        } catch { /* player not ready */ }
      },
      seekBy: (deltaSeconds: number) => {
        const player = playerRef.current
        // Same defensiveness as getProgress: the YT.Player object exists
        // before its methods are wired up, and an arrow-key seek in that
        // window would throw.
        if (!player || !readyRef.current || !Number.isFinite(deltaSeconds)) return
        try {
          player.seekTo(Math.max(0, Math.min(player.getDuration(), player.getCurrentTime() + deltaSeconds)), true)
        } catch {
          /* player not ready */
        }
      },
      seekTo: (seconds: number) => {
        if (!readyRef.current || !Number.isFinite(seconds)) return
        try {
          const player = playerRef.current
          if (player) player.seekTo(Math.max(0, Math.min(player.getDuration(), seconds)), true)
        } catch {
          /* player not ready */
        }
      },
      getProgress: () => {
        const player = playerRef.current
        // The YT.Player object exists before its methods are wired up, and
        // they throw if called too early — hence the guard and the catch.
        if (!player || !readyRef.current) return null
        try {
          const loadedId = player.getVideoData?.()?.video_id
          if (loadedId && loadedId !== videoIdRef.current) return null
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
        if (!player?.getOption || !readyRef.current) return []
        try {
          const loadedId = player.getVideoData?.()?.video_id
          if (loadedId && loadedId !== videoIdRef.current) return []
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

      loadYouTubeIframeApi()
        .then((YT) => {
          if (cancelled || !containerRef.current) return
          requestedIdRef.current = videoIdRef.current
          playerRef.current = new YT.Player(containerRef.current, {
            videoId: videoIdRef.current,
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
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                if (cancelled) return
                readyRef.current = true
                event.target.setVolume(volumeRef.current)
                if (mutedRef.current || volumeRef.current <= 0) event.target.mute()
                else event.target.unMute()
                if (requestedIdRef.current !== videoIdRef.current) {
                  requestedIdRef.current = videoIdRef.current
                  event.target.loadVideoById(videoIdRef.current)
                }
                if (isPlayingRef.current) event.target.playVideo()
                else event.target.pauseVideo()
              },
              onStateChange: (event) => {
                if (cancelled) return
                const loadedId = event.target.getVideoData?.()?.video_id
                if (loadedId && loadedId !== videoIdRef.current) return
                if (event.data === YT.PlayerState.ENDED) {
                  // Watched to the end — drop the resume point.
                  savePosition(videoIdRef.current, 0, 0)
                  onEndedRef.current()
                } else if (event.data === YT.PlayerState.PLAYING) {
                  onPlayingChangeRef.current(true)
                  // Continue where you left off: applied once per video, on
                  // its first PLAYING (pause/resume fires PLAYING again).
                  if (resumedForRef.current !== videoIdRef.current) {
                    resumedForRef.current = videoIdRef.current
                    const saved = getSavedPosition(videoIdRef.current)
                    if (saved !== null) event.target.seekTo(Math.max(0, saved - 5), true)
                  }
                  // The tracklist doesn't exist until playback starts, and it's
                  // rebuilt per video — so re-apply the preference here rather
                  // than once on ready.
                  applyCaptions()
                } else if (event.data === YT.PlayerState.PAUSED) {
                  onPlayingChangeRef.current(false)
                }
              },
              onError: (event) => {
                if (cancelled) return
                const loadedId = event.target.getVideoData?.()?.video_id
                if (loadedId && loadedId !== videoIdRef.current) return
                if (isUnavailableVideo(event.data)) onUnplayableRef.current()
                else {
                  onPlayingChangeRef.current(false)
                  onApiUnavailableRef.current(playerErrorMessage(event.data))
                }
              },
            },
          })
        })
        .catch(() => {
          if (!cancelled) onApiUnavailableRef.current()
        })

      return () => {
        cancelled = true
        rememberPosition()
        readyRef.current = false
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

    // Flush on tab exit and visibility changes as well as the regular timer.
    useEffect(() => {
      const id = window.setInterval(rememberPosition, SAVE_POSITION_MS)
      window.addEventListener('pagehide', rememberPosition)
      document.addEventListener('visibilitychange', rememberPosition)
      return () => {
        window.clearInterval(id)
        window.removeEventListener('pagehide', rememberPosition)
        document.removeEventListener('visibilitychange', rememberPosition)
      }
    }, [rememberPosition])

    // Swap videos without recreating the player.
    useEffect(() => {
      if (!readyRef.current || requestedIdRef.current === videoId) return
      rememberPosition()
      window.clearTimeout(captionRetryRef.current)
      resumedForRef.current = null
      requestedIdRef.current = videoId
      playerRef.current?.loadVideoById(videoId)
    }, [videoId, rememberPosition])

    useEffect(() => {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      if (muted || volume <= 0) {
        player.mute()
      } else {
        player.unMute()
        player.setVolume(volume)
      }
    }, [volume, muted])

    useEffect(() => {
      const player = playerRef.current
      if (!player || !readyRef.current) return
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

// memo: the timer ticking in App re-renders the tree every second; this
// component's props only actually change on video/volume/caption changes.
export const VideoBackground = memo(VideoBackgroundInner)
