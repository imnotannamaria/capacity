// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Crew, Job } from "../core/types"
import { DayTabs } from "./DayTabs"

const crews: Crew[] = [
  { id: "crew-1", name: "Crew A" },
  { id: "crew-2", name: "Crew B" },
]

const jobs: Job[] = [
  {
    id: "job-1",
    crewId: "crew-1",
    title: "Downtown move",
    date: "2026-01-01",
    startTime: "09:00",
    durationMinutes: 60,
  },
  {
    id: "job-2",
    crewId: "crew-2",
    title: "Office move",
    date: "2026-01-02",
    startTime: "10:00",
    durationMinutes: 120,
  },
]

function renderDayTabs(activeDate: string) {
  const onActiveDateChange = vi.fn()
  const utils = render(
    <DayTabs
      dates={["2026-01-01", "2026-01-02"]}
      crews={crews}
      jobs={jobs}
      activeDate={activeDate}
      onActiveDateChange={onActiveDateChange}
    />,
  )
  return { onActiveDateChange, ...utils }
}

describe("DayTabs", () => {
  it("shows only the active day's jobs", () => {
    renderDayTabs("2026-01-01")

    expect(screen.getByText("Downtown move")).toBeInTheDocument()
    expect(screen.queryByText("Office move")).not.toBeInTheDocument()
  })

  it("positions a job using its start time and duration", () => {
    renderDayTabs("2026-01-01")

    const block = screen.getByText("Downtown move").closest("div[style]")
    // 09:00 = 540 minutes, PIXELS_PER_MINUTE = 1 (geometry.ts).
    expect(block).toHaveStyle({ top: "540px", height: "60px" })
  })

  it("renders every crew as a column even with no jobs for the active day", () => {
    renderDayTabs("2026-01-01")

    expect(screen.getByText("Crew A")).toBeInTheDocument()
    expect(screen.getByText("Crew B")).toBeInTheDocument()
  })

  it("calls onActiveDateChange with the clicked tab's date", async () => {
    const user = userEvent.setup()
    const { onActiveDateChange } = renderDayTabs("2026-01-01")

    await user.click(screen.getByRole("tab", { name: /jan 2/i }))

    expect(onActiveDateChange).toHaveBeenCalledWith("2026-01-02")
  })
})
