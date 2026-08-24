import { durationToHeight } from "../core/geometry"
import type { Crew, Job } from "../core/types"
import { JobBlock } from "./JobBlock"

const MINUTES_PER_DAY = 24 * 60

export function CrewColumn({ crew, jobs }: { crew: Crew; jobs: Job[] }) {
  return (
    <div className="flex min-w-[180px] flex-1 flex-col border-r border-[var(--border-subtle)] last:border-r-0">
      <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--fg-secondary)]">
        {crew.name}
      </div>
      <div className="relative" style={{ height: durationToHeight(MINUTES_PER_DAY) }}>
        {jobs.map((job) => (
          <JobBlock key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}
