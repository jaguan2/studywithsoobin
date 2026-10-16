import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { TimerApi } from '../hooks/useTimer'
import { TimerPanel } from './TimerPanel'

afterEach(() => vi.unstubAllGlobals())

const noop = () => {}
const timer: TimerApi = {
  label: '25:00', isRunning: false, durationSeconds: 1500, pomodoro: null,
  toggle: noop, pause: noop, reset: noop, setDurationSeconds: noop, nudge: noop,
  startPomodoro: noop, stopPomodoro: noop, skipBreak: noop,
}

describe('saved timer settings', () => {
  it.each(['null', '[]', '"invalid"', '{bad JSON', '{"focus":null,"break":-5,"rounds":"four"}'])(
    'renders a usable timer with malformed stored settings: %s', raw => {
      vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'sws.pomodoro' ? raw : null })
      const markup = renderToStaticMarkup(<TimerPanel timer={timer} pauseOnBreak={false} onSetPauseOnBreak={noop} />)
      expect(markup).toContain('25:00')
      expect(markup).toContain('Start focus')
      expect(markup).not.toContain('NaN')
    },
  )
})
