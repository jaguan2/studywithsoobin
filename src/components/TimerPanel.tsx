import { useState } from 'react'
import { parseTimeInput, type TimerApi } from '../hooks/useTimer'

const PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
]

interface TimerPanelProps {
  timer: TimerApi
}

export function TimerPanel({ timer }: TimerPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showPomodoroForm, setShowPomodoroForm] = useState(false)
  const [focusMin, setFocusMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [rounds, setRounds] = useState(4)

  const startEdit = () => {
    timer.pause()
    setDraft(timer.label)
    setEditing(true)
  }

  const commit = () => {
    const seconds = parseTimeInput(draft)
    if (seconds !== null) timer.setDurationSeconds(seconds)
    setEditing(false)
  }

  const pomo = timer.pomodoro

  return (
    <div>
      <div className="flex items-center gap-3">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
            placeholder="25 or 25:00"
            aria-label="Custom timer duration"
            className="w-36 border-b-2 border-clay-500 bg-transparent text-[2rem] font-semibold leading-none tabular-nums text-ink-900 focus:outline-none dark:text-cream-100"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to type a custom time"
            className="text-[2.6rem] font-semibold leading-none tabular-nums text-ink-900 transition hover:text-clay-600 dark:text-cream-100 dark:hover:text-clay-400"
          >
            {timer.label}
          </button>
        )}
        <button
          onClick={timer.toggle}
          className="rounded-full bg-clay-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-clay-600"
        >
          {timer.isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={timer.reset}
          aria-label="Reset timer"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-700 transition hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-ink-800"
        >
          <RefreshIcon />
        </button>
      </div>

      {pomo ? (
        <div className="mt-3">
          {pomo.completed ? (
            <p className="text-sm font-medium text-clay-600 dark:text-clay-400">
              All {pomo.rounds} rounds done — great work! 🎉
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={
                  'rounded-full px-2.5 py-1 text-xs font-medium ' +
                  (pomo.phase === 'focus'
                    ? 'bg-clay-500 text-white'
                    : 'bg-white/80 text-ink-700 dark:bg-ink-800/80 dark:text-cream-300')
                }
              >
                {pomo.phase === 'focus' ? '📖 Focus' : '☕ Break'}
              </span>
              <span className="text-xs text-ink-700 dark:text-cream-300">
                round {pomo.round}/{pomo.rounds}
              </span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: pomo.rounds }, (_, i) => (
                  <span
                    key={i}
                    className={
                      'h-1.5 w-1.5 rounded-full ' +
                      (i < pomo.round ? 'bg-clay-500' : 'bg-cream-300 dark:bg-ink-800')
                    }
                  />
                ))}
              </span>
            </div>
          )}
          <button
            onClick={timer.stopPomodoro}
            className="mt-2 text-[11px] text-ink-700/60 underline-offset-2 hover:underline dark:text-cream-300/60"
          >
            exit pomodoro
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => timer.setDurationSeconds(preset.seconds)}
                className={
                  'rounded-full px-2.5 py-1 text-xs font-medium transition ' +
                  (timer.durationSeconds === preset.seconds
                    ? 'bg-clay-500 text-white'
                    : 'bg-white/80 text-ink-700 hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800')
                }
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setShowPomodoroForm((s) => !s)}
              className={
                'rounded-full px-2.5 py-1 text-xs font-medium transition ' +
                (showPomodoroForm
                  ? 'bg-clay-400/60 text-ink-900 dark:text-cream-100'
                  : 'bg-white/80 text-ink-700 hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800')
              }
            >
              🍅 Pomodoro
            </button>
          </div>

          {showPomodoroForm ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-ink-700 dark:text-cream-300">
                <NumberField label="Focus" value={focusMin} min={1} max={180} onChange={setFocusMin} suffix="min" />
                <NumberField label="Break" value={breakMin} min={1} max={60} onChange={setBreakMin} suffix="min" />
                <NumberField label="Rounds" value={rounds} min={1} max={12} onChange={setRounds} />
              </div>
              <button
                onClick={() => {
                  timer.startPomodoro({ focusMinutes: focusMin, breakMinutes: breakMin, rounds })
                  setShowPomodoroForm(false)
                }}
                className="w-full rounded-full bg-clay-500 py-1.5 text-xs font-medium text-white transition hover:bg-clay-600"
              >
                Start {rounds} × {focusMin} min with {breakMin} min breaks
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-ink-700/60 dark:text-cream-300/50">
              or click the time above to type your own
            </p>
          )}
        </>
      )}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  suffix?: string
}

function NumberField({ label, value, min, max, onChange, suffix }: NumberFieldProps) {
  return (
    <label className="flex flex-1 flex-col gap-0.5">
      <span className="text-[10px] opacity-70">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md bg-white/80 px-1.5 py-1 text-center tabular-nums text-ink-900 focus:outline-none focus:ring-1 focus:ring-clay-500 dark:bg-ink-800/80 dark:text-cream-100"
        />
        {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
      </span>
    </label>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
