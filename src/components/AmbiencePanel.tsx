import { useEffect, useState } from 'react'
import {
  startAmbience,
  stopAmbience,
  setAmbienceVolume,
  type AmbienceMode,
} from '../lib/ambience'

const OPTIONS: { key: AmbienceMode | 'off'; label: string; icon: string }[] = [
  { key: 'off', label: 'Off', icon: '🌤️' },
  { key: 'rain', label: 'Rain', icon: '🌧️' },
  { key: 'snow', label: 'Snow', icon: '❄️' },
  { key: 'storm', label: 'Storm', icon: '⛈️' },
]

export function AmbiencePanel() {
  const [ambienceMode, setAmbienceMode] = useState<AmbienceMode | 'off'>('off')
  const [volume, setVolume] = useState(0.5)

  useEffect(() => {
    startAmbience(ambienceMode, volume)
    // volume changes are handled below without restarting the noise source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambienceMode])

  useEffect(() => {
    setAmbienceVolume(volume)
  }, [volume])

  // stop the noise if the panel ever unmounts (e.g. back to welcome screen)
  useEffect(() => () => stopAmbience(), [])

  return (
    <div>
      <p className="text-sm font-semibold text-ink-800 dark:text-cream-200">🌦️ Ambience</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setAmbienceMode(option.key)}
            className={
              'rounded-full px-2.5 py-1 text-xs font-medium transition ' +
              (ambienceMode === option.key
                ? 'bg-clay-500 text-white'
                : 'bg-white/80 text-ink-700 hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800')
            }
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-[10px] text-ink-700/60 dark:text-cream-300/50">vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          disabled={ambienceMode === 'off'}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cream-300 accent-clay-500 disabled:opacity-40 dark:bg-ink-700"
        />
      </div>
      <p className="mt-1.5 text-[10px] text-ink-700/60 dark:text-cream-300/50">
        procedurally generated — no downloads, works offline
      </p>
    </div>
  )
}
