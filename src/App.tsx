import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import playlistData from './data/playlist.json'
import type { Playlist, Video } from './types/playlist'
import { useTimer } from './hooks/useTimer'
import { VideoBackground, type VideoBackgroundHandle } from './components/VideoBackground'
import { VideoControls } from './components/VideoControls'
import { Sidebar } from './components/Sidebar'
import { TimerCard } from './components/TimerCard'
import { WelcomeScreen } from './components/WelcomeScreen'
import { applyCustomTheme, clearCustomTheme, DEFAULT_CUSTOM_COLOR } from './lib/theme'
import { storageGet, storageGetJson, storageRemove, storageSet, storageSetJson } from './lib/storage'

const playlist = playlistData as Playlist

const TXT_CHANNEL_URL = 'https://www.youtube.com/@TOMORROWXTOGETHER?sub_confirmation=1'

export type Theme = 'light' | 'coffee' | 'dark' | 'custom'

function pickRandom(pool: Video[], excludeId?: string): string | null {
  const candidates = excludeId ? pool.filter((v) => v.id !== excludeId) : pool
  if (candidates.length === 0) return pool[0]?.id ?? null
  return candidates[Math.floor(Math.random() * candidates.length)].id
}

function loadFavorites(): string[] {
  const raw = storageGetJson<unknown>('sws.favorites', [])
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
}

function loadTheme(): Theme {
  const stored = storageGet('sws.theme')
  return stored === 'dark' || stored === 'coffee' || stored === 'custom' ? stored : 'light'
}

function loadCustomColor(): string {
  const stored = storageGet('sws.customColor')
  return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : DEFAULT_CUSTOM_COLOR
}

/** Preferred subtitle language, re-applied to every video that has it. */
function loadCaptionLang(): string | null {
  const stored = storageGet('sws.captionLang')
  return stored && /^[\w-]{2,10}$/.test(stored) ? stored : null
}

