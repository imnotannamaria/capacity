import { getNavigableDates } from "@/scheduler/core/geometry"
import { Board } from "@/scheduler/ui/Board"

// "Today" changes daily; caching this page would freeze it at whatever
// day the last build happened to run on.
export const dynamic = "force-dynamic"

export default function Home() {
  const dates = getNavigableDates(new Date())

  return (
    <main className="min-h-screen bg-[var(--bg-canvas)]">
      <Board dates={dates} />
    </main>
  )
}
