// Loads the YouTube IFrame Player API script once and resolves with the
// global `YT` namespace. Safe to call from multiple components — the
// script tag and the `window.YT` global are only created a single time.
//
// Failure handling matters here: with no onerror and no timeout, an offline
// start or a captive portal (which returns 200 and then never fires
// `onYouTubeIframeAPIReady`) would cache a forever-pending promise and every
// player in the app would stay a silent black box — even after the network
// came back. So the promise rejects after a timeout and the cache is cleared
// on failure, letting the next call retry with a fresh script tag.

const LOAD_TIMEOUT_MS = 12000

let apiPromise: Promise<typeof YT> | null = null

export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise

  const attempt = new Promise<typeof YT>((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    let settled = false
    let tag: HTMLElement | null = null
    const previousCallback = window.onYouTubeIframeAPIReady
    const timeout = window.setTimeout(() => {
      fail(new Error('YouTube IFrame API did not load (offline or blocked?)'))
    }, LOAD_TIMEOUT_MS)

    const cleanup = () => {
      window.clearTimeout(timeout)
      tag?.removeEventListener('error', onError)
      if (window.onYouTubeIframeAPIReady === onReady) {
        window.onYouTubeIframeAPIReady = previousCallback
      }
    }

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      tag?.remove() // stalled or failed tags cannot start a fresh request
      reject(err)
    }

    const onError = () => fail(new Error('YouTube IFrame API failed to load'))
    const onReady = () => {
      if (settled) return
      if (!window.YT?.Player) {
        fail(new Error('YouTube IFrame API failed to load'))
        return
      }
      settled = true
      cleanup()
      resolve(window.YT)
      // Settle our players before calling another consumer's callback, so
      // an exception there cannot strand this app's loading promise.
      previousCallback?.()
    }
    window.onYouTubeIframeAPIReady = onReady

    // Reuse an existing tag (e.g. from a previous failed attempt that later
    // recovered) rather than piling up duplicates.
    try {
      const existing = document.getElementById('youtube-iframe-api')
      tag = existing ?? document.createElement('script')
      tag.addEventListener('error', onError)
      if (!existing) {
        const script = tag as HTMLScriptElement
        script.id = 'youtube-iframe-api'
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error('YouTube IFrame API failed to load'))
    }
  })

  apiPromise = attempt
  // Runs after assignment even when script injection fails synchronously.
  // Only clear this attempt, never a newer promise created by another caller.
  void attempt.catch(() => { if (apiPromise === attempt) apiPromise = null })
  return attempt
}

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}
