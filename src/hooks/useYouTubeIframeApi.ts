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

  apiPromise = new Promise<typeof YT>((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    let settled = false
    const timeout = window.setTimeout(() => {
      fail(new Error('YouTube IFrame API did not load (offline or blocked?)'))
    }, LOAD_TIMEOUT_MS)

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      apiPromise = null // let the next call retry
      reject(err)
    }

    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      resolve(window.YT)
    }

    // Reuse an existing tag (e.g. from a previous failed attempt that later
    // recovered) rather than piling up duplicates.
    const existing = document.getElementById('youtube-iframe-api')
    if (existing) {
      existing.addEventListener('error', () => fail(new Error('YouTube IFrame API failed to load')))
      return
    }
    const tag = document.createElement('script')
    tag.id = 'youtube-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => {
      tag.remove() // a fresh attempt needs a fresh tag
      fail(new Error('YouTube IFrame API failed to load'))
    }
    document.head.appendChild(tag)
  })

  return apiPromise
}

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}
