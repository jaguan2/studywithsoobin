import { useEffect, useState } from 'react'
import { applyCustomTheme, clearCustomTheme, DEFAULT_CUSTOM_COLOR, type Theme } from '../lib/theme'
import { storageGet, storageSet } from '../lib/storage'

function loadTheme(): Theme {
  const stored = storageGet('sws.theme')
  return stored === 'dark' || stored === 'coffee' || stored === 'custom' ? stored : 'light'
}

function loadCustomColor(): string {
  const stored = storageGet('sws.customColor')
  return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : DEFAULT_CUSTOM_COLOR
}

function loadPanelOpacity(): number {
  const raw = storageGet('sws.panelOpacity')
  const value = raw === null || raw.trim() === '' ? 88 : Number(raw)
  return Number.isFinite(value) ? Math.max(65, Math.min(100, Math.round(value))) : 88
}

/** Own appearance persistence and root styles; UI consumers only select values. */
export function useAppearance() {
  const [theme, setTheme] = useState(loadTheme)
  const [customColor, setCustomColor] = useState(loadCustomColor)
  const [panelOpacity, setPanelOpacity] = useState(loadPanelOpacity)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('coffee', theme === 'coffee')
    // Inline custom vars must be cleared before a preset can take effect.
    if (theme === 'custom') applyCustomTheme(customColor)
    else clearCustomTheme()
    storageSet('sws.theme', theme)
  }, [theme, customColor])

  useEffect(() => { storageSet('sws.customColor', customColor) }, [customColor])
  useEffect(() => {
    document.documentElement.style.setProperty('--panel-opacity', String(panelOpacity / 100))
    storageSet('sws.panelOpacity', String(panelOpacity))
  }, [panelOpacity])

  return { theme, setTheme, customColor, setCustomColor, panelOpacity, setPanelOpacity }
}
