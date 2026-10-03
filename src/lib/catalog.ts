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
}
export const EMPTY_FILTERS: CatalogFilters = { member: '', year: '', month: '' }

export function filterVideos(videos: Video[], filters: CatalogFilters): Video[] {
  return videos.filter(video =>
    (!filters.member || video.members?.includes(filters.member)) &&
    (!filters.year || video.publishedAt?.slice(0, 4) === filters.year) &&
    (!filters.month || video.publishedAt?.slice(5, 7) === filters.month),
  )
}

export function videoMetadata(video: Video): string {
  const members = MEMBERS.filter(m => video.members?.includes(m.value)).map(m => m.label).join(', ')
  return [members, video.publishedAt?.slice(0, 7) ?? 'Release date unknown'].filter(Boolean).join(' · ')
}
