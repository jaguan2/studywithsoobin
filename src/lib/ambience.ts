// Procedural weather ambience using the Web Audio API — no audio files
// needed, works fully offline. Filtered noise (plus occasional thunder for
// storms) gives rain, snow, and storm moods from the same building blocks.
// Ported from TaskNook's lib/audio.js.

export type AmbienceMode = 'rain' | 'snow' | 'storm'

let ctx: AudioContext | null = null
let noiseSource: AudioBufferSourceNode | null = null
let masterGain: GainNode | null = null
let lfo: OscillatorNode | null = null
let thunderTimer: number | null = null
let mode: AmbienceMode | null = null

const PRESETS: Record<AmbienceMode, {
  lowpass: number
  highpass: number
  gain: number
  lfoFreq: number
  lfoDepth: number
}> = {
  rain: { lowpass: 2600, highpass: 380, gain: 0.6, lfoFreq: 0.12, lfoDepth: 0.12 },
  // Snow has no patter of its own — just a hushed, heavily-muffled wind.
  snow: { lowpass: 900, highpass: 120, gain: 0.22, lfoFreq: 0.045, lfoDepth: 0.22 },
  // Storm is rain pushed louder/brighter, with gustier modulation.
  storm: { lowpass: 3600, highpass: 260, gain: 0.85, lfoFreq: 0.2, lfoDepth: 0.18 },
}

function ensureContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function createNoiseBuffer(context: AudioContext, seconds = 2): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  // Brownian-ish noise: softer / less harsh than pure white noise.
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

function playThunder(volume: number) {
  if (!ctx) return
  const context = ctx
  const burst = context.createBufferSource()
  burst.buffer = createNoiseBuffer(context, 3)

  const rumble = context.createBiquadFilter()
  rumble.type = 'lowpass'
  rumble.frequency.value = 180 + Math.random() * 120

  const env = context.createGain()
  const peak = volume * (0.5 + Math.random() * 0.4)
  const now = context.currentTime
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(peak, now + 0.15)
  env.gain.exponentialRampToValueAtTime(0.001, now + 2.5 + Math.random() * 2)

  burst.connect(rumble).connect(env).connect(context.destination)
  burst.start()
  burst.stop(now + 5)
}

function scheduleThunder(volume: number) {
  const delay = 6000 + Math.random() * 14000
  thunderTimer = window.setTimeout(() => {
    if (mode !== 'storm') return
    playThunder(volume)
    scheduleThunder(volume)
  }, delay)
}

export function startAmbience(nextMode: AmbienceMode | 'off', volume = 0.5) {
  if (!nextMode || nextMode === 'off') {
    stopAmbience()
    return
  }
  if (mode === nextMode) {
    setAmbienceVolume(volume)
    return
  }
  stopAmbience()

  const context = ensureContext()
  const preset = PRESETS[nextMode]

  noiseSource = context.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(context)
  noiseSource.loop = true

  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = preset.lowpass

  const highpass = context.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = preset.highpass

  masterGain = context.createGain()
  masterGain.gain.value = volume * preset.gain

  // Slow LFO so the ambience "breathes" instead of sounding static.
  lfo = context.createOscillator()
  const lfoGain = context.createGain()
  lfo.frequency.value = preset.lfoFreq
  lfoGain.gain.value = volume * preset.lfoDepth
  lfo.connect(lfoGain).connect(masterGain.gain)

  noiseSource.connect(highpass).connect(lowpass).connect(masterGain).connect(context.destination)
  noiseSource.start()
  lfo.start()
  mode = nextMode

  if (nextMode === 'storm') scheduleThunder(volume)
}

export function stopAmbience() {
  if (thunderTimer !== null) {
    window.clearTimeout(thunderTimer)
    thunderTimer = null
  }
  if (noiseSource) {
    try {
      noiseSource.stop()
      lfo?.stop()
    } catch {
      /* already stopped */
    }
  }
  noiseSource = null
  lfo = null
  mode = null
}

export function setAmbienceVolume(volume: number) {
  if (masterGain && ctx && mode) {
    const preset = PRESETS[mode]
    masterGain.gain.setTargetAtTime(volume * preset.gain, ctx.currentTime, 0.2)
  }
}
