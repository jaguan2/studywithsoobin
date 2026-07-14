import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'

export interface VideoBackgroundHandle {
  /** Seek relative to the current position (negative = backward). */
  seekBy: (deltaSeconds: number) => void
}

interface VideoBackgroundProps {
  videoId: string
  volume: number
  isPlaying: boolean
  onEnded: () => void
  /** Keeps the caller's play/pause state in sync with the real player state. */
  onPlayingChange: (playing: boolean) => void
  /** Fired when YouTube refuses to play the video in an embed (copyright /
   *  embed restrictions — error codes 2, 5, 100, 101, 150). */
  onUnplayable: () => void
}

export const VideoBackground = forwardRef<VideoBackgroundHandle, VideoBackgroundProps>(
  function VideoBackground(
    { videoId, volume, isPlaying, onEnded, onPlayingChange, onUnplayable },
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

    useImperativeHandle(ref, () => ({
      seekBy: (deltaSeconds: number) => {
        const player = playerRef.current
        if (!player) return
        player.seekTo(Math.max(0, player.getCurrentTime() + deltaSeconds), true)
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
        playerRef.current?.destroy()
        playerRef.current = null
      }
      // Player is intentionally created once; video/volume changes are handled below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
