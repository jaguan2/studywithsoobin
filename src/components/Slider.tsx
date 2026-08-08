interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  ariaLabel: string
  onChange: (value: number) => void
  /** Layout classes only (width/margins) — track styling is fixed here. */
  className?: string
}

/** The one range-input style for plain sliders (video volume, music volume,
 *  ambience). The seek bars stay on `Scrubber`, which needs its gradient
 *  fill. */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  ariaLabel,
  onChange,
  className,
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className={
        'h-1.5 min-w-0 cursor-pointer appearance-none rounded-full bg-cream-300 accent-clay-500 disabled:cursor-default disabled:opacity-40 dark:bg-ink-700 ' +
        (className ?? 'w-full')
      }
    />
  )
}
