import type { ReactNode } from 'react'
import { STUDY_TOOLS, type StudyToolId } from '../lib/workspace'
import { UIIcon } from './UIIcon'

interface StudyToolsProps {
  active: StudyToolId
  onSelect: (id: StudyToolId) => void
  hidden: boolean
  panels: Record<StudyToolId, ReactNode>
  timerLabel: string
  timerRunning: boolean
}

/** Hidden panels stay mounted so timers, edits and audio survive navigation. */
export function StudyTools({ active, onSelect, hidden, panels, timerLabel, timerRunning }: StudyToolsProps) {
  return (
    <aside id="workspace-tools" className="workspace-dock" hidden={hidden} aria-label="Study tools">
      <div className="tool-tabs" role="tablist" aria-label="Study tools"
        style={{ gridTemplateColumns: `repeat(${STUDY_TOOLS.length}, minmax(0, 1fr))` }}>
        {STUDY_TOOLS.map(tool => <button key={tool.id} id={`tab-${tool.id}`} role="tab"
          aria-selected={active === tool.id} aria-controls={`tool-${tool.id}`}
          onClick={() => onSelect(tool.id)} className={'tool-tab' + (active === tool.id ? ' selected' : '')}>
          <UIIcon name={tool.icon} size={17} /><span>{tool.label}</span>
        </button>)}
      </div>
      <div className="tool-body scrollbar-thin">
        {STUDY_TOOLS.map(tool => <div key={tool.id} role="tabpanel" id={`tool-${tool.id}`}
          aria-labelledby={`tab-${tool.id}`} hidden={active !== tool.id}>{panels[tool.id]}</div>)}
      </div>
      {active !== 'timer' && <div className="dock-timer"><button onClick={() => onSelect('timer')} aria-label="Open timer">
        <UIIcon name="timer" size={16} /><span>{timerLabel}</span>
        <span className="timer-status">{timerRunning ? 'Running' : 'Open timer'}</span>
      </button></div>}
    </aside>
  )
}
