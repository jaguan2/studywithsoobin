import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

/** Last line of defense: an uncaught render error would otherwise show as a
 *  fully blank window — especially bad in the packaged exe, where there are
 *  no devtools to explain it. (Idea from TaskNook's per-scene boundaries.) */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-screen w-screen place-items-center bg-cream-50 dark:bg-ink-900">
        <div className="max-w-sm px-6 text-center">
          <p className="text-3xl">🐰💦</p>
          <h1 className="mt-3 text-lg font-semibold text-ink-900 dark:text-cream-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-ink-700 dark:text-cream-300">
            Sorry about that — reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-clay-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-clay-600"
          >
            Reload
          </button>
          <p className="mt-4 break-words text-[10px] text-ink-700/50 dark:text-cream-300/40">
            {this.state.error.message}
          </p>
        </div>
      </div>
    )
  }
}
