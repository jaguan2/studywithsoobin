import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { Scrubber } from './Scrubber'
import type { CaptionTrack, VideoBackgroundHandle } from './VideoBackground'

// How often to ask the player where it is. The IFrame API has no timeupdate
// event, so this polls. It lives in its own component so the twice-a-second
// state update re-renders the pill and not the whole app.
const POLL_MS = 500

// Idle time before the controls fade, matching YouTube's ~3s.
const HIDE_AFTER_MS = 3000

interface VideoControlsProps {
  player: React.RefObject<VideoBackgroundHandle | null>
  /** Ancestor the pill may be dragged around inside — keeps it on screen. */
  bounds: React.RefObject<HTMLDivElement | null>
  isPlaying: boolean
  onTogglePlay: () => void
  captionLang: string | null
  onSetCaptionLang: (code: string | null) => void
}

export function VideoControls({
  player,
  bounds,
  isPlaying,
  onTogglePlay,
  captionLang,
  onSetCaptionLang,
}: VideoControlsProps) {
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  // Subtitle tracks differ per video and appear a beat after playback starts,
  // so they ride the same poll as the progress.
  const [tracks, setTracks] = useState<CaptionTrack[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  // True from pointerdown until release — covers scrubber drags that wander
  // off the pill, which `hovered` alone would miss.
  const [interacting, setInteracting] = useState(false)
  const [dragged, setDragged] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const dragControls = useDragControls()

  useEffect(() => {
    const id = window.setInterval(() => {
      const progress = player.current?.getProgress()
      if (progress) {
        setCurrent(progress.current)
        setDuration(progress.duration)
      }
      const next = player.current?.getCaptionTracks() ?? []
      // Only re-set when the list actually changes, or every poll would
      // hand React a new array and re-render the menu.
      setTracks((prev) =>
        prev.length === next.length && prev.every((t, i) => t.code === next[i].code) ? prev : next,
      )
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [player])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  // Reasons the controls must stay put, mirroring YouTube: a paused video keeps
  // its controls up, and anything the user is currently touching stays.
  const keepVisible = !isPlaying || hovered || menuOpen || interacting
  const keepVisibleRef = useRef(keepVisible)
  keepVisibleRef.current = keepVisible

  const bump = useCallback(() => {
    setVisible(true)
    window.clearTimeout(hideTimer.current)
    if (keepVisibleRef.current) return
    hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS)
  }, [])

  // YouTube brings its controls back on any movement over the player, not just
  // on hovering the controls themselves — far easier to hit than a small zone,
  // and it means the pill reappears wherever it was left.
  useEffect(() => {
    window.addEventListener('pointermove', bump)
    return () => {
      window.removeEventListener('pointermove', bump)
      window.clearTimeout(hideTimer.current)
    }
  }, [bump])

  // Show immediately when a hold-open reason appears; restart the countdown
  // when the last one clears.
  useEffect(() => {
    bump()
  }, [keepVisible, bump])

  useEffect(() => {
    if (!interacting) return
    const release = () => setInteracting(false)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [interacting])

  // A remembered language the current video doesn't carry: captions are off
  // for this one, so don't light the button up as if they were on.
  const activeTrack = tracks.find((t) => t.code === captionLang)
  // Once the pill has been dragged its position belongs to the user, so stop
  // auto-lifting it over the subtitles.
  const lift = !!activeTrack && !dragged

  return (
    // The pill's resting place. Centring lives out here, on purpose:
    // framer-motion owns the inline transform of whatever it drags, so the
    // -translate-x-1/2 has to sit on an element it isn't dragging.
    // `controls: 0` also means YouTube reserves no room for its own controls
    // and renders subtitles hard against the bottom of the frame — right where
    // this sits — so the resting place lifts when a track is on.
    // z-50 puts it above the draggable panels (z-30/40). It doesn't overlap
    // them where it rests, but once it's draggable it can be parked on top of
    // one — and a pill hidden *under* a panel could never be grabbed back.
    <div
      className={
        'pointer-events-none absolute left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 transition-[bottom] duration-300 ' +
        (lift ? 'bottom-24' : 'bottom-6')
      }
    >
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={bounds}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={() => setDragged(true)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={() => setInteracting(true)}
        className={
          'flex items-center gap-2 rounded-full bg-cream-50/90 px-3 py-2 shadow-panel backdrop-blur-md transition-opacity duration-300 dark:bg-ink-800/80 ' +
          (visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')
        }
      >
        <DragGrip onPointerDown={(e) => dragControls.start(e)} />

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

        {tracks.length > 0 && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Subtitles"
              aria-expanded={menuOpen}
              title={activeTrack ? `Subtitles: ${activeTrack.name}` : 'Subtitles'}
              className={
                'grid h-7 w-9 place-items-center rounded-md text-[10px] font-bold tracking-wide transition ' +
                (activeTrack
                  ? 'bg-clay-500 text-white'
                  : 'text-ink-700 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-700')
              }
            >
              CC
            </button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 max-h-64 w-40 overflow-y-auto rounded-xl bg-cream-50/95 p-1 shadow-panel backdrop-blur-md dark:bg-ink-800/95">
                <MenuItem
                  label="Off"
                  selected={!captionLang}
                  onClick={() => {
                    onSetCaptionLang(null)
                    setMenuOpen(false)
                  }}
                />
                {tracks.map((t) => (
                  <MenuItem
                    key={t.code}
                    label={t.name}
                    selected={captionLang === t.code}
                    onClick={() => {
                      onSetCaptionLang(t.code)
                      setMenuOpen(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

/** The pill is wall-to-wall buttons, so it gets an explicit grab handle rather
 *  than dragging from the body — same rule as the other panels. */
function DragGrip({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      title="Drag to move"
      aria-hidden="true"
      className="grid shrink-0 cursor-grab grid-cols-2 gap-[3px] px-1 active:cursor-grabbing"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-ink-700/30 dark:bg-cream-300/30" />
      ))}
    </div>
  )
}

function MenuItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'block w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition ' +
        (selected
          ? 'bg-clay-500 font-medium text-white'
          : 'text-ink-800 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-700')
      }
    >
      {label}
    </button>
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
