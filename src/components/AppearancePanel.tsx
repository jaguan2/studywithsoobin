import type { Theme } from '../App'
import { ThemeSwitcher } from './ThemeSwitcher'

interface Props {
  theme: Theme
  onSetTheme: (theme: Theme) => void
  customColor: string
  onSetCustomColor: (color: string) => void
  opacity: number
  onSetOpacity: (value: number) => void
}

export function AppearancePanel({ opacity, onSetOpacity, ...themeProps }: Props) {
  return (
    <section id="workspace-appearance" className="workspace-appearance" aria-label="Appearance settings">
      <div>
        <p className="surface-label">Color palette</p>
        <ThemeSwitcher {...themeProps} expanded />
      </div>
      {themeProps.theme === 'custom' && <label className="appearance-hex">
        <span className="surface-label">Custom color</span>
        <input aria-label="Custom theme hex color" type="text" defaultValue={themeProps.customColor} key={themeProps.customColor}
          maxLength={7} spellCheck={false} placeholder="#8AA5C8"
          onBlur={event => {
            if (/^#[0-9a-f]{6}$/i.test(event.target.value)) themeProps.onSetCustomColor(event.target.value)
            else event.target.value = themeProps.customColor
          }}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      </label>}
      <label className="appearance-opacity">
        <span className="surface-label">Panel opacity <output>{opacity}%</output></span>
        <input aria-label="Panel opacity" type="range" min={65} max={100} step={1} value={opacity} onChange={event => onSetOpacity(Number(event.target.value))} />
        <span className="appearance-range-labels"><span>Frosted</span><span>Solid</span></span>
      </label>
    </section>
  )
}
