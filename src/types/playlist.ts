export interface Video {
  id: string
  title: string
  /** Display string, e.g. "1:29:21". */
  duration: string
  /** Numeric duration for sorting/filtering. Optional: only present in
   *  playlist.json snapshots fetched after it was added. */
  durationSeconds?: number
  thumbnail: string
}

export interface Playlist {
  title: string
  sourceUrl: string
  fetchedAt: string
  videos: Video[]
}
