import { gql } from "@apollo/client"
import type { Crew, Job } from "../core/types"

export const BOARD_QUERY = gql`
  query Board($dates: [Date!]!) {
    board(dates: $dates) {
      crews {
        id
        name
      }
      jobs {
        id
        crewId
        title
        date
        startTime
        durationMinutes
      }
    }
  }
`

export type BoardQueryData = {
  board: {
    crews: Crew[]
    jobs: Job[]
  }
}

export type BoardQueryVariables = {
  dates: string[]
}
