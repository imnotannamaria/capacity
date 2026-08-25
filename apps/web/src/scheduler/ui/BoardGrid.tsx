"use client"

import { useEffect, useRef } from "react"
import { businessStartPosition } from "../core/geometry"
import type { Crew, Job } from "../core/types"
import { CrewColumn } from "./CrewColumn"
import { TimeRuler } from "./TimeRuler"
import { useNowMinutes } from "./useNowMinutes"

/**
 * One day's grid: the time axis plus every crew lane, in a container that
 * scrolls a full 24h internally while the header and tabs stay fixed. On
 * mount it jumps to business hours, so a fresh board opens on the part of
 * the day people actually schedule instead of on empty small-hours.
 */
export function BoardGrid({
  crews,
  jobs,
  date,
  todayIso,
}: {
  crews: Crew[]
  jobs: Job[]
  date: string
  todayIso: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMinutes = useNowMinutes(date, todayIso)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollTop !== 0) return
    // rAF so the 24h height is laid out before we scroll into it.
    const id = requestAnimationFrame(() => {
      el.scrollTop = businessStartPosition()
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={scrollRef}
      // Fills the flex-sized content area (main → Tabs → TabsContent are all
      // flex-1/min-h-0), so the 24h grid scrolls internally while the header
      // and tabs stay put. max-h-dvh is a harmless ceiling, not a computed
      // guess at the chrome's height.
      className="h-full max-h-dvh min-h-0 overflow-auto"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="flex min-w-max">
        <TimeRuler />
        {crews.map((crew, index) => (
          <CrewColumn
            key={crew.id}
            crew={crew}
            index={index}
            nowMinutes={nowMinutes}
            jobs={jobs.filter((job) => job.crewId === crew.id && job.date === date)}
          />
        ))}
      </div>
    </div>
  )
}
