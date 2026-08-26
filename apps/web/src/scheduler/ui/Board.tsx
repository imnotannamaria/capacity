"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MeasuringStrategy,
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
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { crewAccent } from "./crewColor"
import { BoardSkeleton } from "./BoardSkeleton"
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

// dnd-kit's default measures droppables *while* dragging, which is fine
// for a pointer drag (the overlay is born under the cursor, so a late
// measurement is invisible) but flashes on a keyboard pick-up: there's no
// pointer position to anchor the overlay to, so it's placed from the
// dragged block's own rect, and if that rect isn't measured yet the
// overlay pops in at the wrong size/position for a frame before snapping
// into place. Measuring before the drag starts means the rect is already
// known the instant Space fires, so there's nothing to snap into.
const measuring = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
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
  const accent = crewAccent(job.crewId)
  return (
    <div
      className={cn(
        "relative w-[184px] rotate-[1.5deg] cursor-grabbing overflow-hidden rounded-[var(--radius-sm)] border pl-2.5 pr-2 py-1 text-[var(--fg-primary)]",
        "shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
        conflict && "border-[var(--status-error)]",
      )}
      style={{
        height: durationToHeight(job.durationMinutes),
        backgroundColor: conflict ? "var(--status-error-soft)" : accent.soft,
        borderColor: conflict ? "var(--status-error)" : accent.solid,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: conflict ? "var(--status-error)" : accent.solid }}
      />
      <p className="flex items-center gap-1 truncate text-xs font-medium leading-tight">
        {conflict && (
          <AlertTriangle size={11} className="shrink-0 text-[var(--status-error)]" aria-hidden />
        )}
        <span className="truncate">{job.title}</span>
      </p>
      {conflict && <span className="sr-only">Conflict: overlaps another job</span>}
    </div>
  )
}

export function Board({ dates }: { dates: string[] }) {
  const [activeDate, setActiveDate] = useState(dates[0])
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [dragConflict, setDragConflict] = useState(false)

  const { data, loading, error, refetch } = useQuery<BoardQueryData, BoardQueryVariables>(BOARD_QUERY, {
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

  // Holding Space auto-repeats at the OS level, and dnd-kit's
  // KeyboardSensor never checks event.repeat: every repeated keydown for
  // a code in `end` (Space, here) re-triggers a drop, and because the
  // same code is also in `start`, the very next repeat can re-activate a
  // fresh pick-up — a drop/pick-up loop for as long as the key stays
  // down, which is what shows up as the overlay flickering. Swallowing
  // repeats for Space/Enter/Esc at the capture phase, before dnd-kit's
  // own document-level listener (attached in bubble phase) ever sees
  // them, leaves a held key doing nothing but its one real press. Arrow
  // keys are untouched: holding one to keep nudging the job is intended.
  useEffect(() => {
    if (!activeJob) return

    const suppressedCodes: string[] = [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Esc]

    function suppressKeyRepeat(event: KeyboardEvent) {
      if (event.repeat && suppressedCodes.includes(event.code)) {
        event.stopImmediatePropagation()
      }
    }

    document.addEventListener("keydown", suppressKeyRepeat, true)
    return () => document.removeEventListener("keydown", suppressKeyRepeat, true)
  }, [activeJob])

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
    return <BoardSkeleton />
  }

  if (error) {
    return (
      <div role="alert" className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Couldn't load the board"
          description="The dispatch API didn't answer. This is usually the server being down or unreachable, not your data — nothing was lost."
        >
          <Button onClick={() => void refetch()}>
            <RefreshCw size={15} aria-hidden />
            Try again
          </Button>
        </EmptyState>
        {error.message && (
          <p className="mt-4 max-w-[46ch] text-center font-mono text-tiny text-[var(--fg-muted)]">
            {error.message}
          </p>
        )}
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
      measuring={measuring}
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
