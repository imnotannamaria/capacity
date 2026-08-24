import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { durationToHeight, minutesToPosition, minutesToTime, timeToMinutes } from "../core/geometry"
import type { Job } from "../core/types"

export function JobBlock({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })

  const startMinutes = timeToMinutes(job.startTime)
  const endMinutes = startMinutes + job.durationMinutes
  const timeRange = `${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute inset-x-1 cursor-grab touch-none overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1 text-[var(--fg-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        isDragging && "opacity-30",
      )}
      style={{ top: minutesToPosition(startMinutes), height: durationToHeight(job.durationMinutes) }}
      title={`${job.title} · ${timeRange}`}
    >
      <p className="truncate font-mono text-[11px] leading-tight">{job.title}</p>
    </div>
  )
}
