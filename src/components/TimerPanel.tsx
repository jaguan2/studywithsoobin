import type { TimerMode } from '../hooks/usePomodoro'

const TABS: { mode: TimerMode; label: string }[] = [
  { mode: 'pomodoro', label: 'Pomodoro' },
  { mode: 'short', label: 'Short Break' },
  { mode: 'long', label: 'Long Break' },
]

interface TimerPanelProps {
  label: string
  mode: TimerMode
  isRunning: boolean
  onSwitchMode: (mode: TimerMode) => void
  onToggleRunning: () => void
  onReset: () => void
}

export function TimerPanel({
  label,
  mode,
  isRunning,
  onSwitchMode,
  onToggleRunning,
  onReset,
}: TimerPanelProps) {
  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-semibold tabular-nums text-ink-900">{label}</span>
        <button
          onClick={onToggleRunning}
          className="mb-1.5 rounded-full bg-clay-500 px-5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-clay-600"
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={onReset}
          aria-label="Reset timer"
          className="mb-1.5 grid h-8 w-8 place-items-center rounded-full text-ink-700 transition hover:bg-cream-200"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="mt-3 flex gap-4 text-sm text-ink-700">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onSwitchMode(tab.mode)}
            className={
              mode === tab.mode
                ? 'border-b-2 border-clay-500 pb-0.5 font-medium text-ink-900'
                : 'pb-0.5 opacity-60 hover:opacity-100'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
