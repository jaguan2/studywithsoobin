import { useEffect, useRef, useState } from 'react'
import { loadYouTubeIframeApi } from '../hooks/useYouTubeIframeApi'
import { LiveBadge, Scrubber } from './Scrubber'

// A compact music player driven by the YouTube IFrame API instead of a bare
// embed, so we can offer real controls (play/pause, ±10s, seek, volume) at
// sidebar width — the native embed UI is unusable this small.
const POLL_MS = 500

interface YouTubeMusicPlayerProps {
  videoId: string
}

export function YouTubeMusicPlayer({ videoId }: YouTubeMusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [volume, setVolume] = useState(60)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLive, setIsLive] = useState(false)
  // Station links rot: YouTube livestreams get a fresh video id whenever the
  // stream restarts, and the old archived id usually has embedding disabled
  // (error 150). Without this the panel just showed a silent black box.
  const [error, setError] = useState(false)

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
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(60)
            event.target.playVideo()
            setReady(true)
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === YT.PlayerState.PLAYING)
            if (event.data === YT.PlayerState.PLAYING) {
              try {
                setIsLive(!!event.target.getVideoData?.()?.isLive)
              } catch {
                /* undocumented API — fall back to a normal seek bar */
              }
            }
          },
          onError: () => setError(true),
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
    // remounted per station via key={videoId}, so create-once is correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The IFrame API has no timeupdate event, so poll. Skipped for livestreams,
  // whose "duration" is a DVR window measured in weeks.
  useEffect(() => {
    if (!ready || isLive || error) return
    const id = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      try {
        const total = player.getDuration()
        const now = player.getCurrentTime()
        if (Number.isFinite(total)) setDuration(total)
        if (Number.isFinite(now)) setCurrent(now)
      } catch {
        /* player not ready yet */
      }
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [ready, isLive, error])

  const togglePlay = () => {
    const player = playerRef.current
    if (!player) return
    if (isPlaying) player.pauseVideo()
    else player.playVideo()
  }

  const seekBy = (delta: number) => {
    const player = playerRef.current
    if (!player) return
    player.seekTo(Math.max(0, player.getCurrentTime() + delta), true)
  }

  const changeVolume = (next: number) => {
    setVolume(next)
    playerRef.current?.setVolume(next)
  }

  if (error) {
    return (
      <div className="rounded-xl border border-cream-300 bg-white/80 px-3 py-3 text-xs text-ink-700 dark:border-ink-700 dark:bg-ink-800/80 dark:text-cream-300">
        <p className="font-medium">This station won't play here.</p>
        <p className="mt-1 opacity-75">
          Its owner disabled embedding, or the livestream restarted under a new link. Pick another
          station, or paste a link below.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cream-300 dark:border-ink-700">
      <div className="aspect-video w-full bg-black [&_iframe]:h-full [&_iframe]:w-full">
        <div ref={containerRef} />
      </div>

      <div className="flex items-center gap-2 bg-white/80 px-2 pt-1.5 dark:bg-ink-800/80">
        {isLive ? (
          <LiveBadge />
        ) : (
          <Scrubber
            current={current}
            duration={duration}
            onSeek={(seconds) => {
              playerRef.current?.seekTo(seconds, true)
              setCurrent(seconds)
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-1 bg-white/80 px-2 pb-1.5 pt-1 dark:bg-ink-800/80">
        <ControlButton onClick={() => seekBy(-10)} label="Back 10 seconds" disabled={!ready}>
          <SeekIcon direction="back" />
        </ControlButton>
        <ControlButton onClick={togglePlay} label={isPlaying ? 'Pause music' : 'Play music'} disabled={!ready} primary>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </ControlButton>
        <ControlButton onClick={() => seekBy(10)} label="Forward 10 seconds" disabled={!ready}>
          <SeekIcon direction="forward" />
        </ControlButton>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          aria-label="Music volume"
          className="ml-1 h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-cream-300 accent-clay-500 dark:bg-ink-700"
        />
      </div>
    </div>
  )
}

interface ControlButtonProps {
  onClick: () => void
  label: string
  disabled: boolean
  primary?: boolean
  children: React.ReactNode
}

function ControlButton({ onClick, label, disabled, primary, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={
        'grid h-7 w-7 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ' +
        (primary
          ? 'bg-clay-500 text-white hover:bg-clay-600'
          : 'text-ink-700 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-700')
      }
    >
      {children}
    </button>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  )
}

function SeekIcon({ direction }: { direction: 'back' | 'forward' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: direction === 'back' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
