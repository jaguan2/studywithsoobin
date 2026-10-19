import { useState } from 'react'
import { parseTimeInput, type TimerApi } from '../hooks/useTimer'
import { formatFocusMinutes, getFocusGoal, getStreakDays, getTodayMinutes, saveFocusGoal } from '../lib/stats'
import { storageGetJson, storageSetJson } from '../lib/storage'
import { PauseIcon, PlayIcon } from './icons'
import { UIIcon } from './UIIcon'

const PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
]

function loadPomodoroConfig(): { focus: number; break: number; rounds: number } {
  const stored = storageGetJson<{ focus?: unknown; break?: unknown; rounds?: unknown }>('sws.pomodoro', {})
  const num = (value: unknown, fallback: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= max ? Math.round(value) : fallback
  return { focus: num(stored.focus, 25, 180), break: num(stored.break, 5, 60), rounds: num(stored.rounds, 4, 12) }
}

interface TimerPanelProps {
  timer: TimerApi
  pauseOnBreak: boolean
  onSetPauseOnBreak: (value: boolean) => void
}

export function TimerPanel({ timer, pauseOnBreak, onSetPauseOnBreak }: TimerPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showPomodoroForm, setShowPomodoroForm] = useState(false)
  const [initialConfig] = useState(loadPomodoroConfig)
  const [focusMin, setFocusMin] = useState(initialConfig.focus)
  const [breakMin, setBreakMin] = useState(initialConfig.break)
  const [rounds, setRounds] = useState(initialConfig.rounds)
  const [focusGoal, setFocusGoal] = useState(getFocusGoal)
  const pomo = timer.pomodoro
  const todayMinutes = getTodayMinutes()
  const streak = getStreakDays()
  const goalProgress = Math.min(100, (todayMinutes / focusGoal) * 100)

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

  return (
    <div className="focus-panel">
      <div className="focus-session">
        <p className="focus-eyebrow">{pomo?.completed ? 'Session complete' : pomo?.phase === 'break' ? 'Take a breath' : 'Time to focus'}</p>
        {editing ? <input autoFocus value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setEditing(false)
          }} placeholder="25 or 25:00" aria-label="Custom timer duration" className="focus-time focus-time-input" />
          : <button onClick={startEdit} title="Click to type a custom time" aria-label={`Timer ${timer.label}. Click to change duration`} className="focus-time">{timer.label}</button>}
        <p className="focus-caption">{pomo && !pomo.completed ? `${pomo.phase === 'focus' ? 'Focus' : 'Break'} · round ${pomo.round} of ${pomo.rounds}` : 'A little focus goes a long way.'}</p>
        {pomo && !pomo.completed && <div className="focus-rounds" aria-hidden="true">
          {Array.from({ length: pomo.rounds }, (_, index) => <span key={index} className={index < pomo.round ? 'complete' : ''} />)}
        </div>}
        <div className="focus-actions">
          <button onClick={timer.reset} aria-label="Reset timer" title="Reset timer" className="quiet-icon"><RefreshIcon /></button>
          <button onClick={timer.toggle} className="primary-button focus-start">{timer.isRunning ? <PauseIcon size={16} /> : <PlayIcon size={16} />}{timer.isRunning ? 'Pause' : pomo?.phase === 'break' && !pomo.completed ? 'Start break' : 'Start focus'}</button>
          <button onClick={startEdit} aria-label="Edit timer duration" title="Edit duration" className="quiet-icon"><UIIcon name="timer" /></button>
        </div>
        {timer.isRunning && <div className="focus-nudges">
          <button onClick={() => timer.nudge(-60)}>−1:00</button>
          <button onClick={() => timer.nudge(60)}>+1:00</button>
        </div>}
        {pomo && <div className="focus-pomodoro-status">
          {pomo.completed && <p>All {pomo.rounds} rounds done. Well done!</p>}
          {!pomo.completed && pomo.phase === 'break' && <button onClick={timer.skipBreak} className="text-action">Skip break</button>}
          <button onClick={timer.stopPomodoro} className="text-action">Exit Pomodoro</button>
        </div>}
      </div>

      <details className="timer-settings">
        <summary><span><UIIcon name="timer" size={16} />Session settings</span><UIIcon name="chevron" size={16} /></summary>
        <div className="timer-settings-body">
          {!pomo && <>
            <p className="surface-label">Choose a duration</p>
            <div className="timer-presets">
              {PRESETS.map(preset => <button key={preset.label} onClick={() => timer.setDurationSeconds(preset.seconds)} aria-pressed={timer.durationSeconds === preset.seconds}>{preset.label}</button>)}
              <button onClick={startEdit}>Custom</button>
            </div>
            <button onClick={() => setShowPomodoroForm(value => !value)} aria-expanded={showPomodoroForm} aria-controls="pomodoro-settings" className="pomodoro-toggle"><span>Pomodoro rounds</span><UIIcon name="chevron" size={15} /></button>
            {showPomodoroForm && <div id="pomodoro-settings" className="pomodoro-settings">
              <div className="pomodoro-fields">
                <NumberField label="Focus" value={focusMin} min={1} max={180} onChange={setFocusMin} suffix="min" />
                <NumberField label="Break" value={breakMin} min={1} max={60} onChange={setBreakMin} suffix="min" />
                <NumberField label="Rounds" value={rounds} min={1} max={12} onChange={setRounds} />
              </div>
              <label className="pause-break"><input type="checkbox" checked={pauseOnBreak} onChange={event => onSetPauseOnBreak(event.target.checked)} />Pause video during breaks</label>
              <button onClick={() => {
                storageSetJson('sws.pomodoro', { focus: focusMin, break: breakMin, rounds })
                timer.startPomodoro({ focusMinutes: focusMin, breakMinutes: breakMin, rounds })
                setShowPomodoroForm(false)
              }} className="primary-button pomodoro-start">Start {rounds} × {focusMin} min</button>
            </div>}
          </>}
          {pomo && <p className="focus-caption">{pomo.focusMinutes} min focus · {pomo.breakMinutes} min break · {pomo.rounds} rounds</p>}
          <div className="focus-goal-settings">
            <p className="surface-label">Daily focus goal</p>
            <div className="timer-presets">
              {[60, 120, 180].map(minutes => <button key={minutes} onClick={() => { setFocusGoal(minutes); saveFocusGoal(minutes) }} aria-pressed={focusGoal === minutes}>{minutes / 60} hour{minutes > 60 ? 's' : ''}</button>)}
            </div>
          </div>
        </div>
      </details>

      <div className="focus-stats">
        <div className="focus-stats-heading"><span className="surface-label">Today's focus</span><span>{Math.round(goalProgress)}%</span></div>
        <p className="focus-stats-value">{formatFocusMinutes(todayMinutes)}<span> / {formatFocusMinutes(focusGoal)}</span></p>
        <div className="focus-goal-track" role="progressbar" aria-label="Daily focus goal" aria-valuenow={Math.round(goalProgress)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${goalProgress}%` }} /></div>
        <p className="focus-stats-note">{streak > 1 ? `${streak} day streak. Keep your rhythm.` : 'Small sessions add up.'}</p>
      </div>
    </div>
  )
}

interface NumberFieldProps { label: string; value: number; min: number; max: number; onChange: (value: number) => void; suffix?: string }
function NumberField({ label, value, min, max, onChange, suffix }: NumberFieldProps) {
  return <label className="pomodoro-field"><span>{label}{suffix ? ` (${suffix})` : ''}</span><input type="number" value={value} min={min} max={max} onChange={event => onChange(Number(event.target.value))} /></label>
}

function RefreshIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" /></svg>
}
