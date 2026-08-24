// @vitest-environment jsdom
import { MockedProvider } from "@apollo/client/testing/react"
import { useQuery } from "@apollo/client/react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it } from "vitest"
import { Toaster } from "@/components/entrepta/toast"
import { MOVE_JOB_MUTATION } from "./mutations"
import { BOARD_QUERY, type BoardQueryData, type BoardQueryVariables } from "./queries"
import { useMoveJob } from "./use-move-job"

type Mocks = ComponentProps<typeof MockedProvider>["mocks"]

const DATES = ["2026-01-01"]

const INITIAL_DATA = {
  board: {
    crews: [
      { id: "crew-1", __typename: "CrewType", name: "Crew A" },
      { id: "crew-2", __typename: "CrewType", name: "Crew B" },
    ],
    jobs: [
      {
        id: "job-1",
        __typename: "JobType",
        crewId: "crew-1",
        title: "Test job",
        date: "2026-01-01",
        startTime: "09:00",
        durationMinutes: 60,
      },
    ],
  },
}

const BOARD_MOCK = {
  request: { query: BOARD_QUERY, variables: { dates: DATES } },
  result: { data: INITIAL_DATA },
}

function Harness() {
  const { data } = useQuery<BoardQueryData, BoardQueryVariables>(BOARD_QUERY, {
    variables: { dates: DATES },
  })
  const moveJob = useMoveJob()
  const job = data?.board.jobs[0]

  if (!job) return null

  return (
    <div>
      <div data-testid="crew">{job.crewId}</div>
      <div data-testid="time">{job.startTime}</div>
      {/* 660 minutes = 11:00, on crew-2, same day */}
      <button type="button" onClick={() => moveJob(job, "crew-2", job.date, 660)}>
        move
      </button>
    </div>
  )
}

function renderHarness(mocks: Mocks) {
  // MockedProvider calls React.Children.only on its children, so Toaster
  // and Harness have to be a single element — a Fragment, not two siblings.
  return render(
    <MockedProvider mocks={mocks}>
      <>
        <Toaster />
        <Harness />
      </>
    </MockedProvider>,
  )
}

describe("useMoveJob", () => {
  it("moves the job in the cache immediately, before the server responds (optimistic)", async () => {
    const user = userEvent.setup()
    renderHarness([
      BOARD_MOCK,
      {
        request: {
          query: MOVE_JOB_MUTATION,
          variables: { jobId: "job-1", crewId: "crew-2", date: "2026-01-01", startTime: "11:00" },
        },
        // Delayed on purpose: the assertion right after the click has to
        // catch the *optimistic* write, before this response exists.
        delay: 50,
        result: {
          data: {
            moveJob: {
              __typename: "MoveJobPayload",
              job: {
                __typename: "JobType",
                id: "job-1",
                crewId: "crew-2",
                title: "Test job",
                date: "2026-01-01",
                startTime: "11:00",
                durationMinutes: 60,
              },
              errors: [],
            },
          },
        },
      },
    ])

    await screen.findByTestId("crew")
    expect(screen.getByTestId("crew")).toHaveTextContent("crew-1")

    await user.click(screen.getByRole("button", { name: "move" }))

    expect(screen.getByTestId("crew")).toHaveTextContent("crew-2")
    expect(screen.getByTestId("time")).toHaveTextContent("11:00")
  })

  it("rolls back to the original crew and time when the server rejects the move", async () => {
    const user = userEvent.setup()
    renderHarness([
      BOARD_MOCK,
      {
        request: {
          query: MOVE_JOB_MUTATION,
          variables: { jobId: "job-1", crewId: "crew-2", date: "2026-01-01", startTime: "11:00" },
        },
        delay: 50,
        result: {
          data: {
            moveJob: {
              __typename: "MoveJobPayload",
              job: null,
              errors: [{ __typename: "Error", message: "Conflicts with 'Existing job'" }],
            },
          },
        },
      },
    ])

    await screen.findByTestId("crew")
    await user.click(screen.getByRole("button", { name: "move" }))

    // Optimistic jump lands first...
    expect(screen.getByTestId("crew")).toHaveTextContent("crew-2")

    // ...then the rejection arrives and the cache reverts on its own —
    // no rollback code to call, see use-move-job.ts.
    await waitFor(() => expect(screen.getByTestId("crew")).toHaveTextContent("crew-1"))
    expect(screen.getByTestId("time")).toHaveTextContent("09:00")

    await screen.findByText(/conflicts with 'existing job'/i)
  })

  it("shows a distinct message on a network failure, not a rejection", async () => {
    const user = userEvent.setup()
    renderHarness([
      BOARD_MOCK,
      {
        request: {
          query: MOVE_JOB_MUTATION,
          variables: { jobId: "job-1", crewId: "crew-2", date: "2026-01-01", startTime: "11:00" },
        },
        error: new Error("network down"),
      },
    ])

    await screen.findByTestId("crew")
    await user.click(screen.getByRole("button", { name: "move" }))

    await screen.findByText(/could not reach the server/i)
    expect(screen.getByTestId("crew")).toHaveTextContent("crew-1")
  })
})
