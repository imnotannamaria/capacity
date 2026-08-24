"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useMutation, useQuery } from "@apollo/client/react"
import { useState } from "react"
import { Skeleton } from "@/components/entrepta/skeleton"
import { cn } from "@/lib/utils"
import {
  clampStartMinutes,
  durationToHeight,
  minutesToTime,
  positionToMinutes,
  snapToSlot,
  timeToMinutes,
} from "../core/geometry"
import { hasConflict } from "../core/collision"
import type { Job } from "../core/types"
import { BOARD_QUERY, type BoardQueryData, type BoardQueryVariables } from "../data/queries"
import { MOVE_JOB_MUTATION, type MoveJobData, type MoveJobVariables } from "../data/mutations"
import { DayTabs } from "./DayTabs"

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

  const [moveJob] = useMutation<MoveJobData, MoveJobVariables>(MOVE_JOB_MUTATION, {
    refetchQueries: [{ query: BOARD_QUERY, variables: { dates } }],
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const jobs = data?.board.jobs ?? []

  function candidatePlacement(event: DragMoveEvent | DragEndEvent, job: Job) {
    const startMinutes = timeToMinutes(job.startTime)
    const rawStartMinutes = startMinutes + positionToMinutes(event.delta.y)
    const newStartMinutes = clampStartMinutes(snapToSlot(rawStartMinutes), job.durationMinutes)
    const newCrewId = event.over ? String(event.over.id) : job.crewId
    return { newCrewId, newStartMinutes }
  }

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as Job | undefined
    setActiveJob(job ?? null)
    setDragConflict(false)
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!activeJob) return

    const { newCrewId, newStartMinutes } = candidatePlacement(event, activeJob)
    const otherJobs = jobs.filter((job) => job.id !== activeJob.id)

    setDragConflict(
      hasConflict(otherJobs, {
        crewId: newCrewId,
        date: activeJob.date,
        startTime: minutesToTime(newStartMinutes),
        durationMinutes: activeJob.durationMinutes,
      }),
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const job = activeJob
    setActiveJob(null)
    setDragConflict(false)

    if (!job || !event.over) return

    const { newCrewId, newStartMinutes } = candidatePlacement(event, job)

    if (newCrewId === job.crewId && newStartMinutes === timeToMinutes(job.startTime)) {
      return
    }

    // No optimistic update yet (Phase 5): the block stays where it was
    // until refetchQueries brings back the server's answer, conflict or
    // not — the pause here is deliberate, not a missing feature.
    void moveJob({
      variables: {
        jobId: job.id,
        crewId: newCrewId,
        date: job.date,
        startTime: minutesToTime(newStartMinutes),
      },
    })
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
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveJob(null)
        setDragConflict(false)
      }}
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
