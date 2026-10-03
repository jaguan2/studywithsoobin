import { memo, useMemo } from 'react'
import type { Theme } from '../App'
import type { Video } from '../types/playlist'
import { ThemeSwitcher } from './ThemeSwitcher'
import { VideoTile } from './VideoTile'
import { CatalogFilters } from './CatalogFilters'
import { filterVideos, type CatalogFilters as Filters } from '../lib/catalog'

interface WelcomeScreenProps {
  runningTimer: string | null
  filters: Filters
  onFiltersChange: (value: Filters) => void
  videos: Video[]
  favorites: string[]
  /** The video from the previous session (if still playable), for one-click resume. */
  lastVideo: Video | null
  theme: Theme
  onSetTheme: (theme: Theme) => void
  customColor: string
  onSetCustomColor: (hex: string) => void
  onSelect: (id: string) => void
  onSurprise: () => void
}

function WelcomeScreenInner({
  runningTimer,
  filters,
  onFiltersChange,
  videos,
  favorites,
  lastVideo,
  theme,
  onSetTheme,
  customColor,
  onSetCustomColor,
  onSelect,
  onSurprise,
}: WelcomeScreenProps) {
  const sorted = useMemo(() => filterVideos(videos, filters, favorites), [videos, filters, favorites])

  return (
    <div className="catalog-welcome min-h-screen w-full">
      <div className="flex justify-end px-4 pt-4">
        <ThemeSwitcher
          theme={theme}
          onSetTheme={onSetTheme}
          customColor={customColor}
          onSetCustomColor={onSetCustomColor}
        />
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-ink-900 dark:text-cream-100">
            study with soobin 🐰
          </h1>
          <p className="mt-2 text-sm text-ink-700 dark:text-cream-300">
            Pick a TXT vlog or live to study with today — all five members are here
          </p>
          <button
            onClick={onSurprise}
            disabled={sorted.length === 0}
            className="mt-4 rounded-full bg-clay-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-clay-600 disabled:opacity-50"
          >
            🎲 Surprise me
          </button>
          {lastVideo && (
            <button
              onClick={() => onSelect(lastVideo.id)}
              className="mx-auto mt-3 flex max-w-full items-center gap-1.5 text-sm text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
            >
              <span className="shrink-0">▶ Continue where you left off:</span>
              <span className="max-w-[18rem] truncate">{lastVideo.title}</span>
            </button>
          )}
        </header>
        {runningTimer && <p role="status" className="mt-4 rounded-xl bg-cream-100 px-4 py-2 text-center text-sm text-ink-800 dark:bg-ink-800 dark:text-cream-200">⏱ {runningTimer} · timer still running</p>}
        <div className="mt-8">
          <CatalogFilters videos={videos} value={filters} onChange={onFiltersChange} />
          <p className="mt-4 text-xs text-ink-700 dark:text-cream-300">{sorted.length} of {videos.length} videos</p>
          {videos.length > 0 && sorted.length === 0 && <p className="mt-4 text-sm text-ink-700 dark:text-cream-300">No videos match these filters. Try changing or clearing your filters.</p>}
        </div>

        {/* every video can end up session-blocked (embeds refused at play
            time) — without this the grid is just silently empty */}
        {videos.length === 0 && (
          <p className="mt-16 text-center text-sm text-ink-700 dark:text-cream-300">
            Nothing playable right now — every video refused to embed this session.
            <br />
            Reload the page to try again.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map(video => <VideoTile key={video.id} video={video} favorite={favorites.includes(video.id)} onSelect={onSelect} />)}
        </div>
      </div>
    </div>
  )
}

// memo: the timer keeps ticking in App while the welcome screen is shown
// (after "Change video"); nothing here depends on it.
export const WelcomeScreen = memo(WelcomeScreenInner)
