import { useState } from 'react'
import { resolveMusicLink, stationKey, type Station } from '../lib/musicLink'
import { YouTubeMusicPlayer } from './YouTubeMusicPlayer'

// A few cozy lofi streams to start with; users can add their own via
// YouTube or Spotify link. (Same starter set as TaskNook.)
const BUILT_IN_STATIONS: Station[] = [
  { provider: 'youtube', id: 'jfKfPfyJRdk', label: 'lofi hip hop radio 📚' },
  { provider: 'youtube', id: '4xDzrJKXOOY', label: 'synthwave radio 🌃' },
  { provider: 'youtube', id: 'rUxyKA_-grg', label: 'lofi sleep & chill 🌙' },
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
            <YouTubeMusicPlayer key={stationKey(activeStation)} videoId={activeStation.id} />
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
