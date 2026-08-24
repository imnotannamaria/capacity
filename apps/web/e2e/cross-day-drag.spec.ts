import { execSync } from "node:child_process"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { getNavigableDates } from "../src/scheduler/core/geometry"

const API_URL = "http://localhost:5001/graphql"
const API_DIR = path.resolve(__dirname, "../../api")

// Mirrors what page.tsx computes server-side, so the test knows which ISO
// date each tab (by position) corresponds to without parsing rendered
// labels — same reasoning as core/geometry.ts's own toISODate/UTC anchoring.
const dates = getNavigableDates(new Date())

test.beforeEach(() => {
  // Each test drags a different job (see below), but reseeding keeps
  // every test independent of what an earlier one in the run left behind.
  execSync("uv run python seed.py", { cwd: API_DIR, stdio: "ignore" })
})

async function fetchBoard(page: import("@playwright/test").Page) {
  const response = await page.request.post(API_URL, {
    data: {
      query: `query { board(dates: ${JSON.stringify(dates)}) { crews { id name } jobs { title crewId date startTime } } }`,
    },
  })
  const body = await response.json()
  return body.data.board as {
    crews: { id: string; name: string }[]
    jobs: { title: string; crewId: string; date: string; startTime: string }[]
  }
}

async function fetchJob(page: import("@playwright/test").Page, title: string) {
  const board = await fetchBoard(page)
  return board.jobs.find((job) => job.title === title)
}

test("drags a job to another day via mouse, hovering the tab to auto-switch", async ({ page }) => {
  await page.goto("/")

  const dayTabs = page.getByRole("tab")
  const jobBlock = page.getByTitle(/Downtown loft move/)
  await expect(jobBlock).toBeVisible()

  const jobBox = await jobBlock.boundingBox()
  const tab2Box = await dayTabs.nth(1).boundingBox()
  if (!jobBox || !tab2Box) throw new Error("Could not measure job block or tab")

  await page.mouse.move(jobBox.x + jobBox.width / 2, jobBox.y + jobBox.height / 2)
  await page.mouse.down()
  // Clears PointerSensor's activation distance before anything else.
  await page.mouse.move(jobBox.x + jobBox.width / 2 + 10, jobBox.y + jobBox.height / 2 - 10, {
    steps: 5,
  })

  await page.mouse.move(tab2Box.x + tab2Box.width / 2, tab2Box.y + tab2Box.height / 2, {
    steps: 20,
  })
  // dnd-kit's `over` lags one pointermove behind the true collision: the
  // move above lands the cursor on the tab, but `over` still reflects
  // wherever it was before that move. A follow-up jitter — what a real
  // mouse settling into place does naturally — is what flushes it.
  await page.mouse.move(tab2Box.x + tab2Box.width / 2 + 1, tab2Box.y + tab2Box.height / 2)

  // Past DRAG_AUTO_SWITCH_THRESHOLD_MS (600ms) — the switch is a timer, not
  // dependent on further pointer movement once armed.
  await page.waitForTimeout(700)

  await expect(dayTabs.nth(1)).toHaveAttribute("data-state", "active")

  // Drop deep in Crew B's column on the new day — 08:00-12:00 and
  // 09:00-11:30 are the only occupied slots on Tue per seed.py, so late
  // afternoon is clear on every crew.
  // The header reads "CREW B" on screen via CSS text-transform, but the
  // actual text node is "Crew B" — getByText matches DOM text, not the
  // rendered case.
  const crewBHeader = page.getByText("Crew B", { exact: true })
  const crewBBox = await crewBHeader.boundingBox()
  if (!crewBBox) throw new Error("Could not measure Crew B column")

  await page.mouse.move(crewBBox.x + crewBBox.width / 2, crewBBox.y + 900, { steps: 15 })
  await page.mouse.up()

  await expect
    .poll(async () => (await fetchJob(page, "Downtown loft move"))?.date)
    .toBe(dates[1])

  const board = await fetchBoard(page)
  const crewB = board.crews.find((crew) => crew.name === "Crew B")
  const moved = board.jobs.find((job) => job.title === "Downtown loft move")
  expect(moved?.crewId).toBe(crewB?.id)
})

test("drags a job to another day via keyboard, and checks the conflict against the destination day", async ({
  page,
}) => {
  await page.goto("/")

  // Wednesday already has "Cross-town move" on Crew A at 09:00 (seed.py) —
  // dropping "Downtown loft move" there at its own 09:00 must be rejected,
  // proving the conflict check runs against the destination day, not the
  // origin, which is this whole phase's point (ADR-003).
  const jobBlock = page.getByTitle(/Downtown loft move/)
  await jobBlock.focus()

  await page.keyboard.press("Space")
  await page.keyboard.press("Tab")
  await page.keyboard.press("Tab")

  await expect(page.getByRole("tab").nth(2)).toHaveAttribute("data-state", "active")

  await page.keyboard.press("Space")

  await expect(page.getByText(/move rejected/i)).toBeVisible()

  const unchanged = await fetchJob(page, "Downtown loft move")
  expect(unchanged?.date).toBe(dates[0])
  expect(unchanged?.startTime.slice(0, 5)).toBe("09:00")
})
