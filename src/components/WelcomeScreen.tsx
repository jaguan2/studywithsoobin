import { memo } from 'react'
import type { Video } from '../types/playlist'
import { HeartIcon } from './icons'

interface WelcomeScreenProps {
  videos: Video[]
  favorites: string[]
  /** The video from the previous session (if still playable), for one-click resume. */
  lastVideo: Video | null
  onSelect: (id: string) => void
  onSurprise: () => void
}

function WelcomeScreenInner({ videos, favorites, lastVideo, onSelect, onSurprise }: WelcomeScreenProps) {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-cream-50 dark:bg-ink-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-ink-900 dark:text-cream-100">
            study with soobin 🐰
          </h1>
          <p className="mt-2 text-sm text-ink-700 dark:text-cream-300">
            Pick a video to study with today
          </p>
          <button
            onClick={onSurprise}
            className="mt-4 rounded-full bg-clay-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-clay-600"
          >
            🎲 Surprise me
          </button>
          {lastVideo && (
            <button
              onClick={() => onSelect(lastVideo.id)}
              className="mx-auto mt-3 flex max-w-full items-center gap-1.5 text-sm text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
            >
              <span className="shrink-0">▶ Continue where you left off:</span>
              <span className="max-w-[18rem] truncate">{lastVideo.title}</span>
            </button>
          )}
        </header>

        {/* every video can end up session-blocked (embeds refused at play
            time) — without this the grid is just silently empty */}
        {videos.length === 0 && (
          <p className="mt-16 text-center text-sm text-ink-700 dark:text-cream-300">
            Nothing playable right now — every video refused to embed this session.
            <br />
            Reload the page to try again.
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelect(video.id)}
              className="group rounded-xl border border-cream-300 bg-white p-2 text-left transition hover:-translate-y-0.5 hover:border-clay-400 hover:shadow-panel dark:border-ink-700 dark:bg-ink-800"
            >
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={video.thumbnail}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
                  {video.duration}
                </span>
                {favorites.includes(video.id) && (
                  <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-clay-500">
                    <HeartIcon filled size={11} />
                  </span>
                )}
              </div>
              <p
                className="mt-2 line-clamp-2 text-xs leading-snug text-ink-800 dark:text-cream-200"
                title={video.title}
              >
                {video.title}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// memo: the timer keeps ticking in App while the welcome screen is shown
// (after "Change video"); nothing here depends on it.
export const WelcomeScreen = memo(WelcomeScreenInner)
