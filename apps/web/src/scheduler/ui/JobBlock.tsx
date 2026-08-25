import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { durationToHeight, minutesToPosition, minutesToTime, timeToMinutes } from "../core/geometry"
import type { Job } from "../core/types"
import type { CrewAccent } from "./crewColor"

export function JobBlock({ job, accent }: { job: Job; accent: CrewAccent }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })

  const startMinutes = timeToMinutes(job.startTime)
  const endMinutes = startMinutes + job.durationMinutes
  const timeRange = `${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`
  const height = durationToHeight(job.durationMinutes)
  // Below ~44px there's only room for one line; drop the time range so the
  // title never gets clipped mid-word.
  const showMeta = height >= 44

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group absolute inset-x-1 cursor-grab touch-none overflow-hidden rounded-[var(--radius-sm)]",
        "border border-[var(--border-subtle)] pl-2.5 pr-2 py-1 text-[var(--fg-primary)]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.18)]",
        "transition-[transform,box-shadow,border-color] duration-[150ms] [transition-timing-function:var(--ease-out-quint)]",
        "hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.28)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        isDragging && "opacity-40",
      )}
      style={{
        top: minutesToPosition(startMinutes),
        height,
        backgroundColor: accent.soft,
        borderColor: "color-mix(in srgb, var(--border-subtle) 60%, transparent)",
      }}
      title={`${job.title} · ${timeRange}`}
    >
      {/* accent bar — the lane's colour, so a block reads as belonging to its crew */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-left rounded-l-[var(--radius-sm)] transition-transform duration-150 group-hover:scale-x-[1.33]"
        style={{ backgroundColor: accent.solid }}
      />
      <p className="truncate text-xs font-medium leading-tight">{job.title}</p>
      {showMeta && (
        <p className="mt-0.5 truncate font-mono text-micro leading-tight tabular-nums text-[var(--fg-muted)]">
          {timeRange}
        </p>
      )}
    </div>
  )
}
