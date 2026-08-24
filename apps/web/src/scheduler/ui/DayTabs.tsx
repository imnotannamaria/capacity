import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/entrepta/tabs"
import { formatDayLabel } from "../core/geometry"
import type { Crew, Job } from "../core/types"
import { CrewColumn } from "./CrewColumn"

type DayTabsProps = {
  dates: string[]
  crews: Crew[]
  jobs: Job[]
  activeDate: string
  onActiveDateChange: (date: string) => void
}

export function DayTabs({ dates, crews, jobs, activeDate, onActiveDateChange }: DayTabsProps) {
  return (
    <Tabs value={activeDate} onValueChange={onActiveDateChange}>
      <TabsList>
        {dates.map((date) => (
          <TabsTrigger key={date} value={date}>
            {formatDayLabel(date)}
          </TabsTrigger>
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
