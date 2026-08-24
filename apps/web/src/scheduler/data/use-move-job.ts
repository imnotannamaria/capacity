import { useMutation } from "@apollo/client/react"
import { toast } from "@/components/entrepta/toast"
import { minutesToTime } from "../core/geometry"
import type { Job } from "../core/types"
import { MOVE_JOB_MUTATION, type MoveJobData, type MoveJobVariables } from "./mutations"

/**
 * Wraps the moveJob mutation with its optimistic response and error
 * handling. Pulled out of Board.tsx so it can be tested directly, without
 * going through a real drag gesture — dnd-kit's collision detection needs
 * real layout (getBoundingClientRect, ResizeObserver, pointer capture),
 * none of which jsdom provides, so the drag itself is only ever verified
 * by hand or, later, by Playwright in a real browser.
 */
export function useMoveJob() {
  const [moveJobMutation] = useMutation<MoveJobData, MoveJobVariables>(MOVE_JOB_MUTATION)

  return function moveJob(job: Job, newCrewId: string, newDate: string, newStartMinutes: number) {
    const newStartTime = minutesToTime(newStartMinutes)

    return moveJobMutation({
      variables: { jobId: job.id, crewId: newCrewId, date: newDate, startTime: newStartTime },
      // The block jumps immediately. If the server rejects the move,
      // Apollo discards this optimistic layer once the real response
      // lands; since a rejection's `job` is null (ADR-006, ADR-009), the
      // real response writes nothing over the entity, so the cache falls
      // straight back to the pre-drag values — no manual rollback code,
      // the rollback IS the absence of a write.
      optimisticResponse: {
        moveJob: {
          __typename: "MoveJobPayload",
          job: {
            __typename: "JobType",
            id: job.id,
            crewId: newCrewId,
            title: job.title,
            date: newDate,
            startTime: newStartTime,
            durationMinutes: job.durationMinutes,
          },
          errors: [],
        },
      },
      onCompleted: (result) => {
        if (result.moveJob.errors.length > 0) {
          toast.error("Move rejected", {
            description: result.moveJob.errors.map((moveError) => moveError.message).join(", "),
          })
        }
      },
      onError: () => {
        toast.error("Could not reach the server", {
          description: "Check your connection and try again.",
        })
      },
    })
  }
}
