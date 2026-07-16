import { useState } from 'react'
import { formatTime } from '../hooks/useTimer'

interface ScrubberProps {
  current: number
  duration: number
  /** Seek, and optimistically move `current` to the same spot — otherwise the
   *  time label snaps back to the old position until the next poll lands. */
  onSeek: (seconds: number) => void
}

/** Elapsed / total times either side of a seek bar. Shared by the background
 *  video's control pill and the music mini-player. */
export function Scrubber({ current, duration, onSeek }: ScrubberProps) {
  // Non-null only while the user is dragging, so a poll can't yank the handle
  // out from under them mid-drag.
  const [scrub, setScrub] = useState<number | null>(null)
  const seekable = duration > 0
  const value = scrub ?? current
  const played = seekable ? Math.min(100, (value / duration) * 100) : 0

  // Committing on release (rather than on every input event) means dragging
  // across the bar doesn't fire a seek per pixel. A plain click on the track
  // still works: it's a pointerdown/up pair, so it commits immediately.
  const commit = () => {
    if (scrub === null) return
    onSeek(scrub)
    setScrub(null)
  }

  return (
    <>
      <span className="shrink-0 text-[11px] tabular-nums text-ink-700 dark:text-cream-300">
        {formatTime(Math.floor(value))}
      </span>
      {/* A range input gives click-to-jump, drag-to-scrub and arrow-key
          seeking for free, and matches the volume sliders elsewhere. */}
      <input
        type="range"
        min={0}
        max={seekable ? duration : 100}
        step={1}
        value={seekable ? value : 0}
        disabled={!seekable}
        onChange={(e) => setScrub(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Seek video"
        style={{ '--played': `${played}%` } as React.CSSProperties}
        className="scrubber h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-clay-500 disabled:cursor-default disabled:opacity-40"
      />
      <span className="shrink-0 text-[11px] tabular-nums text-ink-700 dark:text-cream-300">
        {seekable ? formatTime(Math.floor(duration)) : '--:--'}
      </span>
    </>
  )
}

/** Livestreams report a duration (the DVR window — often weeks), so a seek bar
 *  would be meaningless. They get this instead. */
export function LiveBadge() {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-700 dark:text-cream-300">
        Live
      </span>
    </div>
  )
}
