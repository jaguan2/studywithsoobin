// Derives a full palette from a single user-picked colour.
//
// The app's palette is ten CSS variables (see index.css). Rather than ask the
// user to choose ten colours, we take the hue and saturation of one and rebuild
// the ramp around it.
//
// The catch: HSL lightness is not brightness. A yellow at L=58% is far brighter
// than a blue at L=58%, so copying the preset's lightness verbatim would make
// yellow accents wash out to near-white (white-on-accent measured 1.17:1 —
// invisible). Instead each stop keeps the *relative luminance* of the light
// preset's matching stop, and we solve for whatever lightness hits it. Contrast
// is then identical to the shipped preset for every hue the user can pick.

/** Each stop's hue offset from the picked colour, its saturation, and the
 *  light-preset colour whose luminance it must match. The creams sit on the
 *  base hue; accents and text run a few degrees off it, as the hand-tuned
 *  light palette does. */
const RAMP: { name: string; dh: number; s: number; anchor: [number, number, number] }[] = [
  { name: 'cream-50', dh: 0, s: 0.6, anchor: [253, 251, 247] },
  { name: 'cream-100', dh: 0, s: 0.52, anchor: [248, 242, 233] },
  { name: 'cream-200', dh: 0, s: 0.49, anchor: [241, 231, 214] },
  { name: 'cream-300', dh: 0, s: 0.48, anchor: [232, 217, 190] },
  { name: 'clay-400', dh: -9, s: 0.68, anchor: [227, 168, 107] },
  { name: 'clay-500', dh: -9, s: 0.65, anchor: [217, 146, 79] },
  { name: 'clay-600', dh: -10, s: 0.55, anchor: [199, 125, 60] },
  { name: 'ink-700', dh: -11, s: 0.14, anchor: [74, 64, 56] },
  { name: 'ink-800', dh: -12, s: 0.16, anchor: [51, 43, 37] },
  { name: 'ink-900', dh: -11, s: 0.19, anchor: [34, 28, 23] },
]

/** Saturation of a pick that reproduces the ramp above as-is. Picking a greyer
 *  colour scales the palette toward neutral; a more vivid one scales it up, to
 *  a ceiling that keeps things cosy. */
const REF_SATURATION = 0.5
const MAX_SATURATION_SCALE = 1.4

/** A muted blue — visibly not one of the presets, so selecting 🎨 shows the
 *  feature working before the user has picked anything. */
export const DEFAULT_CUSTOM_COLOR = '#8AA5C8'

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const int = parseInt(match[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return { h: h < 0 ? h + 360 : h, s, l }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let rgb: [number, number, number]
  if (hp < 1) rgb = [c, x, 0]
  else if (hp < 2) rgb = [x, c, 0]
  else if (hp < 3) rgb = [0, c, x]
  else if (hp < 4) rgb = [0, x, c]
  else if (hp < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = l - c / 2
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ]
}

/** WCAG relative luminance — the quantity contrast ratios are computed from. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Luminance rises monotonically with lightness at a fixed hue/saturation
 *  (L=0 is black, L=1 is white), so bisection always converges on the
 *  lightness that hits `target`. */
function solveLightness(h: number, s: number, target: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (luminance(hslToRgb(h, s, mid)) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** `--cream-50` → `"253 251 247"` for every palette variable. The values are
 *  space-separated RGB triplets because tailwind.config.js reads them as
 *  `rgb(var(--x) / <alpha-value>)`. */
export function deriveThemeVars(hex: string): [string, string][] {
  const base = hexToHsl(hex) ?? hexToHsl(DEFAULT_CUSTOM_COLOR)!
  const satScale = Math.min(base.s / REF_SATURATION, MAX_SATURATION_SCALE)
  return RAMP.map((stop) => {
    const h = base.h + stop.dh
    const s = Math.min(stop.s * satScale, 1)
    const [r, g, b] = hslToRgb(h, s, solveLightness(h, s, luminance(stop.anchor)))
    return [`--${stop.name}`, `${r} ${g} ${b}`]
  })
}

/** Inline styles on :root beat the stylesheet's `:root` / `:root.coffee`
 *  rules, which is how a custom palette overrides a preset. */
export function applyCustomTheme(hex: string) {
  for (const [name, value] of deriveThemeVars(hex)) {
    document.documentElement.style.setProperty(name, value)
  }
}

/** Must run when leaving the custom theme — otherwise the inline vars would
 *  keep overriding whichever preset the user switched to. */
export function clearCustomTheme() {
  for (const stop of RAMP) {
    document.documentElement.style.removeProperty(`--${stop.name}`)
  }
}
