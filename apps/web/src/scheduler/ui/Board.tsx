"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useQuery } from "@apollo/client/react"
import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/entrepta/skeleton"
import { cn } from "@/lib/utils"
import { createDragAutoSwitch, type DragAutoSwitch } from "../core/dragAutoSwitch"
import {
  clampStartMinutes,
  durationToHeight,
  minutesToTime,
  positionToMinutes,
  snapToSlot,
  timeToMinutes,
} from "../core/geometry"
import { hasConflict } from "../core/collision"
import type { DroppableData, Job } from "../core/types"
import { BOARD_QUERY, type BoardQueryData, type BoardQueryVariables } from "../data/queries"
import { useMoveJob } from "../data/use-move-job"
import { DayTabs } from "./DayTabs"

// dnd-kit's KeyboardSensor treats Tab as a synonym for Space/Enter (ends
// the drag) by default. ADR-003 wants Tab/Shift+Tab free for switching
// days instead, so the sensor below is configured with an `end` set that
// leaves Tab out — Space and Enter still drop the job.
const KEYBOARD_CODES = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
}

// pointerWithin alone breaks keyboard drags: it reads args.pointerCoordinates,
// which only a pointer/touch sensor ever populates, so a keyboard drag would
// never collide with anything, tab or crew column, for its whole duration.
// Precise pointer position is what "hovering a tab" (ADR-003) needs — a tab
// is thin enough that rectIntersection's bigger-overlap-wins logic would
// always pick the crew column underneath it instead — so this tries
// pointerWithin first and only falls back to rectIntersection when there's
// no pointer position to check, which is exactly the keyboard-drag case.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
}

function DragPreview({ job, conflict }: { job: Job; conflict: boolean }) {
  return (
    <div
      className={cn(
        "w-[176px] cursor-grabbing overflow-hidden rounded-[var(--radius-sm)] border px-2 py-1 text-[var(--fg-primary)] shadow-lg",
        conflict
          ? "border-[var(--status-error)] bg-[var(--status-error-soft)]"
          : "border-[var(--fg-brand)] bg-[var(--bg-surface-elevated)]",
      )}
      style={{ height: durationToHeight(job.durationMinutes) }}
    >
      <p className="truncate font-mono text-[11px] leading-tight">{job.title}</p>
    </div>
  )
}

export function Board({ dates }: { dates: string[] }) {
  const [activeDate, setActiveDate] = useState(dates[0])
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [dragConflict, setDragConflict] = useState(false)

  const { data, loading, error } = useQuery<BoardQueryData, BoardQueryVariables>(BOARD_QUERY, {
    variables: { dates },
  })

  const moveJob = useMoveJob()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_CODES }),
  )

  const jobs = data?.board.jobs ?? []

  // Lazy-initialized once: it owns a running timer across renders, so it
  // can't be recreated on every one. setActiveDate is stable across
  // renders (React guarantees this for useState setters), so the
  // callback never goes stale.
  const dragAutoSwitchRef = useRef<DragAutoSwitch>(undefined)
  if (dragAutoSwitchRef.current == null) {
    dragAutoSwitchRef.current = createDragAutoSwitch(setActiveDate)
  }

  // Tab/Shift+Tab switches days while a job is picked up, mouse or
  // keyboard drag alike — this is the keyboard equivalent of hovering a
  // tab (ADR-003), not something dnd-kit's own sensor provides.
  useEffect(() => {
    if (!activeJob) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return
      event.preventDefault()

      setActiveDate((currentDate) => {
        const currentIndex = dates.indexOf(currentDate)
        const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1
        const clampedIndex = Math.min(Math.max(nextIndex, 0), dates.length - 1)
        return dates[clampedIndex]
      })
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [activeJob, dates])

  function candidatePlacement(event: DragMoveEvent | DragEndEvent, job: Job) {
    const startMinutes = timeToMinutes(job.startTime)
    const rawStartMinutes = startMinutes + positionToMinutes(event.delta.y)
    const newStartMinutes = clampStartMinutes(snapToSlot(rawStartMinutes), job.durationMinutes)

    const overData = event.over?.data.current as DroppableData | undefined
    const newCrewId = overData?.type === "crew" ? overData.crewId : null

    return { newCrewId, newStartMinutes }
  }

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as Job | undefined
    setActiveJob(job ?? null)
    setDragConflict(false)
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!activeJob) return

    const overData = event.over?.data.current as DroppableData | undefined

    if (overData?.type === "tab") {
      dragAutoSwitchRef.current?.hover(overData.date === activeDate ? null : overData.date)
      setDragConflict(false)
      return
    }

    dragAutoSwitchRef.current?.hover(null)

    const { newCrewId, newStartMinutes } = candidatePlacement(event, activeJob)
    if (!newCrewId) {
      setDragConflict(false)
      return
    }

    const otherJobs = jobs.filter((job) => job.id !== activeJob.id)

    setDragConflict(
      hasConflict(otherJobs, {
        crewId: newCrewId,
        date: activeDate,
        startTime: minutesToTime(newStartMinutes),
        durationMinutes: activeJob.durationMinutes,
      }),
    )
  }

  function endDrag() {
    setActiveJob(null)
    setDragConflict(false)
    dragAutoSwitchRef.current?.cancel()
  }

  function handleDragEnd(event: DragEndEvent) {
    const job = activeJob
    endDrag()

    if (!job) return

    const { newCrewId, newStartMinutes } = candidatePlacement(event, job)
    // Dropping on a tab (or off any droppable) isn't a valid placement —
    // a tab is only ever a hover target for the auto-switch, never
    // somewhere a job can land.
    if (!newCrewId) return

    if (newCrewId === job.crewId && activeDate === job.date && newStartMinutes === timeToMinutes(job.startTime)) {
      return
    }

    void moveJob(job, newCrewId, activeDate, newStartMinutes)
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading board" className="flex flex-col gap-2 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="p-4 font-mono text-[13px] text-[var(--status-error-fg)]">
        Could not load the board: {error.message}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
    >
      <DayTabs
        dates={dates}
        crews={data.board.crews}
        jobs={jobs}
        activeDate={activeDate}
        onActiveDateChange={setActiveDate}
      />
      <DragOverlay>
        {activeJob ? <DragPreview job={activeJob} conflict={dragConflict} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
