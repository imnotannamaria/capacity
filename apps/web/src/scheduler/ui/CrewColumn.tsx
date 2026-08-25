import { useDroppable } from "@dnd-kit/core"
import { Truck } from "lucide-react"
import { Badge } from "@/components/entrepta/badge"
import { cn } from "@/lib/utils"
import { durationToHeight, MINUTES_PER_DAY, minutesToPosition } from "../core/geometry"
import type { Crew, DroppableData, Job } from "../core/types"
import { crewAccent } from "./crewColor"
import { JobBlock } from "./JobBlock"

// One 1px line at the top of every hour, drawn as a background so it costs
// no DOM. Aligns exactly with the ruler labels — both come from geometry.
const HOUR_GRID =
  "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--border-subtle) 55%, transparent) 0, color-mix(in srgb, var(--border-subtle) 55%, transparent) 1px, transparent 1px, transparent 60px)"

export function CrewColumn({
  crew,
  jobs,
  nowMinutes,
  index,
}: {
  crew: Crew
  jobs: Job[]
  nowMinutes: number | null
  index: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: crew.id,
    data: { type: "crew", crewId: crew.id } satisfies DroppableData,
  })

  const accent = crewAccent(crew.id)

  return (
    <div
      className="animate-rise-in flex min-w-[184px] flex-1 flex-col border-r border-[var(--border-subtle)] last:border-r-0"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* header */}
      <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent.solid, boxShadow: `0 0 6px ${accent.soft}` }}
        />
        <Truck size={13} className="shrink-0 text-[var(--fg-muted)]" aria-hidden />
        <span className="truncate font-mono text-tiny font-medium uppercase tracking-[0.06em] text-[var(--fg-secondary)]">
          {crew.name}
        </span>
        <Badge
          variant="soft"
          color="neutral"
          size="sm"
          className="ml-auto min-w-[20px] justify-center rounded-full tabular-nums"
          aria-label={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        >
          {jobs.length}
        </Badge>
      </div>

      {/* body — the droppable lane */}
      <div
        ref={setNodeRef}
        className={cn("relative transition-colors duration-150")}
        style={{ height: durationToHeight(MINUTES_PER_DAY), backgroundImage: HOUR_GRID }}
      >
        {isOver && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundColor: accent.soft,
              boxShadow: `inset 0 0 0 1.5px ${accent.solid}`,
            }}
          />
        )}

        {nowMinutes != null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 h-px"
            style={{ top: minutesToPosition(nowMinutes), backgroundColor: "var(--status-error)" }}
          >
            <span
              className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: "var(--status-error)", animation: "now-pulse 2.4s ease-in-out infinite" }}
            />
          </div>
        )}

        {jobs.map((job) => (
          <JobBlock key={job.id} job={job} accent={accent} />
        ))}
      </div>
    </div>
  )
}
