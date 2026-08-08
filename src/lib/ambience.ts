// Procedural weather ambience using the Web Audio API — no audio files
// needed, works fully offline. Filtered noise (plus occasional thunder for
// storms) gives rain, snow, and storm moods from the same building blocks.
// Ported from TaskNook's lib/audio.js.

export type AmbienceMode = 'rain' | 'snow' | 'storm'

let ctx: AudioContext | null = null
let noiseSource: AudioBufferSourceNode | null = null
let masterGain: GainNode | null = null
let lfo: OscillatorNode | null = null
let lfoGain: GainNode | null = null
// Thunder one-shots route through this bus so switching ambience off can
// silence a rumble mid-tail instead of letting it play out for seconds.
let thunderBus: GainNode | null = null
let thunderTimer: number | null = null
let suspendTimer: number | null = null
let mode: AmbienceMode | null = null
// The current slider volume; thunder strikes read it at strike time so the
// slider affects them too (a captured start-time volume wouldn't).
let currentVolume = 0.5

const PRESETS: Record<AmbienceMode, {
  lowpass: number
  highpass: number
  gain: number
  lfoFreq: number
  lfoDepth: number
}> = {
  // Gentle rain heard from indoors, not splatter on a tin roof: the lowpass
  // does the work (it strips the high-frequency hiss), and the lower highpass
  // keeps enough low end that what's left reads as warm rather than thin.
  rain: { lowpass: 1150, highpass: 200, gain: 0.36, lfoFreq: 0.1, lfoDepth: 0.09 },
  // Snow has no patter of its own — just a hushed, heavily-muffled wind.
  snow: { lowpass: 600, highpass: 80, gain: 0.13, lfoFreq: 0.04, lfoDepth: 0.16 },
  // Storm is rain pushed louder/brighter, with gustier modulation.
  storm: { lowpass: 3600, highpass: 260, gain: 0.85, lfoFreq: 0.2, lfoDepth: 0.18 },
}

/** LFO swing, capped below the base gain so the modulation can never push the
 *  gain negative (negative gain phase-inverts the noise — the "breathing"
 *  stops hushing and sounds wrong; snow's preset dips negative without this). */
function lfoDepthFor(preset: (typeof PRESETS)[AmbienceMode]): number {
  return Math.min(preset.lfoDepth, preset.gain * 0.95)
}

function ensureContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (suspendTimer !== null) {
    window.clearTimeout(suspendTimer)
    suspendTimer = null
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

function playThunder() {
  if (!ctx || !thunderBus) return
  const context = ctx
  const burst = context.createBufferSource()
  burst.buffer = createNoiseBuffer(context, 3)

  const rumble = context.createBiquadFilter()
  rumble.type = 'lowpass'
  rumble.frequency.value = 180 + Math.random() * 120

  const env = context.createGain()
  // Read the volume at strike time so the slider governs thunder as well.
  const peak = currentVolume * (0.5 + Math.random() * 0.4)
  const now = context.currentTime
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(peak, now + 0.15)
  env.gain.exponentialRampToValueAtTime(0.001, now + 2.5 + Math.random() * 2)

  burst.connect(rumble).connect(env).connect(thunderBus)
  burst.start()
  burst.stop(now + 5)
}

function scheduleThunder() {
  const delay = 6000 + Math.random() * 14000
  thunderTimer = window.setTimeout(() => {
    if (mode !== 'storm') return
    playThunder()
    scheduleThunder()
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
  currentVolume = volume

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
  lfoGain = context.createGain()
  lfo.frequency.value = preset.lfoFreq
  lfoGain.gain.value = volume * lfoDepthFor(preset)
  lfo.connect(lfoGain).connect(masterGain.gain)

  noiseSource.connect(highpass).connect(lowpass).connect(masterGain).connect(context.destination)
  noiseSource.start()
  lfo.start()
  mode = nextMode

  if (nextMode === 'storm') {
    thunderBus = context.createGain()
    thunderBus.gain.value = 1
    thunderBus.connect(context.destination)
    scheduleThunder()
  }
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
  // Fade any in-flight thunder tail out fast instead of letting it rumble on
  // for seconds after the user switched ambience off.
  if (thunderBus && ctx) {
    const bus = thunderBus
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
    window.setTimeout(() => bus.disconnect(), 400)
  }
  noiseSource = null
  lfo = null
  lfoGain = null
  masterGain = null
  thunderBus = null
  mode = null

  // A running AudioContext keeps the audio hardware awake even when producing
  // silence; suspend once everything (including the thunder fade) is done.
  if (ctx) {
    if (suspendTimer !== null) window.clearTimeout(suspendTimer)
    suspendTimer = window.setTimeout(() => {
      suspendTimer = null
      if (mode === null && ctx) void ctx.suspend()
    }, 500)
  }
}

export function setAmbienceVolume(volume: number) {
  currentVolume = volume
  if (masterGain && ctx && mode) {
    const preset = PRESETS[mode]
    masterGain.gain.setTargetAtTime(volume * preset.gain, ctx.currentTime, 0.2)
    // Rescale the modulation depth with the volume, or lowering the slider
    // leaves the old swing overpowering the new base gain (and dipping it
    // negative).
    lfoGain?.gain.setTargetAtTime(volume * lfoDepthFor(preset), ctx.currentTime, 0.2)
  }
}
