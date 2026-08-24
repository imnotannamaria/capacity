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

/**
 * Formats a `Date` as "YYYY-MM-DD" using its local year/month/day, then
 * re-anchors through `Date.UTC` before printing. `date.toISOString()`
 * alone would read the date back through UTC, which silently shifts to
 * the previous day for anyone west of UTC after local midnight.
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

/**
 * `days` consecutive ISO dates starting at `referenceDate`'s local
 * calendar day. Takes the "now" as a parameter instead of calling
 * `new Date()` itself, so the one non-deterministic call happens once,
 * server-side (see `page.tsx`), and every date after that is a plain
 * string passed down as a prop, never recomputed on the client.
 */
export function getNavigableDates(referenceDate: Date, days = 3): string[] {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()

  return Array.from({ length: days }, (_, index) =>
    new Date(Date.UTC(year, month, day + index)).toISOString().slice(0, 10),
  )
}

/**
 * "Mon, Aug 24" from an ISO date. Parses and formats both in UTC, so the
 * label always matches the literal string regardless of the reader's
 * timezone — the same trap `toISODate` guards against, in reverse.
 */
export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}
