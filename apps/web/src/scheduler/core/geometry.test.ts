import { describe, expect, it } from "vitest"

import {
  durationToHeight,
  formatDayLabel,
  getNavigableDates,
  minutesToPosition,
  minutesToTime,
  snapToSlot,
  timeToMinutes,
  toISODate,
} from "./geometry"

describe("timeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(timeToMinutes("09:00")).toBe(540)
    expect(timeToMinutes("00:00")).toBe(0)
    expect(timeToMinutes("23:45")).toBe(1425)
  })

  it("parses HH:MM:SS, the API's Time scalar shape, ignoring seconds", () => {
    expect(timeToMinutes("09:00:00")).toBe(540)
    expect(timeToMinutes("13:30:45")).toBe(810)
  })
})

describe("minutesToTime", () => {
  it("is the inverse of timeToMinutes", () => {
    expect(minutesToTime(540)).toBe("09:00")
    expect(minutesToTime(0)).toBe("00:00")
    expect(minutesToTime(1425)).toBe("23:45")
  })

  it("zero-pads single-digit hours and minutes", () => {
    expect(minutesToTime(65)).toBe("01:05")
  })
})

describe("snapToSlot", () => {
  it("leaves a value already on a 15-minute boundary unchanged", () => {
    expect(snapToSlot(0)).toBe(0)
    expect(snapToSlot(60)).toBe(60)
    expect(snapToSlot(135)).toBe(135)
  })

  it("rounds down when closer to the boundary below", () => {
    expect(snapToSlot(37)).toBe(30)
  })

  it("rounds up when closer to the boundary above", () => {
    expect(snapToSlot(38)).toBe(45)
  })

  it("rounds a tie up", () => {
    expect(snapToSlot(37.5)).toBe(45)
  })
})

describe("minutesToPosition and durationToHeight", () => {
  it("are both 1 pixel per minute", () => {
    expect(minutesToPosition(90)).toBe(90)
    expect(durationToHeight(90)).toBe(90)
  })

  it("map zero to zero", () => {
    expect(minutesToPosition(0)).toBe(0)
    expect(durationToHeight(0)).toBe(0)
  })
})

describe("toISODate", () => {
  it("formats a plain date", () => {
    expect(toISODate(new Date(2026, 0, 15))).toBe("2026-01-15")
  })

  it("zero-pads single-digit months and days", () => {
    expect(toISODate(new Date(2026, 2, 5))).toBe("2026-03-05")
  })

  it("rolls over correctly at a month boundary", () => {
    expect(toISODate(new Date(2026, 0, 31))).toBe("2026-01-31")
  })
})

describe("getNavigableDates", () => {
  it("returns 3 consecutive days by default, starting at the reference date", () => {
    expect(getNavigableDates(new Date(2026, 0, 15))).toEqual([
      "2026-01-15",
      "2026-01-16",
      "2026-01-17",
    ])
  })

  it("rolls over into the next month", () => {
    expect(getNavigableDates(new Date(2026, 0, 30))).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
    ])
  })

  it("rolls over into the next year", () => {
    expect(getNavigableDates(new Date(2026, 11, 31))).toEqual([
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ])
  })

  it("respects a custom day count", () => {
    expect(getNavigableDates(new Date(2026, 0, 15), 1)).toEqual(["2026-01-15"])
  })
})

describe("formatDayLabel", () => {
  it("formats an ISO date as a short weekday and month", () => {
    // 2026-08-24 is a Monday.
    expect(formatDayLabel("2026-08-24")).toBe("Mon, Aug 24")
  })

  it("does not shift the date regardless of the host timezone", () => {
    expect(formatDayLabel("2026-01-01")).toBe("Thu, Jan 1")
    expect(formatDayLabel("2026-12-31")).toBe("Thu, Dec 31")
  })
})
