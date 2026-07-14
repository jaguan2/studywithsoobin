/** Shared bottom-right corner grip for resizable floating panels. */
export function ResizeGrip({ onStart }: { onStart: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onStart}
      title="Drag to resize"
      className="absolute bottom-0 right-0 grid h-5 w-5 cursor-nwse-resize place-items-center text-ink-700/40 dark:text-cream-300/40"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <circle cx="8" cy="8" r="1" />
        <circle cx="8" cy="4" r="1" />
        <circle cx="4" cy="8" r="1" />
      </svg>
    </div>
  )
}
