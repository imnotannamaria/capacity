import { gql } from "@apollo/client"
import type { Job } from "../core/types"

export const MOVE_JOB_MUTATION = gql`
  mutation MoveJob($jobId: ID!, $crewId: ID!, $date: Date!, $startTime: Time!) {
    moveJob(jobId: $jobId, crewId: $crewId, date: $date, startTime: $startTime) {
      job {
        id
        crewId
        title
        date
        startTime
        durationMinutes
      }
      errors {
        message
      }
    }
  }
`

export type MoveJobData = {
  moveJob: {
    __typename?: "MoveJobPayload"
    job: Job | null
    errors: { __typename?: "Error"; message: string }[]
  }
}

export type MoveJobVariables = {
  jobId: string
  crewId: string
  date: string
  startTime: string
}
