import type { Page } from "@playwright/test"
import { getNavigableDates } from "../src/scheduler/core/geometry"

export const API_URL = "http://localhost:5001/graphql"

// Mirrors what page.tsx computes server-side, so a spec knows which ISO
// date each tab (by position) corresponds to without parsing rendered
// labels — same reasoning as core/geometry.ts's own toISODate/UTC anchoring.
export const dates = getNavigableDates(new Date())

export type BoardData = {
  crews: { id: string; name: string }[]
  jobs: { title: string; crewId: string; date: string; startTime: string }[]
}

export async function fetchBoard(page: Page): Promise<BoardData> {
  const response = await page.request.post(API_URL, {
    data: {
      query: `query { board(dates: ${JSON.stringify(dates)}) { crews { id name } jobs { title crewId date startTime } } }`,
    },
  })
  const body = await response.json()
  return body.data.board
}

export async function fetchJob(page: Page, title: string) {
  const board = await fetchBoard(page)
  return board.jobs.find((job) => job.title === title)
}

/**
 * Drags whichever job block matches `jobTitlePattern` to a fixed
 * viewport point and drops it there. The follow-up 1px move after
 * arriving isn't a typo: dnd-kit's `over` lags one pointermove event
 * behind the true collision (ADR-003), so without it the drop can land
 * on whatever was `over` before the final move, not the target.
 */
export async function dragJobTo(page: Page, jobTitlePattern: RegExp, targetX: number, targetY: number) {
  const jobBlock = page.getByTitle(jobTitlePattern)
  const jobBox = await jobBlock.boundingBox()
  if (!jobBox) throw new Error(`Could not measure job block matching ${jobTitlePattern}`)

  await page.mouse.move(jobBox.x + jobBox.width / 2, jobBox.y + jobBox.height / 2)
  await page.mouse.down()
  // Clears PointerSensor's activation distance before anything else.
  await page.mouse.move(jobBox.x + jobBox.width / 2 + 10, jobBox.y + jobBox.height / 2 - 10, {
    steps: 5,
  })
  await page.mouse.move(targetX, targetY, { steps: 20 })
  await page.mouse.move(targetX + 1, targetY)
  await page.mouse.up()
}
