import { useEffect, useState } from 'react'
import {
  applyMix,
  resumeAmbience,
  setChannel,
  stopAllAmbience,
  SOUND_CHANNELS,
  type ChannelKey,
  type SoundMix,
} from '../lib/ambience'
import { storageGet, storageGetJson, storageRemove, storageSetJson } from '../lib/storage'
import { Slider } from './Slider'

const MIX_KEY = 'sws.ambience.mix'

/** The stored mix, migrating the pre-mixer single-mode keys
 *  (`sws.ambience.mode`/`.volume`) into a one-channel mix on first run. */
function loadMix(): SoundMix {
  const stored = storageGetJson<unknown>(MIX_KEY, null)
  if (stored && typeof stored === 'object') {
    const mix: SoundMix = {}
    for (const { key } of SOUND_CHANNELS) {
      const v = (stored as Record<string, unknown>)[key]
      if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1) mix[key] = v
    }
    return mix
  }
  const oldMode = storageGet('sws.ambience.mode')
  if (oldMode === 'rain' || oldMode === 'snow' || oldMode === 'storm') {
    const oldVolume = Number(storageGet('sws.ambience.volume'))
    storageRemove('sws.ambience.mode')
    storageRemove('sws.ambience.volume')
    return { [oldMode]: Number.isFinite(oldVolume) && oldVolume > 0 && oldVolume <= 1 ? oldVolume : 0.5 }
  }
  return {}
}

export function AmbiencePanel() {
  // Restored from the last session. This panel mounts after the user picks a
  // video (a click), so the AudioContext is allowed to start right away and
  // the mix resumes where they left it.
  const [mix, setMix] = useState<SoundMix>(loadMix)

  useEffect(() => {
    applyMix(mix)
    // subsequent changes go through changeChannel, which retunes one channel
    // instead of reapplying the whole mix
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep links skip the welcome click, so the restored mix may have started
  // against a suspended AudioContext — unstick it on the first real gesture.
  useEffect(() => {
    const resume = () => resumeAmbience()
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [])

  // stop the noise if the panel ever unmounts (e.g. back to welcome screen)
  useEffect(() => () => stopAllAmbience(), [])

  const changeChannel = (key: ChannelKey, volume: number) => {
    setChannel(key, volume)
    setMix((prev) => {
      const next = { ...prev }
      if (volume > 0) next[key] = volume
      else delete next[key]
      storageSetJson(MIX_KEY, next)
      return next
    })
  }

  const anyOn = SOUND_CHANNELS.some(({ key }) => (mix[key] ?? 0) > 0)

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-800 dark:text-cream-200">🌦️ Ambience</p>
        {anyOn && (
          <button
            onClick={() => {
              stopAllAmbience()
              setMix({})
              storageSetJson(MIX_KEY, {})
            }}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink-700 transition hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800"
          >
            Silence all
          </button>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        {SOUND_CHANNELS.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={
                'w-28 shrink-0 text-xs transition ' +
                ((mix[key] ?? 0) > 0
                  ? 'text-ink-800 dark:text-cream-200'
                  : 'text-ink-700/60 dark:text-cream-300/50')
              }
            >
              {icon} {label}
            </span>
            <Slider
              value={mix[key] ?? 0}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => changeChannel(key, v)}
              ariaLabel={`${label} volume`}
            />
          </div>
        ))}
      </div>

      <p className="mt-1.5 text-[10px] text-ink-700/60 dark:text-cream-300/50">
        layer as many as you like — procedurally generated, no downloads, works offline
      </p>
    </div>
  )
}
