interface VolumeControlProps {
  volume: number
  onChange: (volume: number) => void
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-800 dark:text-cream-200">Ambience control:</p>
      <div className="mt-2.5 flex items-center gap-3">
        <SpeakerIcon muted={volume === 0} />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cream-300 accent-clay-500 dark:bg-ink-700"
        />
      </div>
    </div>
  )
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-ink-700 dark:text-cream-300"
    >
      <path d="M4 9v6h4l5 5V4L8 9H4z" strokeLinecap="round" strokeLinejoin="round" />
      {!muted && <path d="M16.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" strokeLinejoin="round" />}
      {muted && <path d="M17 9l4 6M21 9l-4 6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}
