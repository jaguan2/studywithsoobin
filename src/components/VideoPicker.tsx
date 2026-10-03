import { useState } from 'react'
import type { Video } from '../types/playlist'
import { HeartIcon } from './icons'
import { CatalogFilters } from './CatalogFilters'
import { filterVideos, videoMetadata, type CatalogFilters as Filters } from '../lib/catalog'

const PAGE_SIZE = 8 // 4 columns x 2 rows, matching the LifeAt scenery grid

interface VideoPickerProps {
  filters: Filters
  onFiltersChange: (value: Filters) => void
  videos: Video[]
  selectedId: string
  onSelect: (id: string) => void
  favorites: string[]
}

export function VideoPicker({ videos, selectedId, onSelect, favorites, filters, onFiltersChange }: VideoPickerProps) {
  const [page, setPage] = useState(0)
  const filtered = filterVideos(videos, filters)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // the list can shrink at runtime (embed-blocked videos get filtered out)
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  const goPrev = () => setPage((safePage - 1 + pageCount) % pageCount)
  const goNext = () => setPage((safePage + 1) % pageCount)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-cream-200">
          Study companions
        </h2>
        <div className="flex gap-0.5 text-ink-700 dark:text-cream-300">
          <button
            onClick={goPrev}
            aria-label="Previous videos"
            className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200 dark:hover:bg-ink-700"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            onClick={goNext}
            aria-label="More videos"
            className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200 dark:hover:bg-ink-700"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>
      <div className="mt-2">
        <CatalogFilters videos={videos} value={filters} onChange={value => { setPage(0); onFiltersChange(value) }} />
        <p className="mt-2 text-xs text-ink-700 dark:text-cream-300">{filtered.length} videos · Page {safePage + 1} of {pageCount}</p>
        {filtered.length === 0 && <p className="mt-2 text-xs text-ink-700 dark:text-cream-300">No videos match. Try changing or clearing the filters.</p>}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {visible.map((video) => {
          const selected = video.id === selectedId
          return (
            <button
              key={video.id}
              onClick={() => onSelect(video.id)}
              title={`${video.title} · ${videoMetadata(video)}`}
              className={
                'relative aspect-square rounded-xl border p-1 transition ' +
                (selected
                  ? 'border-clay-500 bg-clay-400/40 dark:bg-clay-500/30'
                  : 'border-cream-300 bg-white hover:border-clay-400/70 dark:border-ink-700 dark:bg-ink-700 dark:hover:border-clay-400/70')
              }
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="h-full w-full rounded-lg object-cover"
                loading="lazy"
              />
              {favorites.includes(video.id) && (
                <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white/90 text-clay-500 dark:bg-ink-800/90">
                  <HeartIcon filled size={9} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
