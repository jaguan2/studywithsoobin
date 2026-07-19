import { useState } from 'react'
import { resolveMusicLink, stationKey, type Station } from '../lib/musicLink'
import { YouTubeMusicPlayer } from './YouTubeMusicPlayer'

// A few cozy lofi streams to start with; users can add their own via
// YouTube or Spotify link.
//
// These rot. They're 24/7 livestreams, and when one restarts it comes back
// under a *new* video id while the old id becomes an archive with embedding
// disabled (error 150) — which is how the original starter set died. Every id
// below was checked by loading it in a real player and waiting for PLAYING,
// not just by asking oEmbed whether the video exists. Re-check them the same
// way if stations start failing; YouTubeMusicPlayer surfaces the error rather
// than showing a dead black box.
// Last verified: 2026-07-16.
const BUILT_IN_STATIONS: Station[] = [
  { provider: 'youtube', id: 'X4VbdwhkE10', label: 'lofi hip hop radio 📚' },
  { provider: 'youtube', id: '4xDzrJKXOOY', label: 'synthwave radio 🌃' },
  { provider: 'youtube', id: 'JD-kMIpDfnY', label: 'lofi sleep & chill 🌙' },
  { provider: 'youtube', id: 'E2vONfzoyRI', label: 'jazz lofi 🎷' },
  { provider: 'youtube', id: 'CwPCy1GLS38', label: 'rainy day lofi ☔' },
  // Long mixes rather than livestreams — these don't rot the way the 24/7
  // radios do, since the video id is fixed.
  { provider: 'youtube', id: 'foEjHAkrIDA', label: 'secret cafe r&b ☕' },
  { provider: 'youtube', id: 'mWI10M1M7JM', label: 'spring cleaning 🧺' },
  { provider: 'youtube', id: 'PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_', isPlaylist: true, label: 'my playlist 🎧' },
  // Spotify keeps its official embed. Note it will only play full tracks for
  // a listener already logged into Spotify in this browser — everyone else
  // gets 30-second previews, and nothing autoplays. That's the widget's
  // behaviour, not something the app can override.
  { provider: 'spotify', id: '5Aa3V6dW5XCkDg2utkZjdE', kind: 'playlist', label: "soobin's recs 🐰" },
]

// Spotify's embed needs a taller frame for content with a tracklist.
const SPOTIFY_TALL_KINDS = new Set(['playlist', 'album', 'show'])

function loadCustomStations(): Station[] {
  try {
    const raw = JSON.parse(localStorage.getItem('sws.music.custom') ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// Spotify keeps its official embed — the widget ships its own working
// play/next controls. YouTube stations get our custom mini-player instead
// (see YouTubeMusicPlayer), since the bare embed is uncontrollable this small.
function spotifyEmbedProps(station: Station) {
  return {
    src: `https://open.spotify.com/embed/${station.kind}/${station.id}?utm_source=generator&theme=0`,
    height: SPOTIFY_TALL_KINDS.has(station.kind ?? '') ? 280 : 152,
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
  }
}

export function MusicPanel() {
  const [musicOn, setMusicOn] = useState(false)
  const [customStations, setCustomStations] = useState<Station[]>(loadCustomStations)
  const [activeKey, setActiveKey] = useState(
    () => localStorage.getItem('sws.music.station') ?? stationKey(BUILT_IN_STATIONS[0]),
  )
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const stations = [...BUILT_IN_STATIONS, ...customStations]
  const activeStation = stations.find((s) => stationKey(s) === activeKey) ?? stations[0]

  const selectStation = (station: Station) => {
    const key = stationKey(station)
    setActiveKey(key)
    localStorage.setItem('sws.music.station', key)
    setMusicOn(true)
  }

  const addCustomStation = () => {
    const station = resolveMusicLink(url, label.trim() || 'custom station 🎧')
    if (!station) {
      setError("Couldn't find a video or playlist in that link.")
      return
    }
    if (!stations.some((s) => stationKey(s) === stationKey(station))) {
      const next = [...customStations, station]
      setCustomStations(next)
      localStorage.setItem('sws.music.custom', JSON.stringify(next))
    }
    selectStation(station)
    setError('')
    setUrl('')
    setLabel('')
  }

  const removeCustomStation = (station: Station) => {
    const next = customStations.filter((s) => stationKey(s) !== stationKey(station))
    setCustomStations(next)
    localStorage.setItem('sws.music.custom', JSON.stringify(next))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-800 dark:text-cream-200">🎵 Music</p>
        <button
          onClick={() => setMusicOn((on) => !on)}
          className={
            'rounded-full px-3 py-1 text-xs font-medium transition ' +
            (musicOn
              ? 'bg-clay-500 text-white'
              : 'bg-white/80 text-ink-700 hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800')
          }
        >
          {musicOn ? 'On' : 'Off'}
        </button>
      </div>

      {musicOn && activeStation && (
        <div className="mt-2">
          {activeStation.provider === 'youtube' ? (
            <YouTubeMusicPlayer
              key={stationKey(activeStation)}
              videoId={activeStation.id}
              isPlaylist={activeStation.isPlaylist}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-cream-300 dark:border-ink-700">
              <iframe
                key={stationKey(activeStation)}
                title="music player"
                width="100%"
                className="block"
                {...spotifyEmbedProps(activeStation)}
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {stations.map((s) => (
          <div key={stationKey(s)} className="flex items-center">
            <button
              onClick={() => selectStation(s)}
              className={
                'rounded-full px-2.5 py-1 text-xs transition ' +
                (s.custom ? 'rounded-r-none ' : '') +
                (musicOn && stationKey(activeStation) === stationKey(s)
                  ? 'bg-clay-500 font-medium text-white'
                  : 'bg-white/80 text-ink-700 hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800')
              }
            >
              {s.label}
            </button>
            {s.custom && (
              <button
                onClick={() => removeCustomStation(s)}
                title="Remove station"
                aria-label={`Remove ${s.label}`}
                className="rounded-full rounded-l-none bg-white/60 px-1.5 py-1 text-xs text-ink-700/60 transition hover:bg-white hover:text-ink-900 dark:bg-ink-800/60 dark:text-cream-300/60 dark:hover:bg-ink-800 dark:hover:text-cream-100"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomStation()}
          placeholder="Paste a YouTube or Spotify link…"
          className="min-w-0 flex-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-700/40 focus:outline-none focus:ring-1 focus:ring-clay-500 dark:bg-ink-800/80 dark:text-cream-100 dark:placeholder:text-cream-300/40"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomStation()}
          placeholder="name"
          className="w-16 rounded-lg bg-white/80 px-2 py-1.5 text-xs text-ink-900 placeholder:text-ink-700/40 focus:outline-none focus:ring-1 focus:ring-clay-500 dark:bg-ink-800/80 dark:text-cream-100 dark:placeholder:text-cream-300/40"
        />
        <button
          onClick={addCustomStation}
          className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white dark:bg-ink-800/80 dark:text-cream-300 dark:hover:bg-ink-800"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-clay-600 dark:text-clay-400">{error}</p>}
    </div>
  )
}
