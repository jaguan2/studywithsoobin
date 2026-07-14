// Resolves a pasted link (YouTube or Spotify) into a playable station
// descriptor. Ported from TaskNook's lib/musicLink.js + youtube.js + spotify.js.

export type SpotifyKind = 'playlist' | 'album' | 'track' | 'show' | 'episode'

export interface Station {
  provider: 'youtube' | 'spotify'
  id: string
  kind?: SpotifyKind
  label: string
  custom?: boolean
}

const YOUTUBE_PATTERN =
  /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/

const SPOTIFY_PATTERN =
  /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album|track|show|episode)\/([a-zA-Z0-9]+)/

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  const match = trimmed.match(YOUTUBE_PATTERN)
  if (match) return match[1]

  try {
    const v = new URL(trimmed).searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
  } catch {
    /* not a valid URL */
  }
  return null
}

function extractSpotifyEmbed(input: string): { kind: SpotifyKind; id: string } | null {
  const match = input.trim().match(SPOTIFY_PATTERN)
  if (!match) return null
  return { kind: match[1] as SpotifyKind, id: match[2] }
}

export function resolveMusicLink(input: string, label: string): Station | null {
  const youtubeId = extractYouTubeId(input)
  if (youtubeId) {
    return { provider: 'youtube', id: youtubeId, label, custom: true }
  }
  const spotify = extractSpotifyEmbed(input)
  if (spotify) {
    return { provider: 'spotify', id: spotify.id, kind: spotify.kind, label, custom: true }
  }
  return null
}

/** Stable identity for a station regardless of provider, used for selection/dedup. */
export function stationKey(station: Station): string {
  return `${station.provider}:${station.kind ?? ''}:${station.id}`
}
