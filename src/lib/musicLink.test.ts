import { describe, expect, it } from 'vitest'
import { resolveMusicLink, stationKey } from './musicLink'

const LABEL = 'test station'

describe('resolveMusicLink — YouTube videos', () => {
  it.each([
    ['watch URL', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['short URL', 'https://youtu.be/dQw4w9WgXcQ'],
    ['shorts URL', 'https://www.youtube.com/shorts/dQw4w9WgXcQ'],
    ['live URL', 'https://www.youtube.com/live/dQw4w9WgXcQ'],
    ['embed URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
    ['bare 11-char id', 'dQw4w9WgXcQ'],
    // The main pattern misses v= when it is not the first recognized shape;
    // the URL searchParams fallback catches it.
    ['watch URL with a leading param', 'https://www.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ'],
  ])('resolves a %s', (_name, input) => {
    expect(resolveMusicLink(input, LABEL)).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      label: LABEL,
      custom: true,
    })
  })
})

describe('resolveMusicLink — YouTube playlists', () => {
  it('prefers a real playlist over the video id in the same URL', () => {
    const station = resolveMusicLink(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_',
      LABEL,
    )
    expect(station).toEqual({
      provider: 'youtube',
      id: 'PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_',
      isPlaylist: true,
      label: LABEL,
      custom: true,
    })
  })

  it('accepts a bare pasted playlist id', () => {
    const station = resolveMusicLink('PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_', LABEL)
    expect(station?.isPlaylist).toBe(true)
    expect(station?.id).toBe('PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_')
  })

  it('does not mistake a bare 11-char video id for a PL-prefixed playlist', () => {
    // 'PL' + 9 chars is a valid video id length; playlist ids are longer.
    const station = resolveMusicLink('PLabcdefghi', LABEL)
    expect(station?.isPlaylist).toBeUndefined()
    expect(station?.id).toBe('PLabcdefghi')
  })

  it('falls back to the video for radio-mix (RD…) lists', () => {
    const station = resolveMusicLink(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1',
      LABEL,
    )
    expect(station?.isPlaylist).toBeUndefined()
    expect(station?.id).toBe('dQw4w9WgXcQ')
  })

  it('falls back to the video for private WL/LL lists', () => {
    const station = resolveMusicLink(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=WL',
      LABEL,
    )
    expect(station?.isPlaylist).toBeUndefined()
    expect(station?.id).toBe('dQw4w9WgXcQ')
  })
})

describe('resolveMusicLink — Spotify', () => {
  it('resolves a playlist URL', () => {
    expect(resolveMusicLink('https://open.spotify.com/playlist/5Aa3V6dW5XCkDg2utkZjdE', LABEL))
      .toEqual({
        provider: 'spotify',
        id: '5Aa3V6dW5XCkDg2utkZjdE',
        kind: 'playlist',
        label: LABEL,
        custom: true,
      })
  })

  it('handles the intl-xx locale segment Spotify inserts', () => {
    const station = resolveMusicLink(
      'https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT',
      LABEL,
    )
    expect(station?.provider).toBe('spotify')
    expect(station?.kind).toBe('track')
    expect(station?.id).toBe('4cOdK2wGLETKBW3PvgPWqT')
  })
})

describe('resolveMusicLink — rejects', () => {
  it.each([
    ['empty string', ''],
    ['plain text', 'lofi hip hop'],
    ['unrelated URL', 'https://example.com/watch?v=dQw4w9WgXcQ'],
  ])('returns null for %s', (_name, input) => {
    expect(resolveMusicLink(input, LABEL)).toBeNull()
  })
})

describe('stationKey', () => {
  it('is stable for the same station and distinct across stations', () => {
    const a = resolveMusicLink('https://youtu.be/dQw4w9WgXcQ', 'a')!
    const b = resolveMusicLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'b')!
    const c = resolveMusicLink('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', 'c')!
    expect(stationKey(a)).toBe(stationKey(b)) // same video, different URL forms
    expect(stationKey(a)).not.toBe(stationKey(c))
  })
})
