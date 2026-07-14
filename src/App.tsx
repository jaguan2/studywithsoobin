import { useEffect, useMemo, useRef, useState } from 'react'
import playlistData from './data/playlist.json'
import type { Playlist, Video } from './types/playlist'
import { useTimer } from './hooks/useTimer'
import { VideoBackground, type VideoBackgroundHandle } from './components/VideoBackground'
import { Sidebar } from './components/Sidebar'
import { TimerCard } from './components/TimerCard'
import { WelcomeScreen } from './components/WelcomeScreen'

const playlist = playlistData as Playlist

const TXT_CHANNEL_URL = 'https://www.youtube.com/@TOMORROWXTOGETHER?sub_confirmation=1'

export type Theme = 'light' | 'coffee' | 'dark'

function pickRandom(pool: Video[], excludeId?: string): string | null {
  const candidates = excludeId ? pool.filter((v) => v.id !== excludeId) : pool
  if (candidates.length === 0) return pool[0]?.id ?? null
  return candidates[Math.floor(Math.random() * candidates.length)].id
}

function loadFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('sws.favorites') ?? '[]')
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function loadTheme(): Theme {
  const stored = localStorage.getItem('sws.theme')
  return stored === 'dark' || stored === 'coffee' ? stored : 'light'
}

function RestoreChevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-60">
      <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export default function App() {
  // null until the user picks a video on the welcome screen
  const [videoId, setVideoId] = useState<string | null>(null)
  const [volume, setVolume] = useState(40)
  const [collapsed, setCollapsed] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  // videos YouTube refused to play embedded this session (copyright/embed
  // restrictions surface only at playback time, not in playlist metadata)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [timerCollapsed, setTimerCollapsed] = useState(false)
  const [topPanel, setTopPanel] = useState<'timer' | 'sidebar'>('sidebar')
  const videoRef = useRef<VideoBackgroundHandle>(null)
  const timer = useTimer(25)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('coffee', theme === 'coffee')
    localStorage.setItem('sws.theme', theme)
  }, [theme])

  const playable = useMemo(
    () => playlist.videos.filter((v) => !blockedIds.includes(v.id)),
    [blockedIds],
  )

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

  const handleUnplayable = () => {
    if (!videoId || blockedIds.includes(videoId)) return
    setBlockedIds((prev) => [...prev, videoId])
    setNotice("That video won't play embedded — skipped to another one")
    window.setTimeout(() => setNotice(null), 5000)
    setVideoId(pickRandom(playable.filter((v) => v.id !== videoId)))
  }

  if (videoId === null) {
    return (
      <WelcomeScreen
        videos={playable}
        favorites={favorites}
        onSelect={setVideoId}
        onSurprise={() => setVideoId(pickRandom(playable))}
      />
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <VideoBackground
        ref={videoRef}
        videoId={videoId}
        volume={volume}
        isPlaying={videoPlaying}
        onEnded={() => setVideoId(pickRandom(playable, videoId))}
        onPlayingChange={setVideoPlaying}
        onUnplayable={handleUnplayable}
      />

      <TimerCard
        timer={timer}
        zIndex={topPanel === 'timer' ? 40 : 30}
        onFocus={() => setTopPanel('timer')}
        collapsed={timerCollapsed}
        onToggleCollapsed={() => setTimerCollapsed((c) => !c)}
      />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        videos={playable}
        currentVideo={currentVideo}
        onSelectVideo={setVideoId}
        volume={volume}
        onVolumeChange={setVolume}
        playlistUrl={playlist.sourceUrl}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        theme={theme}
        onSetTheme={setTheme}
        zIndex={topPanel === 'sidebar' ? 40 : 30}
        onFocus={() => setTopPanel('sidebar')}
      />

      <div className="pointer-events-none absolute inset-0">

        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-cream-50/90 px-2 py-1.5 shadow-panel backdrop-blur-md dark:bg-ink-800/80">
          <button
            onClick={() => videoRef.current?.seekBy(-10)}
            aria-label="Back 10 seconds"
            title="Back 10 seconds"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'scaleX(-1)' }}>
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setVideoPlaying((p) => !p)}
            aria-label={videoPlaying ? 'Pause video' : 'Play video'}
            title={videoPlaying ? 'Pause video' : 'Play video'}
            className="grid h-9 w-9 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600"
          >
            {videoPlaying ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => videoRef.current?.seekBy(10)}
            aria-label="Forward 10 seconds"
            title="Forward 10 seconds"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-2">
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

        {notice && (
          <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink-900/85 px-4 py-2 text-sm text-cream-100 shadow-panel backdrop-blur-md">
            {notice}
          </div>
        )}

        {/* minimized panels dock here as restore pills */}
        {(timerCollapsed || collapsed) && (
          <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex items-center gap-2">
            {timerCollapsed && (
              <button
                onClick={() => setTimerCollapsed(false)}
                aria-label="Restore timer"
                className="flex items-center gap-2 rounded-full bg-cream-50/90 px-4 py-2 text-sm font-medium tabular-nums text-ink-900 shadow-panel backdrop-blur-md transition hover:bg-cream-100 dark:bg-ink-800/80 dark:text-cream-100 dark:hover:bg-ink-700"
              >
                ⏱ {timer.label}
                <RestoreChevron />
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                aria-label="Restore panel"
                className="flex items-center gap-2 rounded-full bg-cream-50/90 px-4 py-2 text-sm font-medium text-ink-900 shadow-panel backdrop-blur-md transition hover:bg-cream-100 dark:bg-ink-800/80 dark:text-cream-100 dark:hover:bg-ink-700"
              >
                🐰 study with soobin
                <RestoreChevron />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
