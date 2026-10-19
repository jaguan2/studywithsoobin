import { useEffect, useState } from 'react'
import playlistData from '../data/playlist.json'
import type { Playlist } from '../types/playlist'
import { cachedCatalog, downloadCatalog } from '../lib/remoteCatalog'

export function usePlaylist() {
  const [playlist, setPlaylist] = useState(() => cachedCatalog(playlistData as Playlist))
  const [isChecking, setIsChecking] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    // Keep the initial catalog usable while checking; cleanup cancels stale loads.
    void downloadCatalog(cachedCatalog(playlistData as Playlist), controller.signal).then(next => {
      if (cancelled) return
      setPlaylist(next)
      setIsChecking(false)
      window.clearTimeout(timeout)
    })
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])
  return { playlist, isChecking }
}
