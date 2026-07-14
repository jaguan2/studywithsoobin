import { motion, useDragControls } from 'framer-motion'
import type { Theme } from '../App'
import type { Video } from '../types/playlist'
import { usePanelSize } from '../hooks/usePanelSize'
import { ResizeGrip } from './ResizeGrip'
import { VideoPicker } from './VideoPicker'
import { VolumeControl } from './VolumeControl'
import { MusicPanel } from './MusicPanel'
import { AmbiencePanel } from './AmbiencePanel'

const SOCIALS = [
  {
    label: 'TXT on YouTube',
    href: 'https://www.youtube.com/@TOMORROWXTOGETHER',
    icon: <YouTubeIcon />,
  },
  {
    label: 'TXT on Instagram',
    href: 'https://www.instagram.com/txt.bighitent',
    icon: <InstagramIcon />,
  },
  {
    label: 'TXT on X',
    href: 'https://x.com/TXT_members',
    icon: <XIcon />,
  },
]

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light theme', icon: '☀️' },
  { value: 'coffee', label: 'Coffee theme', icon: '☕' },
  { value: 'dark', label: 'Dark theme', icon: '🌙' },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  videos: Video[]
  currentVideo: Video
  onSelectVideo: (id: string) => void
  volume: number
  onVolumeChange: (volume: number) => void
  playlistUrl: string
  favorites: string[]
  onToggleFavorite: (id: string) => void
  theme: Theme
  onSetTheme: (theme: Theme) => void
  zIndex: number
  onFocus: () => void
}

// A floating, draggable control panel — same framer-motion pattern as
// TaskNook's Drawer: the header is the drag handle, positioned with explicit
// left/top because framer-motion owns the inline transform.
export function Sidebar({
  collapsed,
  onToggleCollapsed,
  videos,
  currentVideo,
  onSelectVideo,
  volume,
  onVolumeChange,
  playlistUrl,
  favorites,
  onToggleFavorite,
  theme,
  onSetTheme,
  zIndex,
  onFocus,
}: SidebarProps) {
  const dragControls = useDragControls()
  const { width, height, startResize } = usePanelSize({
    width: 300,
    minWidth: 280,
    maxWidth: 520,
    height: Math.min(560, window.innerHeight - 240),
    minHeight: 320,
  })

  const isFavorite = favorites.includes(currentVideo.id)

  return (
    <motion.aside
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onPointerDownCapture={onFocus}
      style={{ width, height: collapsed ? 'auto' : height, left: 16, top: 232, zIndex }}
      className="absolute flex select-none flex-col overflow-hidden rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <header
        onPointerDown={(e) => dragControls.start(e)}
        title="Drag to move"
        className="flex shrink-0 cursor-grab items-center justify-between px-4 py-3 active:cursor-grabbing"
      >
        <span className="text-lg font-semibold text-ink-900 dark:text-cream-100">
          Study w/ Soobin
        </span>
        <div className="flex items-center gap-2 text-ink-700 dark:text-cream-300">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="transition hover:text-clay-500"
            >
              {s.icon}
            </a>
          ))}
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand panel' : 'Minimize panel'}
            className="ml-1 grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200 dark:hover:bg-ink-700"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: collapsed ? 'rotate(180deg)' : undefined }}
            >
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {!collapsed && (
        <>
          <div className="scrollbar-thin flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
            <VideoPicker
              videos={videos}
              selectedId={currentVideo.id}
              onSelect={onSelectVideo}
              favorites={favorites}
            />

            <div className="flex items-center justify-between gap-2 rounded-xl2 bg-cream-100 px-3 py-2.5 dark:bg-ink-700">
              <span
                className="truncate text-sm text-ink-800 dark:text-cream-200"
                title={currentVideo.title}
              >
                {currentVideo.title}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => onToggleFavorite(currentVideo.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={
                    'transition hover:scale-110 ' +
                    (isFavorite ? 'text-clay-500' : 'text-ink-700/50 dark:text-cream-300/50')
                  }
                >
                  <HeartIcon filled={isFavorite} />
                </button>
                <a
                  href={playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open the full playlist on YouTube"
                  className="text-ink-700/50 transition hover:text-clay-500 dark:text-cream-300/50"
                >
                  <ListIcon />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <a
                href={`https://www.youtube.com/watch?v=${currentVideo.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
              >
                Watch on YouTube
              </a>
              <a
                href={playlistUrl}
                target="_blank"
                rel="noreferrer"
                className="text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
              >
                Full playlist
              </a>
            </div>

            <VolumeControl volume={volume} onChange={onVolumeChange} />

            <hr className="border-cream-300/60 dark:border-ink-700" />

            <MusicPanel />

            <AmbiencePanel />

            <footer className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-700/70 dark:text-cream-300/60">
              <span>made for MOA 🐰</span>
              <div className="flex items-center gap-0.5 rounded-full bg-cream-200/70 p-0.5 dark:bg-ink-700">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => onSetTheme(t.value)}
                    aria-label={t.label}
                    title={t.label}
                    className={
                      'grid h-6 w-7 place-items-center rounded-full text-[12px] leading-none transition ' +
                      (theme === t.value
                        ? 'bg-white shadow dark:bg-ink-900'
                        : 'opacity-45 hover:opacity-100')
                    }
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
            </footer>
          </div>
          <ResizeGrip onStart={startResize} />
        </>
      )}
    </motion.aside>
  )
}

function YouTubeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23 7.5s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.3-1C16.6 4 12 4 12 4s-4.6 0-7.8.2c-.4.1-1.4.1-2.3 1-.7.7-.9 2.3-.9 2.3S.8 9.4.8 11.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.6.2 7.6.2s4.6 0 7.8-.2c.4-.1 1.4-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM9.7 15.2V8.7l6.1 3.3-6.1 3.2z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.8" cy="6.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.5 5.9L18.9 2zm-1.1 18.1h1.7L7.7 3.8H5.9l11.9 16.3z" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  )
}
