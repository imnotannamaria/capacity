import { describe, expect, it } from "vitest"

import { findConflicts, hasConflict, slotsOverlap } from "./collision"
import type { Job } from "./types"

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    crewId: "crew-1",
    title: "Test job",
    date: "2026-01-01",
    startTime: "09:00",
    durationMinutes: 60,
    ...overrides,
  }
}

describe("slotsOverlap", () => {
  it("is true when one slot starts inside the other", () => {
    expect(
      slotsOverlap(
        { startMinutes: 0, durationMinutes: 60 },
        { startMinutes: 30, durationMinutes: 60 },
      ),
    ).toBe(true)
  })

  it("is false for two adjacent slots that only touch at the boundary", () => {
    expect(
      slotsOverlap(
        { startMinutes: 0, durationMinutes: 60 },
        { startMinutes: 60, durationMinutes: 30 },
      ),
    ).toBe(false)
  })

  it("is false for slots with a gap between them", () => {
    expect(
      slotsOverlap(
        { startMinutes: 0, durationMinutes: 60 },
        { startMinutes: 90, durationMinutes: 30 },
      ),
    ).toBe(false)
  })

  it("is true when one slot fully contains the other", () => {
    expect(
      slotsOverlap(
        { startMinutes: 0, durationMinutes: 120 },
        { startMinutes: 30, durationMinutes: 15 },
      ),
    ).toBe(true)
  })
})

describe("findConflicts", () => {
  it("finds an overlapping job on the same crew and date", () => {
    const existing = [job({ id: "job-2", startTime: "09:30", durationMinutes: 30 })]

    const conflicts = findConflicts(existing, {
      crewId: "crew-1",
      date: "2026-01-01",
      startTime: "09:00",
      durationMinutes: 60,
    })

    expect(conflicts.map((j) => j.id)).toEqual(["job-2"])
  })

  it("ignores an adjacent job on the same crew (no overlap)", () => {
    const existing = [job({ id: "job-2", startTime: "10:00", durationMinutes: 30 })]

    const conflicts = findConflicts(existing, {
      crewId: "crew-1",
      date: "2026-01-01",
      startTime: "09:00",
      durationMinutes: 60,
    })

    expect(conflicts).toEqual([])
  })

  it("ignores an overlapping job on a different crew", () => {
    const existing = [
      job({ id: "job-2", crewId: "crew-2", startTime: "09:00", durationMinutes: 60 }),
    ]

    const conflicts = findConflicts(existing, {
      crewId: "crew-1",
      date: "2026-01-01",
      startTime: "09:00",
      durationMinutes: 60,
    })

    expect(conflicts).toEqual([])
  })

  it("ignores an overlapping job on a different date", () => {
    const existing = [
      job({ id: "job-2", date: "2026-01-02", startTime: "09:00", durationMinutes: 60 }),
    ]

    const conflicts = findConflicts(existing, {
      crewId: "crew-1",
      date: "2026-01-01",
      startTime: "09:00",
      durationMinutes: 60,
    })

    expect(conflicts).toEqual([])
  })

  it("excludes the job's own id, so checking a move against its own slot is not a self-conflict", () => {
    const existing = [job({ id: "job-1", startTime: "09:00", durationMinutes: 60 })]

    const conflicts = findConflicts(existing, {
      id: "job-1",
      crewId: "crew-1",
      date: "2026-01-01",
      startTime: "09:00",
      durationMinutes: 60,
    })

    expect(conflicts).toEqual([])
  })
})

describe("hasConflict", () => {
  it("is true when findConflicts would return at least one job", () => {
    const existing = [job({ id: "job-2", startTime: "09:00", durationMinutes: 60 })]

    expect(
      hasConflict(existing, {
        crewId: "crew-1",
        date: "2026-01-01",
        startTime: "09:30",
        durationMinutes: 30,
      }),
    ).toBe(true)
  })

  it("is false when there is nothing to conflict with", () => {
    expect(
      hasConflict([], {
        crewId: "crew-1",
        date: "2026-01-01",
        startTime: "09:00",
        durationMinutes: 60,
      }),
    ).toBe(false)
  })
})
