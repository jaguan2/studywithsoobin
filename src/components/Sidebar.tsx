import { motion, useDragControls } from 'framer-motion'
import type { Theme } from '../App'
import type { Video } from '../types/playlist'
import { usePanelSize } from '../hooks/usePanelSize'
import { ResizeGrip } from './ResizeGrip'
import { VideoPicker } from './VideoPicker'
import { VolumeControl } from './VolumeControl'
import { MusicPanel } from './MusicPanel'
import { AmbiencePanel } from './AmbiencePanel'

const GITHUB_URL = 'https://github.com/jaguan2'

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
  customColor: string
  onSetCustomColor: (hex: string) => void
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
  customColor,
  onSetCustomColor,
  zIndex,
  onFocus,
}: SidebarProps) {
  const dragControls = useDragControls()
  // min width chosen so the "Paste a YouTube or Spotify link…" placeholder
  // renders in full
  const { width, height, startResize } = usePanelSize({
    width: 340,
    minWidth: 340,
    maxWidth: 560,
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
      // visibility (not unmount) so music keeps playing and the dragged
      // position survives a minimize/restore cycle
      style={{
        width,
        height,
        left: 16,
        top: 232,
        zIndex,
        visibility: collapsed ? 'hidden' : 'visible',
      }}
      className="absolute flex select-none flex-col overflow-hidden rounded-2xl bg-cream-50/95 shadow-panel backdrop-blur-md dark:bg-ink-800/90"
    >
      <header
        onPointerDown={(e) => dragControls.start(e)}
        title="Drag to move"
        className="flex shrink-0 cursor-grab items-center justify-between px-4 py-3 active:cursor-grabbing"
      >
        <span className="text-lg font-semibold text-ink-900 dark:text-cream-100">
          study with soobin
        </span>
        <div className="flex items-center gap-2 text-ink-700 dark:text-cream-300">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="This project on GitHub"
            title="This project on GitHub"
            className="transition hover:text-clay-500"
          >
            <GitHubIcon />
          </a>
          <button
            onClick={onToggleCollapsed}
            aria-label="Minimize panel"
            title="Minimize"
            className="ml-1 grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200 dark:hover:bg-ink-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

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
                {/* Clicking the swatch both selects the custom theme and opens
                    the OS colour picker, so it's one control rather than two. */}
                <label
                  onClick={() => onSetTheme('custom')}
                  title="Custom colour — pick your own"
                  className={
                    'grid h-6 w-7 cursor-pointer place-items-center rounded-full transition ' +
                    (theme === 'custom'
                      ? 'bg-white shadow dark:bg-ink-900'
                      : 'opacity-45 hover:opacity-100')
                  }
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink-900/20"
                    style={{ background: customColor }}
                  />
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      onSetCustomColor(e.target.value)
                      onSetTheme('custom')
                    }}
                    aria-label="Custom colour theme"
                    className="sr-only"
                  />
                </label>
              </div>
            </footer>
      </div>
      <ResizeGrip onStart={startResize} />
    </motion.aside>
  )
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
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
