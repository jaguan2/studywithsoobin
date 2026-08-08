// Guarded localStorage access. Both reads and writes can throw
// (QuotaExceededError, SecurityError, storage disabled) — and an unguarded
// throw inside a React effect renders as a blank window in the packaged
// desktop app. Same rationale as TaskNook's lib/storage.js.

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* quota full / storage disabled — the app keeps working, just forgets */
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Parse a stored JSON value, or return `fallback` on any failure. */
export function storageGetJson<T>(key: string, fallback: T): T {
  const raw = storageGet(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function storageSetJson(key: string, value: unknown): void {
  storageSet(key, JSON.stringify(value))
}
