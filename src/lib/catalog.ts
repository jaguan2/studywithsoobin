import type { Member, Video } from '../types/playlist'

export const MEMBERS: { value: Member; label: string }[] = [
  { value: 'soobin', label: 'Soobin' },
  { value: 'yeonjun', label: 'Yeonjun' },
  { value: 'beomgyu', label: 'Beomgyu' },
  { value: 'taehyun', label: 'Taehyun' },
  { value: 'hueningkai', label: 'Hueningkai' },
]
export interface CatalogFilters {
  member: Member | ''
  year: string
  month: string
  query?: string
  kind?: Video['kind'] | ''
  soloOnly?: boolean
  favoritesOnly?: boolean
  dateSource?: 'release' | 'original'
  sort?: 'playlist' | 'newest' | 'oldest' | 'longest' | 'shortest'
}
export const EMPTY_FILTERS: CatalogFilters = { member: '', year: '', month: '' }

export function catalogDate(video: Video, source: CatalogFilters['dateSource'] = 'release'): string | null {
  return (source === 'original' && video.kind === 'live' ? video.broadcastDate : video.publishedAt) ?? null
}

const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim()

export function filterVideos(videos: Video[], filters: CatalogFilters, favorites: string[] = []): Video[] {
  const terms = normalized(filters.query ?? '').split(/\s+/).filter(Boolean)
  const filtered = videos.filter(video =>
    (!filters.member || video.members?.includes(filters.member)) &&
    (!filters.kind || video.kind === filters.kind) &&
    (!filters.soloOnly || video.members?.length === 1) &&
    (!filters.favoritesOnly || favorites.includes(video.id)) &&
    (!filters.year || catalogDate(video, filters.dateSource)?.slice(0, 4) === filters.year) &&
    (!filters.month || catalogDate(video, filters.dateSource)?.slice(5, 7) === filters.month) &&
    terms.every(term => normalized([video.title, video.channel, video.id, ...(video.members ?? [])].join(' ')).includes(term)),
  )
  if (!filters.sort || filters.sort === 'playlist') return filtered
  return filtered.sort((a, b) => {
    if (filters.sort === 'longest' || filters.sort === 'shortest') {
      const seconds = (v: Video) => v.durationSeconds ?? v.duration.split(':').reduce((n, p) => n * 60 + Number(p), 0)
      return filters.sort === 'longest' ? seconds(b) - seconds(a) : seconds(a) - seconds(b)
    }
    const aDate = catalogDate(a, filters.dateSource)
    const bDate = catalogDate(b, filters.dateSource)
    // Undated entries belong at the end in both directions.
    if (!aDate || !bDate) return aDate ? -1 : bDate ? 1 : 0
    return filters.sort === 'newest' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
  })
}

/** Wrap through the filtered order; an excluded current video starts at an edge. */
export function adjacentVideo(videos: Video[], currentId: string | null, direction: -1 | 1): string | null {
  if (!videos.length) return null
  const index = videos.findIndex(v => v.id === currentId)
  if (index < 0) return videos[direction === 1 ? 0 : videos.length - 1].id
  return videos[(index + direction + videos.length) % videos.length].id
}

export function videoMetadata(video: Video): string {
  const members = MEMBERS.filter(m => video.members?.includes(m.value)).map(m => m.label).join(', ')
  return [members, video.kind === 'live' ? 'Live archive' : video.kind === 'vlog' ? 'Vlog' : '', video.publishedAt?.slice(0, 7) ?? 'Release date unknown'].filter(Boolean).join(' · ')
}
