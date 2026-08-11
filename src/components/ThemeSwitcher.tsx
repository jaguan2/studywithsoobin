import type { Theme } from '../App'

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light theme', icon: '☀️' },
  { value: 'coffee', label: 'Coffee theme', icon: '☕' },
  { value: 'dark', label: 'Dark theme', icon: '🌙' },
]

interface ThemeSwitcherProps {
  theme: Theme
  onSetTheme: (theme: Theme) => void
  customColor: string
  onSetCustomColor: (hex: string) => void
}

/** The theme pill row: three presets plus the custom-colour swatch. Shared by
 *  the sidebar footer and the welcome screen. */
export function ThemeSwitcher({ theme, onSetTheme, customColor, onSetCustomColor }: ThemeSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-cream-200/70 p-0.5 dark:bg-ink-700">
      {THEMES.map((t) => (
        <button
          key={t.value}
          onClick={() => onSetTheme(t.value)}
          aria-label={t.label}
          title={t.label}
          className={
            'grid h-6 w-7 place-items-center rounded-full text-[12px] leading-none transition ' +
            (theme === t.value ? 'bg-white shadow dark:bg-ink-900' : 'opacity-45 hover:opacity-100')
          }
        >
          {t.icon}
        </button>
      ))}
      {/* Clicking the swatch both selects the custom theme and opens the OS
          colour picker, so it's one control rather than two. */}
      <label
        onClick={() => onSetTheme('custom')}
        title="Custom colour — pick your own"
        className={
          'grid h-6 w-7 cursor-pointer place-items-center rounded-full transition ' +
          (theme === 'custom' ? 'bg-white shadow dark:bg-ink-900' : 'opacity-45 hover:opacity-100')
        }
      >
        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink-900/20"
          style={{ background: customColor }}
        />
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            onSetCustomColor(e.target.value)
            onSetTheme('custom')
          }}
          aria-label="Custom colour theme"
          className="sr-only"
        />
      </label>
    </div>
  )
}
