/** The smallest unit of time on the board (see CLAUDE.md, "Slot"). */
export const SLOT_MINUTES = 15

export const MINUTES_PER_HOUR = 60

/**
 * 1 minute = 1 pixel. Arbitrary but fixed: geometry.ts is the only place
 * that gets to know this number, so the UI layer (Phase 3) never derives
 * a position by hand.
 */
export const PIXELS_PER_MINUTE = 1

/** Parses "HH:MM" or "HH:MM:SS" (the API's Time scalar) into minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hoursPart, minutesPart] = time.split(":")
  return Number(hoursPart) * MINUTES_PER_HOUR + Number(minutesPart)
}

/** The inverse of timeToMinutes. Always zero-pads to "HH:MM". */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  const remainder = minutes % MINUTES_PER_HOUR
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

/** Rounds to the nearest 15-minute boundary. Ties round up. */
export function snapToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
}

/** Vertical offset, in pixels, from the top of a day column. */
export function minutesToPosition(minutes: number): number {
  return minutes * PIXELS_PER_MINUTE
}

/** Block height, in pixels, for a job of this duration. */
export function durationToHeight(durationMinutes: number): number {
  return durationMinutes * PIXELS_PER_MINUTE
}
