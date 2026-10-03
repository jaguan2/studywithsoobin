import type { Video } from '../types/playlist'
import { videoMetadata } from '../lib/catalog'
import { HeartIcon } from './icons'

interface Props {
  video: Video
  favorite: boolean
  selected?: boolean
  onSelect: (id: string) => void
}

export function VideoTile({ video, favorite, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(video.id)}
      aria-pressed={selected}
      title={`${video.title}\n${videoMetadata(video)}${video.broadcastDate ? `\nOriginal live: ${video.broadcastDate}` : ''}`}
      className="catalog-video group min-w-0 text-left"
    >
      <div className="relative overflow-hidden rounded-xl bg-cream-200 dark:bg-ink-700">
        <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">{video.duration}</span>
        {favorite && <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-clay-500"><HeartIcon filled size={11} /></span>}
        {selected && <span className="absolute right-1 top-1 rounded bg-clay-500 px-1 text-[10px] text-white">Playing</span>}
      </div>
      <p className="catalog-video-title mt-2 line-clamp-2 text-xs font-medium leading-snug text-ink-800 dark:text-cream-200">{video.title}</p>
      <p className="catalog-video-meta mt-1 text-[11px]">{videoMetadata(video)}</p>
      {video.broadcastDate && <p className="catalog-video-meta mt-0.5 text-[11px]">Original live: {video.broadcastDate}</p>}
    </button>
  )
}