function loadVolume(): number {
  const stored = Number(storageGet('sws.volume'))
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : 40
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
  const [volume, setVolume] = useState(loadVolume)
  // Autoplay policy forces every freshly-created player to start muted, and
  // unmuting must come from an explicit user gesture — this tracks whether
  // that gesture (volume slider or the unmute chip) has happened for the
  // current player. Reset whenever the player is recreated.
  const [muted, setMuted] = useState(true)
  const [lastVideoId, setLastVideoId] = useState<string | null>(() => storageGet('sws.lastVideo'))
  const [collapsed, setCollapsed] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [customColor, setCustomColor] = useState<string>(loadCustomColor)
  const [captionLang, setCaptionLang] = useState<string | null>(loadCaptionLang)
  // videos YouTube refused to play embedded this session (copyright/embed
  // restrictions surface only at playback time, not in playlist metadata)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [timerCollapsed, setTimerCollapsed] = useState(false)
  const [topPanel, setTopPanel] = useState<'timer' | 'sidebar'>('sidebar')
  const videoRef = useRef<VideoBackgroundHandle>(null)
  // Constrains panel drags to the viewport — a panel flung past the edge
  // would otherwise be unrecoverable (the restore pill restores visibility,
  // not position).
  const rootRef = useRef<HTMLDivElement>(null)
  // The full-viewport overlay, used to keep a dragged control pill on screen.
  const overlayRef = useRef<HTMLDivElement>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const timer = useTimer(25)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('coffee', theme === 'coffee')
    // The custom palette is inline vars on :root, so it has to be cleared
    // when switching to a preset or it would keep overriding it.
    if (theme === 'custom') applyCustomTheme(customColor)
    else clearCustomTheme()
    storageSet('sws.theme', theme)
  }, [theme, customColor])

  useEffect(() => {
    storageSet('sws.customColor', customColor)
  }, [customColor])

  // Persisted from an effect rather than inside the setState updater:
  // updaters should be pure (StrictMode runs them twice), and localStorage
  // writes can throw.
  useEffect(() => {
    storageSetJson('sws.favorites', favorites)
  }, [favorites])

  useEffect(() => {
    storageSet('sws.volume', String(volume))
  }, [volume])

  // Remember the last video so the welcome screen can offer to continue it.
  useEffect(() => {
    if (videoId) {
      storageSet('sws.lastVideo', videoId)
      setLastVideoId(videoId)
    }
  }, [videoId])

  const playable = useMemo(
    () => playlist.videos.filter((v) => !blockedIds.includes(v.id)),
    [blockedIds],
  )

  const currentVideo = useMemo(
    () => playlist.videos.find((v) => v.id === videoId) ?? playlist.videos[0],
    [videoId],
  )

  const lastVideo = useMemo(
    () => playable.find((v) => v.id === lastVideoId) ?? null,
    [playable, lastVideoId],
  )

  const showNotice = useCallback((message: string, ms = 5000) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms)
  }, [])

  const chooseCaptionLang = useCallback((code: string | null) => {
    setCaptionLang(code)
    if (code) storageSet('sws.captionLang', code)
    else storageRemove('sws.captionLang')
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }, [])

  const handleUnplayable = useCallback(() => {
    if (!videoId || blockedIds.includes(videoId)) return
    setBlockedIds((prev) => [...prev, videoId])
    showNotice("That video won't play embedded — skipped to another one")
    setVideoId(pickRandom(playable.filter((v) => v.id !== videoId)))
  }, [videoId, blockedIds, playable, showNotice])

  const handleApiUnavailable = useCallback(() => {
    showNotice('Couldn’t reach YouTube — check your internet connection, then pick a video to retry', 8000)
  }, [showNotice])

  const handleEnded = useCallback(() => {
    setVideoId((prev) => pickRandom(playable, prev ?? undefined))
  }, [playable])

  const handleSurprise = useCallback(() => {
    setVideoId(pickRandom(playable))
  }, [playable])

  const handleTogglePlay = useCallback(() => setVideoPlaying((p) => !p), [])
  // The slider is an explicit gesture, so it may also unmute (autoplay policy).
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v)
    setMuted(false)
  }, [])
  const handleUnmute = useCallback(() => setMuted(false), [])
  const toggleSidebarCollapsed = useCallback(() => setCollapsed((c) => !c), [])
  const toggleTimerCollapsed = useCallback(() => setTimerCollapsed((c) => !c), [])
  const focusTimer = useCallback(() => setTopPanel('timer'), [])
  const focusSidebar = useCallback(() => setTopPanel('sidebar'), [])

  if (videoId === null) {
    return (
      <>
        <WelcomeScreen
          videos={playable}
          favorites={favorites}
          lastVideo={lastVideo}
          onSelect={setVideoId}
          onSurprise={handleSurprise}
        />
        {/* The timer keeps counting after "Change video" — show it, or its
            chime comes out of nowhere. */}
        {timer.isRunning && (
          <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/85 px-4 py-2 text-sm tabular-nums text-cream-100 shadow-panel backdrop-blur-md">
            ⏱ {timer.label}
            {timer.pomodoro && (timer.pomodoro.phase === 'focus' ? ' · 📖 focus' : ' · ☕ break')}
            {' · still running'}
          </div>
        )}
      </>
    )
  }

  return (
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden bg-black">
      <VideoBackground
        ref={videoRef}
        videoId={videoId}
        volume={volume}
        muted={muted}
        isPlaying={videoPlaying}
        captionLang={captionLang}
        onEnded={handleEnded}
        onPlayingChange={setVideoPlaying}
        onUnplayable={handleUnplayable}
        onApiUnavailable={handleApiUnavailable}
      />

      <TimerCard
        timer={timer}
        bounds={rootRef}
        zIndex={topPanel === 'timer' ? 40 : 30}
        onFocus={focusTimer}
        collapsed={timerCollapsed}
        onToggleCollapsed={toggleTimerCollapsed}
      />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        bounds={rootRef}
        videos={playable}
        currentVideo={currentVideo}
        onSelectVideo={setVideoId}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        playlistUrl={playlist.sourceUrl}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        theme={theme}
        onSetTheme={setTheme}
        customColor={customColor}
        onSetCustomColor={setCustomColor}
        zIndex={topPanel === 'sidebar' ? 40 : 30}
        onFocus={focusSidebar}
      />

      <div ref={overlayRef} className="pointer-events-none absolute inset-0">

        {/* Autoplay policy: every fresh player starts muted no matter what
            the slider shows. One explicit tap restores the saved volume. */}
        {muted && volume > 0 && (
          <button
            onClick={handleUnmute}
            className="pointer-events-auto absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink-900/85 px-4 py-1.5 text-sm font-medium text-cream-100 shadow-panel backdrop-blur-md transition hover:bg-ink-900"
          >
            🔇 Tap to unmute
          </button>
        )}

        <VideoControls
          player={videoRef}
          bounds={overlayRef}
          isPlaying={videoPlaying}
          onTogglePlay={handleTogglePlay}
          captionLang={captionLang}
          onSetCaptionLang={chooseCaptionLang}
        />

        <div className="pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-2">
          {/* Back to the welcome grid. Unmounting the main UI stops the music
              and the ambience, which is what "exit the video" should do. */}
          <button
            onClick={() => {
              setVideoId(null)
              // Returning here unmounts the player; its replacement will be
              // created muted again (autoplay policy), so track that.
              setMuted(true)
            }}
            aria-label="Back to video selection"
            title="Pick a different video"
            className="flex items-center gap-1.5 rounded-full bg-cream-50/90 px-3.5 py-1.5 text-sm font-medium text-ink-900 shadow-panel backdrop-blur-md transition hover:bg-cream-100 dark:bg-ink-800/80 dark:text-cream-100 dark:hover:bg-ink-700"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Change video
          </button>
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

        {/* z-50: the draggable panels are z-30/40 and would otherwise cover
            the toast when one happens to sit bottom-center. */}
        {notice && (
          <div className="absolute bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/85 px-4 py-2 text-sm text-cream-100 shadow-panel backdrop-blur-md">
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
