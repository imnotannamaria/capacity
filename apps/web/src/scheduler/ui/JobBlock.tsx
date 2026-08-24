import { durationToHeight, minutesToPosition, minutesToTime, timeToMinutes } from "../core/geometry"
import type { Job } from "../core/types"

export function JobBlock({ job }: { job: Job }) {
  const startMinutes = timeToMinutes(job.startTime)
  const endMinutes = startMinutes + job.durationMinutes
  const timeRange = `${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`

  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1 text-[var(--fg-primary)]"
      style={{ top: minutesToPosition(startMinutes), height: durationToHeight(job.durationMinutes) }}
      title={`${job.title} · ${timeRange}`}
    >
      <p className="truncate font-mono text-[11px] leading-tight">{job.title}</p>
    </div>
  )
}
