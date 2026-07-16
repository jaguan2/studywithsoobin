import { useEffect, useState } from 'react'
import { Scrubber } from './Scrubber'
import type { VideoBackgroundHandle } from './VideoBackground'

// How often to ask the player where it is. The IFrame API has no timeupdate
// event, so this polls. It lives in its own component so the twice-a-second
// state update re-renders the pill and not the whole app.
const POLL_MS = 500

interface VideoControlsProps {
  player: React.RefObject<VideoBackgroundHandle | null>
  isPlaying: boolean
  onTogglePlay: () => void
}

export function VideoControls({ player, isPlaying, onTogglePlay }: VideoControlsProps) {
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      const progress = player.current?.getProgress()
      if (!progress) return
      setCurrent(progress.current)
      setDuration(progress.duration)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [player])

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-full bg-cream-50/90 px-3 py-2 shadow-panel backdrop-blur-md dark:bg-ink-800/80">
      <button
        onClick={() => player.current?.seekBy(-10)}
        aria-label="Back 10 seconds"
        title="Back 10 seconds"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-700"
      >
        <SeekIcon direction="back" />
      </button>
      <button
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        title={isPlaying ? 'Pause video' : 'Play video'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600"
      >
        {isPlaying ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button
        onClick={() => player.current?.seekBy(10)}
        aria-label="Forward 10 seconds"
        title="Forward 10 seconds"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-700"
      >
        <SeekIcon direction="forward" />
      </button>

      <div className="ml-1 flex min-w-0 flex-1 items-center gap-2">
        <Scrubber
          current={current}
          duration={duration}
          onSeek={(seconds) => {
            player.current?.seekTo(seconds)
            setCurrent(seconds)
          }}
        />
      </div>
    </div>
  )
}

function SeekIcon({ direction }: { direction: 'back' | 'forward' }) {
  return (
    <svg
      width="15"
      height="15"
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
