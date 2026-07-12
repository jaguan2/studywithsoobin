import type { TimerMode } from '../hooks/usePomodoro'
import type { Video } from '../types/playlist'
import { TimerPanel } from './TimerPanel'
import { VideoPicker } from './VideoPicker'
import { VolumeControl } from './VolumeControl'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  timerLabel: string
  mode: TimerMode
  isRunning: boolean
  onSwitchMode: (mode: TimerMode) => void
  onToggleRunning: () => void
  onResetTimer: () => void
  videos: Video[]
  currentVideo: Video
  onSelectVideo: (id: string) => void
  volume: number
  onVolumeChange: (volume: number) => void
  playlistUrl: string
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  timerLabel,
  mode,
  isRunning,
  onSwitchMode,
  onToggleRunning,
  onResetTimer,
  videos,
  currentVideo,
  onSelectVideo,
  volume,
  onVolumeChange,
  playlistUrl,
}: SidebarProps) {
  return (
    <div className="relative h-full w-fit">
      <aside
        className={
          'h-full overflow-y-auto bg-cream-50/90 shadow-panel backdrop-blur-md transition-all duration-300 ' +
          (collapsed ? 'w-0 opacity-0' : 'w-[260px] opacity-100')
        }
      >
        <div className="flex h-full w-[260px] flex-col gap-6 p-5">
          <header className="flex items-center justify-between">
            <span className="text-lg font-semibold text-ink-900">Study w/ Soobin 🐰</span>
          </header>

          <TimerPanel
            label={timerLabel}
            mode={mode}
            isRunning={isRunning}
            onSwitchMode={onSwitchMode}
            onToggleRunning={onToggleRunning}
            onReset={onResetTimer}
          />

          <VideoPicker videos={videos} selectedId={currentVideo.id} onSelect={onSelectVideo} />

          <div className="flex items-center gap-2 rounded-xl2 bg-cream-100 px-3 py-2">
            <span className="truncate text-sm text-ink-800" title={currentVideo.title}>
              {currentVideo.title}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-700">
            <a
              href={`https://www.youtube.com/watch?v=${currentVideo.id}`}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-clay-400 underline-offset-2 hover:text-ink-900"
            >
              Watch on YouTube
            </a>
            <a
              href={playlistUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-clay-400 underline-offset-2 hover:text-ink-900"
            >
              Full playlist
            </a>
          </div>

          <VolumeControl volume={volume} onChange={onVolumeChange} />

          <footer className="mt-auto pt-4 text-xs text-ink-700/70">
            made for study sessions with{' '}
            <a
              href="https://www.youtube.com/playlist?list=PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-clay-400 underline-offset-2"
            >
              @TXT
            </a>
            's vlogs
          </footer>
        </div>
      </aside>

      <button
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-6 -right-4 grid h-8 w-8 place-items-center rounded-full bg-cream-50/90 text-ink-700 shadow-panel backdrop-blur-md transition hover:bg-cream-100"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: collapsed ? 'scaleX(-1)' : undefined }}
        >
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
