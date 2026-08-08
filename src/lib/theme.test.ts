import { describe, expect, it } from 'vitest'
import { DEFAULT_CUSTOM_COLOR, deriveThemeVars, hexToHsl } from './theme'

/** The light preset's anchors (src/index.css) — the luminance targets every
 *  derived palette must reproduce. */
const LIGHT_PRESET: Record<string, [number, number, number]> = {
  'cream-50': [253, 251, 247],
  'cream-100': [248, 242, 233],
  'cream-200': [241, 231, 214],
  'cream-300': [232, 217, 190],
  'clay-400': [227, 168, 107],
  'clay-500': [217, 146, 79],
  'clay-600': [199, 125, 60],
  'ink-700': [74, 64, 56],
  'ink-800': [51, 43, 37],
  'ink-900': [34, 28, 23],
}

/** WCAG relative luminance, same formula the solver targets. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function parseTriplet(value: string): [number, number, number] {
  const [r, g, b] = value.split(' ').map(Number)
  return [r, g, b]
}

describe('hexToHsl', () => {
  it('parses primaries', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 1, l: 0.5 })
    expect(hexToHsl('#00ff00')?.h).toBe(120)
  })

  it('accepts a missing # and uppercase', () => {
    expect(hexToHsl('8AA5C8')).not.toBeNull()
  })

  it.each([['#fff'], ['not a color'], ['#12345g']])('rejects %s', (input) => {
    expect(hexToHsl(input)).toBeNull()
  })
})

describe('deriveThemeVars', () => {
  it('emits all ten palette variables in ramp order', () => {
    const names = deriveThemeVars(DEFAULT_CUSTOM_COLOR).map(([name]) => name)
    expect(names).toEqual(Object.keys(LIGHT_PRESET).map((n) => `--${n}`))
  })

  it('falls back to the default colour for an unparseable pick', () => {
    expect(deriveThemeVars('garbage')).toEqual(deriveThemeVars(DEFAULT_CUSTOM_COLOR))
  })

  // The whole point of the solver: every stop keeps the light preset's
  // relative luminance regardless of hue, so contrast never regresses (a
  // fixed HSL lightness ladder washed yellow accents out to 1.17:1 once).
  it.each([['#e04040'], ['#e0c040'], ['#40e0a0'], ['#4080e0'], ['#a040e0']])(
    'preserves each stop\'s luminance for pick %s',
    (pick) => {
      for (const [name, value] of deriveThemeVars(pick)) {
        const target = luminance(LIGHT_PRESET[name.slice(2)])
        expect(Math.abs(luminance(parseTriplet(value)) - target)).toBeLessThan(0.02)
      }
    },
  )

  it('keeps white-on-clay-500 contrast identical to the light preset', () => {
    const presetContrast = 1.05 / (luminance(LIGHT_PRESET['clay-500']) + 0.05)
    for (const pick of ['#e0c040', '#40e0e0']) {
      // yellow and cyan — the hues a fixed lightness ladder washes out
      const clay = deriveThemeVars(pick).find(([name]) => name === '--clay-500')!
      const contrast = 1.05 / (luminance(parseTriplet(clay[1])) + 0.05)
      expect(Math.abs(contrast - presetContrast)).toBeLessThan(0.15)
    }
  })
})
