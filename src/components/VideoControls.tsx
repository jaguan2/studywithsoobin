import { memo, useEffect, useRef, useState } from 'react'
import { Scrubber } from './Scrubber'
import { PauseIcon, PlayIcon, SeekIcon, SkipIcon } from './icons'
import type { CaptionTrack, VideoBackgroundHandle } from './VideoBackground'

interface VideoControlsProps {
  videoId: string
  onPreviousVideo: () => void
  onNextVideo: () => void
  canNavigate: boolean
  player: React.RefObject<VideoBackgroundHandle | null>
  isPlaying: boolean
  onTogglePlay: () => void
  captionLang: string | null
  onSetCaptionLang: (code: string | null) => void
}

function VideoControlsInner({ videoId, onPreviousVideo, onNextVideo, canNavigate, player, isPlaying, onTogglePlay, captionLang, onSetCaptionLang }: VideoControlsProps) {
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tracks, setTracks] = useState<CaptionTrack[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setCurrent(0); setDuration(0); setTracks([]); setMenuOpen(false) }, [videoId])
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      const progress = player.current?.getProgress()
      if (progress) { setCurrent(progress.current); setDuration(progress.duration) }
      const next = player.current?.getCaptionTracks() ?? []
      setTracks(prev => prev.length === next.length && prev.every((t, i) => t.code === next[i].code) ? prev : next)
    }, 500)
    return () => window.clearInterval(id)
  }, [player])
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const activeTrack = tracks.find(t => t.code === captionLang)
  const buttonStyle = 'grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 disabled:opacity-40 dark:text-cream-200 dark:hover:bg-ink-700'
  return (
    <div ref={menuRef} className="workspace-controls" aria-label="Video controls">
      <div className="player-controls">
        <button onClick={onPreviousVideo} disabled={!canNavigate} aria-label="Previous video" title="Previous video in filtered order" className={buttonStyle}><SkipIcon direction="back" /></button>
        <button onClick={() => player.current?.seekBy(-10)} aria-label="Back 10 seconds" title="Back 10 seconds" className={buttonStyle}><SeekIcon direction="back" /></button>
        <button onClick={onTogglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'} title={isPlaying ? 'Pause video' : 'Play video'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600">{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
        <button onClick={() => player.current?.seekBy(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds" className={buttonStyle}><SeekIcon direction="forward" /></button>
        <button onClick={onNextVideo} disabled={!canNavigate} aria-label="Next video" title="Next video in filtered order" className={buttonStyle}><SkipIcon direction="forward" /></button>
        <div className="player-progress"><Scrubber key={videoId} current={current} duration={duration} onSeek={seconds => { player.current?.seekTo(seconds); setCurrent(seconds) }} /></div>
        {tracks.length > 0 && <button onClick={() => setMenuOpen(o => !o)} aria-label="Subtitles" aria-expanded={menuOpen} title={activeTrack ? `Subtitles: ${activeTrack.name}` : 'Subtitles'} className={buttonStyle + (activeTrack ? ' bg-clay-500 text-white' : '')}>CC</button>}
      </div>
      {menuOpen && <div className="caption-options" aria-label="Subtitle languages">
        {[{ code: '', name: 'Off' }, ...tracks].map(track => <button key={track.code} onClick={() => { onSetCaptionLang(track.code || null); setMenuOpen(false) }} aria-pressed={(captionLang ?? '') === track.code} className={'rounded-lg px-3 py-2 text-xs ' + ((captionLang ?? '') === track.code ? 'bg-clay-500 text-white' : 'bg-cream-100 text-ink-800 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-200')}>{track.name}</button>)}
      </div>}
    </div>
  )
}

export const VideoControls = memo(VideoControlsInner)
