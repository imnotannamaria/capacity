// @vitest-environment jsdom
import { MockedProvider } from "@apollo/client/testing/react"
import type { ComponentProps } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { BOARD_QUERY } from "../data/queries"
import { Board } from "./Board"

type Mocks = ComponentProps<typeof MockedProvider>["mocks"]

const DATES = ["2026-01-01", "2026-01-02"]

const SUCCESS_DATA = {
  board: {
    crews: [{ id: "crew-1", __typename: "CrewType", name: "Crew A" }],
    jobs: [
      {
        id: "job-1",
        __typename: "JobType",
        crewId: "crew-1",
        title: "Downtown move",
        date: "2026-01-01",
        startTime: "09:00",
        durationMinutes: 60,
      },
    ],
  },
}

function renderBoard(mocks: Mocks) {
  return render(
    <MockedProvider mocks={mocks}>
      <Board dates={DATES} />
    </MockedProvider>,
  )
}

describe("Board", () => {
  it("shows a loading state before the query resolves", () => {
    renderBoard([
      {
        request: { query: BOARD_QUERY, variables: { dates: DATES } },
        result: { data: SUCCESS_DATA },
        delay: 20,
      },
    ])

    expect(screen.getByRole("status", { name: /loading board/i })).toBeInTheDocument()
  })

  it("renders the board once the query resolves", async () => {
    renderBoard([
      {
        request: { query: BOARD_QUERY, variables: { dates: DATES } },
        result: { data: SUCCESS_DATA },
      },
    ])

    expect(await screen.findByText("Downtown move")).toBeInTheDocument()
    expect(screen.queryByRole("status", { name: /loading board/i })).not.toBeInTheDocument()
  })

  it("shows an error state when the query fails", async () => {
    renderBoard([
      {
        request: { query: BOARD_QUERY, variables: { dates: DATES } },
        error: new Error("network down"),
      },
    ])

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load the board/i)
  })

  it("switches which day's jobs are visible when a tab is clicked", async () => {
    const dates = ["2026-01-01", "2026-01-02"]
    const data = {
      board: {
        crews: [{ id: "crew-1", __typename: "CrewType", name: "Crew A" }],
        jobs: [
          {
            id: "job-1",
            __typename: "JobType",
            crewId: "crew-1",
            title: "Day one job",
            date: "2026-01-01",
            startTime: "09:00",
            durationMinutes: 60,
          },
          {
            id: "job-2",
            __typename: "JobType",
            crewId: "crew-1",
            title: "Day two job",
            date: "2026-01-02",
            startTime: "09:00",
            durationMinutes: 60,
          },
        ],
      },
    }

    const user = userEvent.setup()
    render(
      <MockedProvider
        mocks={[{ request: { query: BOARD_QUERY, variables: { dates } }, result: { data } }]}
      >
        <Board dates={dates} />
      </MockedProvider>,
    )

    expect(await screen.findByText("Day one job")).toBeInTheDocument()
    expect(screen.queryByText("Day two job")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /jan 2/i }))

    await waitFor(() => expect(screen.getByText("Day two job")).toBeInTheDocument())
    expect(screen.queryByText("Day one job")).not.toBeInTheDocument()
  })
})
