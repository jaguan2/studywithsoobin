export interface Video {
  id: string
  title: string
  duration: string
  thumbnail: string
}

export interface Playlist {
  title: string
  sourceUrl: string
  fetchedAt: string
  videos: Video[]
}
