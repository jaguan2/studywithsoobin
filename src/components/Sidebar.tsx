import { memo } from 'react'
import type { Theme } from '../App'
import type { Video } from '../types/playlist'
import { VideoPicker } from './VideoPicker'
import { VolumeControl } from './VolumeControl'
import { MusicPanel } from './MusicPanel'
import { AmbiencePanel } from './AmbiencePanel'
import { ThemeSwitcher } from './ThemeSwitcher'
import { HeartIcon } from './icons'
import type { CatalogFilters } from '../lib/catalog'
import { videoMetadata } from '../lib/catalog'

const GITHUB_URL = 'https://github.com/jaguan2'

interface SidebarProps {
  filters: CatalogFilters
  onFiltersChange: (value: CatalogFilters) => void
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
}

function SidebarInner({
  filters,
  onFiltersChange,
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
}: SidebarProps) {
  const isFavorite = favorites.includes(currentVideo.id)

  return (
    <section className="flex min-w-0 flex-col" aria-label="Videos and sound">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold text-ink-900 dark:text-cream-100">
          Videos & sound
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
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-5 px-4 pb-4">
            <VideoPicker
              filters={filters}
              onFiltersChange={onFiltersChange}
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

            <div className="-mt-3 text-xs text-ink-700 dark:text-cream-300">
              <p>{videoMetadata(currentVideo)}</p>
              {currentVideo.broadcastDate && <p className="mt-1">Original live: {currentVideo.broadcastDate}</p>}
              {currentVideo.channel && <p className="mt-1">Channel: {currentVideo.channel}</p>}
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
                Original Soobin playlist
              </a>
            </div>

            <VolumeControl volume={volume} onChange={onVolumeChange} />

            <hr className="border-cream-300/60 dark:border-ink-700" />

            <MusicPanel />

            <AmbiencePanel />

            <footer className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-700/70 dark:text-cream-300/60">
              <span>made for MOA 🐰</span>
              <ThemeSwitcher
                theme={theme}
                onSetTheme={onSetTheme}
                customColor={customColor}
                onSetCustomColor={onSetCustomColor}
              />
            </footer>
      </div>
    </section>
  )
}

// memo: the timer ticking in App re-renders the tree every second; the
// sidebar's props only change on real interactions (video/theme/volume).
export const Sidebar = memo(SidebarInner)

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
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
