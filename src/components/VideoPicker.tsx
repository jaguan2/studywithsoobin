import { useState } from 'react'
import type { Video } from '../types/playlist'

const PAGE_SIZE = 8 // 4 columns x 2 rows, matching the LifeAt scenery grid

interface VideoPickerProps {
  videos: Video[]
  selectedId: string
  onSelect: (id: string) => void
}

export function VideoPicker({ videos, selectedId, onSelect }: VideoPickerProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(videos.length / PAGE_SIZE)
  const start = page * PAGE_SIZE
  const visible = videos.slice(start, start + PAGE_SIZE)

  const goPrev = () => setPage((p) => (p - 1 + pageCount) % pageCount)
  const goNext = () => setPage((p) => (p + 1) % pageCount)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-800">Pick a video to study with</h2>
        <div className="flex gap-1 text-ink-700">
          <button
            onClick={goPrev}
            aria-label="Previous videos"
            className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            onClick={goNext}
            aria-label="More videos"
            className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-cream-200"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {visible.map((video) => (
          <button
            key={video.id}
            onClick={() => onSelect(video.id)}
            title={video.title}
            className={
              'group relative aspect-square overflow-hidden rounded-lg ring-offset-2 transition ' +
              (video.id === selectedId
                ? 'ring-2 ring-clay-500'
                : 'ring-0 hover:ring-2 hover:ring-clay-400/60')
            }
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="14"
      height="14"
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
