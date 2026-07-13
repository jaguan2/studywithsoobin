import { useMemo, useState } from 'react'
import playlistData from './data/playlist.json'
import type { Playlist } from './types/playlist'
import { usePomodoro } from './hooks/usePomodoro'
import { VideoBackground } from './components/VideoBackground'
import { Sidebar } from './components/Sidebar'

const playlist = playlistData as Playlist

const TXT_CHANNEL_URL = 'https://www.youtube.com/@TOMORROWXTOGETHER?sub_confirmation=1'

function randomVideoId(excludeId?: string) {
  const pool = excludeId
    ? playlist.videos.filter((v) => v.id !== excludeId)
    : playlist.videos
  return pool[Math.floor(Math.random() * pool.length)].id
}

function loadFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('sws.favorites') ?? '[]')
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export default function App() {
  const [videoId, setVideoId] = useState(() => randomVideoId())
  const [volume, setVolume] = useState(40)
  const [collapsed, setCollapsed] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const { mode, switchMode, isRunning, toggleRunning, reset, label } = usePomodoro()

  const currentVideo = useMemo(
    () => playlist.videos.find((v) => v.id === videoId) ?? playlist.videos[0],
    [videoId],
  )

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      localStorage.setItem('sws.favorites', JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <VideoBackground
        videoId={videoId}
        volume={volume}
        isPlaying
        onEnded={() => setVideoId(randomVideoId(videoId))}
      />

      <div className="relative z-10 h-full">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          timerLabel={label}
          mode={mode}
          isRunning={isRunning}
          onSwitchMode={switchMode}
          onToggleRunning={toggleRunning}
          onResetTimer={reset}
          videos={playlist.videos}
          currentVideo={currentVideo}
          onSelectVideo={setVideoId}
          volume={volume}
          onVolumeChange={setVolume}
          playlistUrl={playlist.sourceUrl}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <a
          href={TXT_CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-cream-50/90 px-4 py-1.5 text-sm font-medium text-ink-900 shadow-panel backdrop-blur-md transition hover:bg-cream-100 dark:bg-ink-800/80 dark:text-cream-100 dark:hover:bg-ink-700"
        >
          Join MOA!
        </a>
        <button
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          className="grid h-9 w-9 place-items-center rounded-full bg-cream-50/90 text-ink-800 shadow-panel backdrop-blur-md transition hover:bg-cream-100 dark:bg-ink-800/80 dark:text-cream-100 dark:hover:bg-ink-700"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
