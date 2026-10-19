import type { Playlist, Video } from '../types/playlist'
import { storageGetJson, storageSetJson } from './storage'

export const CATALOG_CACHE_KEY = 'sws.catalog.v1'
export const CATALOG_URL = import.meta.env.VITE_CATALOG_URL ?? 'https://raw.githubusercontent.com/jaguan2/studywithsoobin/main/src/data/playlist.json'

const members = new Set(['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai'])
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const date = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

function isVideo(value: unknown): value is Video {
  if (!record(value)) return false
  return typeof value.id === 'string' && /^[\w-]{11}$/.test(value.id) &&
    typeof value.title === 'string' && value.title.length > 0 &&
    typeof value.duration === 'string' && /^\d+:\d{2}(?::\d{2})?$/.test(value.duration) &&
    typeof value.durationSeconds === 'number' && Number.isFinite(value.durationSeconds) && value.durationSeconds > 0 &&
    typeof value.thumbnail === 'string' && /^https:\/\/i\.ytimg\.com\//.test(value.thumbnail) &&
    Array.isArray(value.members) && value.members.length > 0 && value.members.every(member => typeof member === 'string' && members.has(member)) &&
    typeof value.kind === 'string' && ['vlog', 'live', 'other'].includes(value.kind) &&
    (value.publishedAt == null || date(value.publishedAt)) &&
    (value.broadcastDate == null || date(value.broadcastDate)) &&
    typeof value.channel === 'string'
}

/** Treat downloaded and cached JSON as untrusted; reject the whole snapshot. */
export function parseCatalog(value: unknown): Playlist | null {
  if (!record(value) || typeof value.title !== 'string' ||
    typeof value.sourceUrl !== 'string' || !value.sourceUrl.startsWith('https://www.youtube.com/playlist?list=') ||
    typeof value.fetchedAt !== 'string' || Number.isNaN(Date.parse(value.fetchedAt)) ||
    !Array.isArray(value.videos) || !value.videos.length || value.videos.length > 10_000 || !value.videos.every(isVideo)) return null
  if (new Set(value.videos.map(video => video.id)).size !== value.videos.length) return null
  return { title: value.title, sourceUrl: value.sourceUrl, fetchedAt: value.fetchedAt, videos: value.videos }
}

export function newerCatalog(current: Playlist, candidate: Playlist | null): Playlist {
  return candidate && Date.parse(candidate.fetchedAt) > Date.parse(current.fetchedAt) ? candidate : current
}

export function cachedCatalog(bundled: Playlist): Playlist {
  return newerCatalog(bundled, parseCatalog(storageGetJson<unknown>(CATALOG_CACHE_KEY, null)))
}

export async function downloadCatalog(current: Playlist, signal: AbortSignal, fetchImpl = fetch): Promise<Playlist> {
  try {
    const response = await fetchImpl(CATALOG_URL, { signal, cache: 'no-cache', credentials: 'omit' })
    if (!response.ok) return current
    const next = newerCatalog(current, parseCatalog(await response.json()))
    if (next !== current && !signal.aborted) storageSetJson(CATALOG_CACHE_KEY, next)
    return signal.aborted ? current : next
  } catch {
    return current
  }
}
