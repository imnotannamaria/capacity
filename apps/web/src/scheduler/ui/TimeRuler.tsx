import { durationToHeight, getHourMarks, MINUTES_PER_DAY } from "../core/geometry"

/**
 * The vertical time axis, one label per hour. Sticky to the left edge so it
 * stays put while the crew lanes scroll horizontally. Its height matches a
 * full day, so its labels line up exactly with the hour gridlines drawn
 * behind the columns (both derive their positions from geometry.ts).
 */
export function TimeRuler() {
  const marks = getHourMarks()

  return (
    <div
      className="sticky left-0 z-20 w-14 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
      aria-hidden
    >
      {/* header spacer, aligns with the crew column headers */}
      <div className="sticky top-0 z-10 h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]" />
      <div className="relative" style={{ height: durationToHeight(MINUTES_PER_DAY) }}>
        {marks.map((mark) => (
          <span
            key={mark.hour}
            className="absolute right-2 -translate-y-1/2 font-mono text-micro tabular-nums text-[var(--fg-muted)]"
            style={{ top: mark.top }}
          >
            {mark.hour === 0 || mark.hour === 24 ? "" : mark.label}
          </span>
        ))}
      </div>
    </div>
  )
}
