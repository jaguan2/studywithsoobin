// End-of-timer cues: a soft procedural chime for whoever is at the screen,
// and a Web Notification for whoever stepped away. No audio files, matching
// the ambience engine's philosophy. Pattern from TaskNook's timer provider.

let ctx: AudioContext | null = null

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

/** A gentle two-note chime (C5 → G5). Safe to call any time after a user
 *  gesture; silently does nothing if audio is unavailable. */
export function playChime() {
  try {
    const context = ensureContext()
    const now = context.currentTime
    const notes: [number, number][] = [
      [523.25, now], // C5
      [783.99, now + 0.18], // G5
    ]
    for (const [freq, at] of notes) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.22, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 1.1)
      osc.connect(gain).connect(context.destination)
      osc.start(at)
      osc.stop(at + 1.2)
    }
  } catch {
    /* no audio available — the notification still fires */
  }
}

/** Ask for notification permission. Called when a timer starts (a user
 *  gesture), so the browser prompt appears in a sensible context — not on
 *  page load. */
export function ensureNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* some webviews expose Notification but throw on use */
  }
}

/** Chime + (if permitted) system notification. The notification matters when
 *  the tab is in the background — exactly when the chime may be inaudible. */
export function timerCue(title: string, body: string) {
  playChime()
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag: 'sws-timer' })
      // Focus the study tab when the user clicks the notification.
      n.onclick = () => window.focus()
    }
  } catch {
    /* notification blocked — the chime already played */
  }
}
