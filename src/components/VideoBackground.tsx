import { useEffect, useRef } from 'react'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'

interface VideoBackgroundProps {
  videoId: string
  volume: number
  isPlaying: boolean
  onEnded: () => void
}

export function VideoBackground({ videoId, volume, isPlaying, onEnded }: VideoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

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
            if (event.data === YT.PlayerState.ENDED) onEndedRef.current()
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
    <div className="yt-bg-cover" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  )
}
