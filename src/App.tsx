import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Video } from './types/playlist'
import { usePlaylist } from './hooks/usePlaylist'
import { useBreakNudge } from './hooks/useBreakNudge'
import { useTimer } from './hooks/useTimer'
import { useProgression } from './hooks/useProgression'
import { VideoBackground, type VideoBackgroundHandle } from './components/VideoBackground'
import { VideoControls } from './components/VideoControls'
import { Sidebar } from './components/Sidebar'
import { TasksCard } from './components/TasksCard'
import { TimerCard } from './components/TimerCard'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AppearancePanel } from './components/AppearancePanel'
import { ProfileCard, ProfileLevelButton } from './components/ProfileCard'
import { UIIcon } from './components/UIIcon'
import { applyCustomTheme, clearCustomTheme, DEFAULT_CUSTOM_COLOR } from './lib/theme'
import { storageGet, storageGetJson, storageRemove, storageSet, storageSetJson } from './lib/storage'
import { adjacentVideo, EMPTY_FILTERS, filterVideos, type CatalogFilters } from './lib/catalog'

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
  const raw = storageGet('sws.volume')
  if (raw === null) return 40 // Number(null) is 0 — don't let it pass as valid
  const stored = Number(raw)
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : 40
}

function loadPanelOpacity(): number {
  const raw = storageGet('sws.panelOpacity')
  const value = raw === null || raw.trim() === '' ? 88 : Number(raw)
  return Number.isFinite(value) ? Math.max(65, Math.min(100, Math.round(value))) : 88
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export default function App() {
  const { playlist, isChecking } = usePlaylist()
  const pendingDeepLink = useRef(new URLSearchParams(window.location.search).get('v'))
  // null until the user picks a video on the welcome screen — unless the URL
  // deep-links one (?v=<id>), which skips the welcome screen entirely.
  const [videoId, setVideoId] = useState<string | null>(() => {
    const v = new URLSearchParams(window.location.search).get('v')
    return v && playlist.videos.some((video) => video.id === v) ? v : null
  })
  // A first-time link can name a video that exists only in the downloaded catalog.
  useEffect(() => {
    if (videoId !== null) pendingDeepLink.current = null
    if (isChecking) return
    const id = pendingDeepLink.current
    pendingDeepLink.current = null
    if (id && playlist.videos.some(video => video.id === id)) setVideoId(id)
  }, [isChecking, playlist, videoId])
  const [volume, setVolume] = useState(loadVolume)
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_FILTERS)
  // Autoplay policy forces every freshly-created player to start muted, and
  // unmuting must come from an explicit user gesture — this tracks whether
  // that gesture (volume slider or the unmute chip) has happened for the
  // current player. Reset whenever the player is recreated.
  const [muted, setMuted] = useState(true)
  const [lastVideoId, setLastVideoId] = useState<string | null>(() => storageGet('sws.lastVideo'))
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [customColor, setCustomColor] = useState<string>(loadCustomColor)
  const [panelOpacity, setPanelOpacity] = useState(loadPanelOpacity)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [captionLang, setCaptionLang] = useState<string | null>(loadCaptionLang)
  // videos YouTube refused to play embedded this session (copyright/embed
  // restrictions surface only at playback time, not in playlist metadata)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [topPanel, setTopPanel] = useState<'timer' | 'sidebar' | 'tasks' | 'profile'>('timer')
  // Zen mode: everything but the video disappears (Z toggles, Esc exits).
  const [zen, setZen] = useState(false)
  // WebView can retain the document's small-layout scroll offset when the
  // window expands, clipping the toolbar and leaving empty space below.
  useEffect(() => {
    if (!videoId) return
    const wideLayout = window.matchMedia('(min-width: 1000px) and (min-height: 600px)')
    const resetScroll = () => {
      if (wideLayout.matches || dockCollapsed || zen) window.scrollTo(0, 0)
    }
    resetScroll()
    window.addEventListener('resize', resetScroll)
    return () => window.removeEventListener('resize', resetScroll)
  }, [videoId, dockCollapsed, zen])
  const [pauseOnBreak, setPauseOnBreak] = useState(() => storageGet('sws.pauseOnBreak') === '1')
  const videoRef = useRef<VideoBackgroundHandle>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const showNotice = useCallback((message: string, ms = 5000) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms)
  }, [])
  const { progression, recordStudy, completeTask, updateProfile } = useProgression(showNotice)
  const timer = useTimer(25, recordStudy)
  const setTaskDuration = timer.setDurationSeconds
  const openProfile = useCallback(() => { setDockCollapsed(false); setTopPanel('profile') }, [])

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

  useEffect(() => {
    document.documentElement.style.setProperty('--panel-opacity', String(panelOpacity / 100))
    storageSet('sws.panelOpacity', String(panelOpacity))
  }, [panelOpacity])

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
  // Leaving the video also unmounts the player, and its replacement will be
  // created muted (autoplay policy) — reset here rather than in the "Change
  // video" button, so every route back to the welcome screen is covered
  // (e.g. the last playable video turning out to be embed-blocked).
  useEffect(() => {
    if (videoId) {
      storageSet('sws.lastVideo', videoId)
      setLastVideoId(videoId)
    } else {
      setMuted(true)
    }
  }, [videoId])

  // Keep the URL shareable: ?v=<id> while a video plays, clean on the
  // welcome screen.
  useEffect(() => {
    if (isChecking && videoId === null && pendingDeepLink.current) return
    const url = new URL(window.location.href)
    if (videoId) url.searchParams.set('v', videoId)
    else url.searchParams.delete('v')
    window.history.replaceState(null, '', url)
  }, [videoId, isChecking])

  // The countdown lives in the tab title too, so it's visible from whatever
  // tab the actual studying happens in.
  useEffect(() => {
    document.title = timer.isRunning ? `⏱ ${timer.label} · study with soobin` : 'study with soobin'
  }, [timer.isRunning, timer.label])


  // Optional pomodoro tie-in: the video pauses for breaks, resumes for focus.
  // Driven by real focus↔break transitions only — the toggle is read from a
  // ref so flipping the checkbox mid-round doesn't restart a video the user
  // paused by hand, and entering/leaving pomodoro mode leaves playback alone.
  const pomodoroPhase = timer.pomodoro && !timer.pomodoro.completed ? timer.pomodoro.phase : null
  const pauseOnBreakRef = useRef(pauseOnBreak)
  pauseOnBreakRef.current = pauseOnBreak
  const prevPhaseRef = useRef<'focus' | 'break' | null>(null)
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = pomodoroPhase
    if (!pauseOnBreakRef.current || !pomodoroPhase || !prev || prev === pomodoroPhase) return
    setVideoPlaying(pomodoroPhase === 'focus')
  }, [pomodoroPhase])

  const playable = useMemo(
    () => playlist.videos.filter((v) => !blockedIds.includes(v.id)),
    [blockedIds, playlist],
  )

  // A catalog update may remove a video already playing. Keep its label and
  // playback until the user chooses another; the updated pickers omit it.
  const currentVideoRef = useRef(playlist.videos[0])
  const selectedVideo = playlist.videos.find(video => video.id === videoId)
  if (selectedVideo) currentVideoRef.current = selectedVideo
  const currentVideo = currentVideoRef.current
  const filteredVideos = useMemo(() => filterVideos(playable, catalogFilters, favorites), [playable, catalogFilters, favorites])

  const lastVideo = useMemo(
    () => playable.find((v) => v.id === lastVideoId) ?? null,
    [playable, lastVideoId],
  )

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
    setVideoId(pickRandom(filteredVideos.filter((v) => v.id !== videoId)))
  }, [videoId, blockedIds, filteredVideos, showNotice])

  const handleApiUnavailable = useCallback((message?: string) => {
    showNotice(message ?? 'Couldn’t reach YouTube — check your internet connection, then pick a video to retry', 8000)
  }, [showNotice])

  const handleEnded = useCallback(() => {
    const next = pickRandom(filteredVideos, videoId ?? undefined)
    if (next && next === videoId) videoRef.current?.restart()
    else setVideoId(next)
  }, [filteredVideos, videoId])

  const handleSurprise = useCallback(() => {
    setVideoId(pickRandom(filteredVideos))
  }, [filteredVideos])
  const handlePreviousVideo = useCallback(() => {
    setVideoId(prev => adjacentVideo(filteredVideos, prev, -1) ?? prev)
  }, [filteredVideos])
  const handleNextVideo = useCallback(() => {
    setVideoId(prev => adjacentVideo(filteredVideos, prev, 1) ?? prev)
  }, [filteredVideos])

  const handleTogglePlay = useCallback(() => setVideoPlaying((p) => !p), [])
  const loadTaskDuration = useCallback(
    (seconds: number) => {
      setTaskDuration(seconds)
      setDockCollapsed(false)
      setTopPanel('timer')
      showNotice(`Timer set to ${Math.round(seconds / 60)} minutes — press Start when you’re ready`, 4000)
    },
    [setTaskDuration, showNotice],
  )
  // The slider is an explicit gesture, so it may also unmute (autoplay policy).
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v)
    setMuted(false)
  }, [])
  const handleUnmute = useCallback(() => setMuted(false), [])
  const handleSetPauseOnBreak = useCallback((v: boolean) => {
    setPauseOnBreak(v)
    storageSet('sws.pauseOnBreak', v ? '1' : '0')
  }, [])

  // Gentle "you've been at it two hours" toast — presence-based, so stepping
  // away for five minutes counts as the break.
  const breakNudge = useCallback(
    (message: string) => showNotice(message, 10000),
    [showNotice],
  )
  useBreakNudge(breakNudge)

  // Keyboard shortcuts — the player has disablekb + no pointer events, so
  // every key is ours. Skipped while typing or when a control has focus
  // (space on a focused button already clicks it).
  const timerToggleRef = useRef(timer.toggle)
  timerToggleRef.current = timer.toggle
  useEffect(() => {
    if (videoId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (!(target instanceof HTMLElement)) return
      // Typing fields own every key.
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return
      }
      // Buttons/links own only their activation keys — a focused Start button
      // (focus lingers after any click) shouldn't swallow F/M/T/Z.
      if (['BUTTON', 'A', 'SUMMARY'].includes(target.tagName) && (e.key === ' ' || e.key === 'Enter')) {
        return
      }
      switch (e.key) {
        case ' ':
          e.preventDefault() // page scroll
          setVideoPlaying((p) => !p)
          break
        case 'ArrowLeft':
          videoRef.current?.seekBy(-10)
          break
        case 'ArrowRight':
          videoRef.current?.seekBy(10)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          setMuted((m) => !m) // a keypress is an explicit gesture too
          break
        case 't':
        case 'T':
          timerToggleRef.current()
          break
        case 'z':
        case 'Z':
          setZen((z) => {
            if (!z) showNotice('Zen mode — press Z to bring everything back', 4000)
            return !z
          })
          break
        case 'Escape':
          setZen(false)
          setAppearanceOpen(false)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoId, showNotice])

  if (videoId === null) {
    return (
      <>
        <WelcomeScreen
          progression={progression}
          onUpdateProfile={updateProfile}
          filters={catalogFilters}
          onFiltersChange={setCatalogFilters}
          videos={playable}
          favorites={favorites}
          lastVideo={lastVideo}
          theme={theme}
          onSetTheme={setTheme}
          customColor={customColor}
          onSetCustomColor={setCustomColor}
          onSelect={setVideoId}
          onSurprise={handleSurprise}
          runningTimer={timer.isRunning ? timer.label : null}
        />

      </>
    )
  }

  return (
    <div className={'study-workspace' + (dockCollapsed ? ' tools-hidden' : '') + (zen ? ' is-zen' : '')}>
      <header className="workspace-toolbar">
        <div className="min-w-0 flex-1">
          <p className="workspace-brand"><span className="brand-mark"><UIIcon name="leaf" size={20} /></span>study with soobin</p>
          <p className="workspace-video-title" title={currentVideo.title}>{currentVideo.title}</p>
        </div>
        <div className="toolbar-actions">
          {zen ? <button onClick={() => setZen(false)} className="workspace-button"><UIIcon name="leaf" />Exit zen</button> : <>
            {muted && volume > 0 && <button onClick={handleUnmute} className="workspace-button"><UIIcon name="volume" />Unmute</button>}
            <button onClick={() => setVideoId(null)} aria-label="Back to video selection" className="workspace-button"><UIIcon name="video" />Change video</button>
            <button onClick={() => setDockCollapsed(v => !v)} aria-expanded={!dockCollapsed} aria-controls="workspace-tools" className="workspace-button"><UIIcon name="panel" />{dockCollapsed ? 'Show tools' : 'Hide tools'}</button>
            <button onClick={() => { setDockCollapsed(false); setTopPanel('tasks') }} aria-controls="tool-tasks" className={'workspace-button' + (!dockCollapsed && topPanel === 'tasks' ? ' selected' : '')}><UIIcon name="tasks" />Tasks</button>
            <ProfileLevelButton progression={progression} onClick={openProfile} />
            <button onClick={() => setAppearanceOpen(value => !value)} aria-expanded={appearanceOpen} aria-controls="workspace-appearance" className={'workspace-button' + (appearanceOpen ? ' selected' : '')}><UIIcon name="palette" />Appearance</button>
            <button onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen (F)" className="workspace-button toolbar-icon"><UIIcon name="fullscreen" /></button>
            <button onClick={() => setZen(true)} aria-label="Zen mode — hide all panels" title="Zen mode (Z)" className="workspace-button toolbar-icon"><UIIcon name="leaf" /></button>
          </>}
        </div>
      </header>
      {appearanceOpen && !zen && <AppearancePanel theme={theme} onSetTheme={setTheme} customColor={customColor} onSetCustomColor={setCustomColor} opacity={panelOpacity} onSetOpacity={setPanelOpacity} />}
      {notice && <div role="status" className="workspace-notice">{notice}</div>}
      <main className="workspace-main">
        <div className="video-stage" aria-label="Study video">
          <VideoBackground ref={videoRef} videoId={videoId} volume={volume} muted={muted} isPlaying={videoPlaying} captionLang={captionLang} onEnded={handleEnded} onPlayingChange={setVideoPlaying} onUnplayable={handleUnplayable} onApiUnavailable={handleApiUnavailable} />
        </div>
        <div hidden={zen}>
          <VideoControls videoId={videoId} onPreviousVideo={handlePreviousVideo} onNextVideo={handleNextVideo} canNavigate={filteredVideos.some(v => v.id !== videoId)} player={videoRef} isPlaying={videoPlaying} onTogglePlay={handleTogglePlay} captionLang={captionLang} onSetCaptionLang={chooseCaptionLang} />
        </div>
      </main>
      <aside id="workspace-tools" className="workspace-dock" hidden={dockCollapsed || zen} aria-label="Study tools">
        <div className="tool-tabs" role="tablist" aria-label="Study tools">
          {([{ id: 'timer', label: 'Timer', icon: 'timer' }, { id: 'sidebar', label: 'Videos & sound', icon: 'headphones' }, { id: 'tasks', label: 'Tasks', icon: 'tasks' }, { id: 'profile', label: 'Profile', icon: 'user' }] as const).map(tab =>
            <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={topPanel === tab.id} aria-controls={`tool-${tab.id}`} onClick={() => setTopPanel(tab.id)} className={'tool-tab' + (topPanel === tab.id ? ' selected' : '')}><UIIcon name={tab.icon} size={17} /><span>{tab.label}</span></button>
          )}
        </div>
        <div className="tool-body scrollbar-thin">
          <div role="tabpanel" id="tool-timer" aria-labelledby="tab-timer" hidden={topPanel !== 'timer'}><TimerCard timer={timer} pauseOnBreak={pauseOnBreak} onSetPauseOnBreak={handleSetPauseOnBreak} /></div>
          <div role="tabpanel" id="tool-sidebar" aria-labelledby="tab-sidebar" hidden={topPanel !== 'sidebar'}><Sidebar filters={catalogFilters} onFiltersChange={setCatalogFilters} videos={playable} currentVideo={currentVideo} onSelectVideo={setVideoId} volume={volume} onVolumeChange={handleVolumeChange} playlistUrl={playlist.sourceUrl} favorites={favorites} onToggleFavorite={toggleFavorite} theme={theme} onSetTheme={setTheme} customColor={customColor} onSetCustomColor={setCustomColor} /></div>
          <div role="tabpanel" id="tool-tasks" aria-labelledby="tab-tasks" hidden={topPanel !== 'tasks'}><TasksCard onUseDuration={loadTaskDuration} onTaskCompleted={completeTask} /></div>
          <div role="tabpanel" id="tool-profile" aria-labelledby="tab-profile" hidden={topPanel !== 'profile'}><ProfileCard progression={progression} onUpdateProfile={updateProfile} /></div>
        </div>
        {topPanel !== 'timer' && <div className="dock-timer"><button onClick={() => setTopPanel('timer')} aria-label="Open timer"><UIIcon name="timer" size={16} /><span>{timer.label}</span><span className="timer-status">{timer.isRunning ? 'Running' : 'Open timer'}</span></button></div>}
      </aside>
    </div>
  )
}
