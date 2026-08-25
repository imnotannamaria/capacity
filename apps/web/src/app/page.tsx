import { AppHeader } from "@/components/app-header"
import { formatDayLabel, getNavigableDates } from "@/scheduler/core/geometry"
import { Board } from "@/scheduler/ui/Board"

// "Today" changes daily; caching this page would freeze it at whatever
// day the last build happened to run on.
export const dynamic = "force-dynamic"

export default function Home() {
  const dates = getNavigableDates(new Date())

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-canvas)]">
      <AppHeader today={formatDayLabel(dates[0])} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Board dates={dates} />
      </main>
    </div>
  )
}
