import { describe, expect, it } from 'vitest'
import { isUnavailableVideo } from './videoPlayback'

describe('YouTube error classification', () => {
  it('removes unavailable or explicitly restricted videos', () => {
    for (const code of [2, 100, 101, 150]) expect(isUnavailableVideo(code)).toBe(true)
  })
  it('keeps videos when the failure belongs to the player or browser', () => {
    for (const code of [5, 153, 999]) expect(isUnavailableVideo(code)).toBe(false)
  })
})
