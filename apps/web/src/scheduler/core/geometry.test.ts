import { describe, expect, it } from "vitest"

import {
  durationToHeight,
  minutesToPosition,
  minutesToTime,
  snapToSlot,
  timeToMinutes,
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
