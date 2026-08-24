import { useDroppable } from "@dnd-kit/core"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/entrepta/tabs"
import { cn } from "@/lib/utils"
import { formatDayLabel } from "../core/geometry"
import type { Crew, DroppableData, Job } from "../core/types"
import { CrewColumn } from "./CrewColumn"

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
function DayTabTrigger({ date, children }: { date: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab:${date}`,
    data: { type: "tab", date } satisfies DroppableData,
  })

  return (
    <TabsTrigger ref={setNodeRef} value={date} className={cn(isOver && "bg-[var(--bg-hover-soft)]")}>
      {children}
    </TabsTrigger>
  )
}

export function DayTabs({ dates, crews, jobs, activeDate, onActiveDateChange }: DayTabsProps) {
  return (
    <Tabs value={activeDate} onValueChange={onActiveDateChange}>
      <TabsList>
        {dates.map((date) => (
          <DayTabTrigger key={date} date={date}>
            {formatDayLabel(date)}
          </DayTabTrigger>
        ))}
      </TabsList>
      {dates.map((date) => (
        <TabsContent key={date} value={date}>
          <div className="flex overflow-x-auto">
            {crews.map((crew) => (
              <CrewColumn
                key={crew.id}
                crew={crew}
                jobs={jobs.filter((job) => job.crewId === crew.id && job.date === date)}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
