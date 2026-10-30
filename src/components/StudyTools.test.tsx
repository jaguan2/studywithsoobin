import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { StudyTools } from './StudyTools'
import { STUDY_TOOLS, type StudyToolId } from '../lib/workspace'

let root: ReactTestRenderer | undefined
const mounted = vi.fn()
const unmounted = vi.fn()

function StatefulPanel({ id }: { id: StudyToolId }) {
  const [draft, setDraft] = useState('')
  useEffect(() => {
    mounted(id)
    return () => { unmounted(id) }
  }, [id])
  return <input aria-label={`${id} draft`} value={draft} onChange={event => setDraft(event.target.value)} />
}

function Harness({ hidden = false, running = false }: { hidden?: boolean; running?: boolean }) {
  const [active, setActive] = useState<StudyToolId>('timer')
  return <StudyTools active={active} onSelect={setActive} hidden={hidden}
    timerLabel="24:15" timerRunning={running} panels={{
      timer: <StatefulPanel id="timer" />,
      sidebar: <StatefulPanel id="sidebar" />,
      tasks: <StatefulPanel id="tasks" />,
      profile: <StatefulPanel id="profile" />,
      social: <StatefulPanel id="social" />,
    }} />
}

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => {
  if (root) act(() => { root!.unmount() })
  root = undefined
})

describe('study tools navigation', () => {
  it('retains drafts and mounted panels through tab changes and hiding the entire dock', () => {
    act(() => { root = create(<Harness />) })
    expect(mounted).toHaveBeenCalledTimes(STUDY_TOOLS.length)
    act(() => { root!.root.findByProps({ id: 'tab-tasks' }).props.onClick() })
    act(() => {
      root!.root.findByProps({ 'aria-label': 'tasks draft' }).props.onChange({ target: { value: 'An unfinished edit' } })
    })
    act(() => { root!.root.findByProps({ id: 'tab-social' }).props.onClick() })
    expect(root!.root.findByProps({ id: 'tool-tasks' }).props.hidden).toBe(true)

    act(() => { root!.update(<Harness hidden />) })
    expect(root!.root.findByType('aside').props.hidden).toBe(true)
    act(() => { root!.update(<Harness />) })
    act(() => { root!.root.findByProps({ id: 'tab-tasks' }).props.onClick() })

    expect(root!.root.findByProps({ 'aria-label': 'tasks draft' }).props.value).toBe('An unfinished edit')
    expect(root!.root.findByProps({ id: 'tool-tasks' }).props.hidden).toBe(false)
    expect(mounted).toHaveBeenCalledTimes(STUDY_TOOLS.length)
    expect(unmounted).not.toHaveBeenCalled()

    act(() => { root!.unmount() })
    root = undefined
    expect(unmounted).toHaveBeenCalledTimes(STUDY_TOOLS.length)
  })

  it('connects every tab to its labelled panel and updates selection consistently', () => {
    act(() => { root = create(<Harness />) })
    const tabs = root!.root.findAllByProps({ role: 'tab' })
    const panels = root!.root.findAllByProps({ role: 'tabpanel' })
    expect(root!.root.findByProps({ role: 'tablist' }).props['aria-label']).toBe('Study tools')
    expect(tabs).toHaveLength(STUDY_TOOLS.length)
    expect(panels).toHaveLength(STUDY_TOOLS.length)
    expect(new Set(tabs.map(tab => tab.props.id)).size).toBe(tabs.length)
    expect(new Set(panels.map(panel => panel.props.id)).size).toBe(panels.length)

    for (const tab of tabs) {
      const panel = root!.root.findByProps({ id: tab.props['aria-controls'] })
      expect(panel.props.role).toBe('tabpanel')
      expect(panel.props['aria-labelledby']).toBe(tab.props.id)
      act(() => { tab.props.onClick() })
      const selected = root!.root.findAllByProps({ role: 'tab' }).filter(item => item.props['aria-selected'])
      const visible = root!.root.findAllByProps({ role: 'tabpanel' }).filter(item => !item.props.hidden)
      expect(selected).toHaveLength(1)
      expect(selected[0].props.id).toBe(tab.props.id)
      expect(visible).toHaveLength(1)
      expect(visible[0].props.id).toBe(tab.props['aria-controls'])
    }
  })

  it('keeps the timer reachable from other tabs and hides its footer on the timer tab', () => {
    act(() => { root = create(<Harness />) })
    expect(root!.root.findAllByProps({ 'aria-label': 'Open timer' })).toHaveLength(0)
    act(() => { root!.root.findByProps({ id: 'tab-profile' }).props.onClick() })
    let footer = root!.root.findByProps({ 'aria-label': 'Open timer' })
    expect(footer.findAllByType('span').map(span => span.children.join(''))).toEqual(['24:15', 'Open timer'])

    act(() => { root!.update(<Harness running />) })
    footer = root!.root.findByProps({ 'aria-label': 'Open timer' })
    expect(footer.findAllByType('span').map(span => span.children.join(''))).toEqual(['24:15', 'Running'])
    act(() => { footer.props.onClick() })
    expect(root!.root.findByProps({ id: 'tab-timer' }).props['aria-selected']).toBe(true)
    expect(root!.root.findByProps({ id: 'tool-timer' }).props.hidden).toBe(false)
    expect(root!.root.findAllByProps({ 'aria-label': 'Open timer' })).toHaveLength(0)
  })
})
