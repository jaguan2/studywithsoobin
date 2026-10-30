import { useCallback, useEffect, useRef, useState } from 'react'
import playlistData from './data/playlist.json'
import type { Playlist } from './types/playlist'
import { useBreakNudge } from './hooks/useBreakNudge'
import { useTimer } from './hooks/useTimer'
import { useProgression } from './hooks/useProgression'
import { VideoBackground, type VideoBackgroundHandle } from './components/VideoBackground'
import { VideoControls } from './components/VideoControls'
import { Sidebar } from './components/Sidebar'
import { TasksCard } from './components/TasksCard'
import { SocialCard } from './components/SocialCard'
import { TimerCard } from './components/TimerCard'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AppearancePanel } from './components/AppearancePanel'
import { ProfileCard } from './components/ProfileCard'
import { UIIcon } from './components/UIIcon'
import { useAppearance } from './hooks/useAppearance'
import { useVideoCatalog } from './hooks/useVideoCatalog'
import { StudyTools } from './components/StudyTools'
import type { StudyToolId } from './lib/workspace'
import { storageGet, storageRemove, storageSet } from './lib/storage'

const playlist = playlistData as Playlist

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

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export default function App() {
  const [volume, setVolume] = useState(loadVolume)
  // Autoplay policy forces every freshly-created player to start muted, and
  // unmuting must come from an explicit user gesture — this tracks whether
  // that gesture (volume slider or the unmute chip) has happened for the
  // current player. Reset whenever the player is recreated.
  const [muted, setMuted] = useState(true)
  const { theme, setTheme, customColor, setCustomColor, panelOpacity, setPanelOpacity } = useAppearance()
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [captionLang, setCaptionLang] = useState<string | null>(loadCaptionLang)
  const [notice, setNotice] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [topPanel, setTopPanel] = useState<StudyToolId>('timer')
  // Zen mode: everything but the video disappears (Z toggles, Esc exits).
  const [zen, setZen] = useState(false)
  const [pauseOnBreak, setPauseOnBreak] = useState(() => storageGet('sws.pauseOnBreak') === '1')
  const videoRef = useRef<VideoBackgroundHandle>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const showNotice = useCallback((message: string, ms = 5000) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  const { progression, recordStudy, completeTask, updateProfile } = useProgression(showNotice)
  const timer = useTimer(25, recordStudy)
  const setTaskDuration = timer.setDurationSeconds
  const onBlocked = useCallback(() => {
    showNotice("That video won't play embedded — skipped to another one")
  }, [showNotice])
  const repeatCurrentVideo = useCallback(() => videoRef.current?.restart(), [])
  const {
    videoId, setVideoId, currentVideo, lastVideo, playable, filteredVideos,
    favorites, toggleFavorite, catalogFilters, setCatalogFilters,
    handleUnplayable, handleEnded, handleSurprise, handlePreviousVideo, handleNextVideo,
  } = useVideoCatalog(playlist.videos, onBlocked, repeatCurrentVideo)

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

  useEffect(() => { storageSet('sws.volume', String(volume)) }, [volume])

  // Every new player starts muted, including recovery after all embeds fail.
  useEffect(() => { if (videoId === null) setMuted(true) }, [videoId])

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

  const chooseCaptionLang = useCallback((code: string | null) => {
    setCaptionLang(code)
    if (code) storageSet('sws.captionLang', code)
    else storageRemove('sws.captionLang')
  }, [])

  const handleApiUnavailable = useCallback((message?: string) => {
    showNotice(message ?? 'Couldn’t reach YouTube — check your internet connection, then pick a video to retry', 8000)
  }, [showNotice])

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
      <StudyTools active={topPanel} onSelect={setTopPanel} hidden={dockCollapsed || zen}
        timerLabel={timer.label} timerRunning={timer.isRunning} panels={{
          timer: <TimerCard timer={timer} pauseOnBreak={pauseOnBreak} onSetPauseOnBreak={handleSetPauseOnBreak} />,
          sidebar: <Sidebar filters={catalogFilters} onFiltersChange={setCatalogFilters} videos={playable} currentVideo={currentVideo} onSelectVideo={setVideoId} volume={volume} onVolumeChange={handleVolumeChange} playlistUrl={playlist.sourceUrl} favorites={favorites} onToggleFavorite={toggleFavorite} theme={theme} onSetTheme={setTheme} customColor={customColor} onSetCustomColor={setCustomColor} />,
          tasks: <TasksCard onUseDuration={loadTaskDuration} onTaskCompleted={completeTask} />,
          profile: <ProfileCard progression={progression} onUpdateProfile={updateProfile} />,
          social: <SocialCard />,
        }} />
    </div>
  )
}
