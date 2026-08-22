export type Crew = {
  id: string
  name: string
}

export type Job = {
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
