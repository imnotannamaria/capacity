export type Crew = {
  __typename?: "CrewType"
  id: string
  name: string
}

export type Job = {
  __typename?: "JobType"
  id: string
  crewId: string
  title: string
  /** ISO date, "YYYY-MM-DD". */
  date: string
  /** "HH:MM" or "HH:MM:SS", the shape the API's Time scalar sends. */
  startTime: string
  durationMinutes: number
}

/**
 * A time range in minutes since midnight, decoupled from any particular
 * Job. geometry.ts and collision.ts operate on this, not on Job directly,
 * so the pure time maths doesn't carry the rest of the domain shape
 * around with it.
 */
export type TimeSlot = {
  startMinutes: number
  durationMinutes: number
}

/**
 * What a dnd-kit droppable is, attached as its `data`. Two kinds share
 * the same drag: a crew column (a valid place to drop a job) and a day
 * tab (never a drop target, only where core/dragAutoSwitch.ts watches
 * for a hover long enough to switch days, see ADR-003).
 */
export type DroppableData = { type: "crew"; crewId: string } | { type: "tab"; date: string }
