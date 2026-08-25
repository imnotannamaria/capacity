import { useDroppable } from "@dnd-kit/core"
import { Boxes } from "lucide-react"
import { Badge } from "@/components/entrepta/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/entrepta/tabs"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { formatDayLabel } from "../core/geometry"
import type { Crew, DroppableData, Job } from "../core/types"
import { BoardGrid } from "./BoardGrid"

type DayTabsProps = {
  dates: string[]
  crews: Crew[]
  jobs: Job[]
  activeDate: string
  onActiveDateChange: (date: string) => void
}

/**
 * A tab is a drop target only so core/dragAutoSwitch.ts (wired in
 * Board.tsx) can tell when a drag is hovering it — dropping a job here
 * directly is never valid, only on a crew column once the tab has
 * switched. The `tab:` id prefix just keeps it out of dnd-kit's shared id
 * space with crews; `data.date` is what Board.tsx actually reads.
 */
function DayTabTrigger({
  date,
  label,
  count,
  isToday,
}: {
  date: string
  label: string
  count: number
  isToday: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab:${date}`,
    data: { type: "tab", date } satisfies DroppableData,
  })

  return (
    <TabsTrigger
      ref={setNodeRef}
      value={date}
      className={cn("gap-2", isOver && "bg-[var(--bg-hover-strong)] ring-1 ring-inset ring-[var(--fg-brand)]")}
    >
      {isToday && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--fg-brand)", boxShadow: "0 0 6px var(--bg-surface-brand)" }}
        />
      )}
      <span className="text-xs">{label}</span>
      <Badge
        variant="soft"
        color="neutral"
        size="sm"
        className="ml-1.5 min-w-[20px] justify-center rounded-full tabular-nums"
        aria-label={`${count} job${count === 1 ? "" : "s"}`}
      >
        {count}
      </Badge>
    </TabsTrigger>
  )
}

export function DayTabs({ dates, crews, jobs, activeDate, onActiveDateChange }: DayTabsProps) {
  // getNavigableDates builds the range starting at today, so the first date
  // is today — the day that gets the live now-line and the brand marker.
  const todayIso = dates[0]

  return (
    <Tabs value={activeDate} onValueChange={onActiveDateChange} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="shrink-0">
        {dates.map((date) => (
          <DayTabTrigger
            key={date}
            date={date}
            label={formatDayLabel(date)}
            isToday={date === todayIso}
            count={jobs.filter((job) => job.date === date).length}
          />
        ))}
      </TabsList>
      {dates.map((date) => (
        <TabsContent key={date} value={date} className="flex min-h-0 flex-1 flex-col">
          {crews.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={Boxes}
                title="No crews yet"
                description="Add a crew and a truck to open a lane on the board. Jobs are dragged into lanes, so there's nowhere to schedule until the first one exists."
              />
            </div>
          ) : (
            <BoardGrid crews={crews} jobs={jobs} date={date} todayIso={todayIso} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
