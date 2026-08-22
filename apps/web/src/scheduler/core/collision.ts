import { timeToMinutes } from "./geometry"
import type { Job, TimeSlot } from "./types"

export function jobToTimeSlot(job: Pick<Job, "startTime" | "durationMinutes">): TimeSlot {
  return {
    startMinutes: timeToMinutes(job.startTime),
    durationMinutes: job.durationMinutes,
  }
}

/**
 * Half-open interval overlap: [start, start + duration). Two jobs that
 * touch at the boundary (one ends exactly when the other starts) do not
 * conflict, the same way two adjacent calendar events don't.
 */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aEnd = a.startMinutes + a.durationMinutes
  const bEnd = b.startMinutes + b.durationMinutes
  return a.startMinutes < bEnd && b.startMinutes < aEnd
}

export type JobPlacement = {
  /** Omit when checking a new job; set to the job's own id when checking a move. */
  id?: string
  crewId: string
  date: string
  startTime: string
  durationMinutes: number
}

/**
 * Existing jobs that would conflict with `placement`. This is the local
 * pre-check (CLAUDE.md, "Critical flow"), immediate feedback only, never
 * the verdict: the server re-checks on the mutation and wins any
 * disagreement (ADR-006).
 */
export function findConflicts(jobs: Job[], placement: JobPlacement): Job[] {
  const placementSlot = jobToTimeSlot(placement)

  return jobs.filter((job) => {
    if (job.id === placement.id) return false
    if (job.crewId !== placement.crewId) return false
    if (job.date !== placement.date) return false
    return slotsOverlap(placementSlot, jobToTimeSlot(job))
  })
}

export function hasConflict(jobs: Job[], placement: JobPlacement): boolean {
  return findConflicts(jobs, placement).length > 0
}
