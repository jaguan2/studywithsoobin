import type { Video } from '../types/playlist'

interface WelcomeScreenProps {
  videos: Video[]
  favorites: string[]
  onSelect: (id: string) => void
  onSurprise: () => void
}

export function WelcomeScreen({ videos, favorites, onSelect, onSurprise }: WelcomeScreenProps) {
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
        </header>

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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
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
