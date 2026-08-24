import { execSync } from "node:child_process"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { fetchBoard } from "./helpers"

const API_DIR = path.resolve(__dirname, "../../api")

test.beforeEach(() => {
  execSync("uv run python seed.py", { cwd: API_DIR, stdio: "ignore" })
})

// dnd-kit's PointerSensor handles mouse and touch through the same
// pointer-event listeners, distinguishing them only by `pointerType`.
// Playwright's `mouse` API always dispatches `pointerType: "mouse"`, so
// the mouse-drag specs (cross-day-drag.spec.ts, concurrency-conflict.spec.ts)
// never actually exercise the touch path — this is the only place that
// does, dispatching real PointerEvents with pointerType: "touch" instead.
test.use({ hasTouch: true })

/**
 * Dispatches one pointer event per call, each its own page.evaluate — a
 * single evaluate firing all five events back to back doesn't give React
 * a chance to flush state between them, and dnd-kit's `over` ends up one
 * event behind, same lag ADR-003 documents for the mouse path. Real touch
 * input never has this problem; only a script firing events with zero
 * gap between them does.
 */
async function fireTouchEvent(page: Page, type: string, x: number, y: number, targetSelector?: string) {
  await page.evaluate(
    ([type, x, y, targetSelector]) => {
      const event = new PointerEvent(type as string, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x as number,
        clientY: y as number,
      })
      const target = targetSelector
        ? [...document.querySelectorAll("[title]")].find((el) =>
            el.getAttribute("title")?.includes(targetSelector as string),
          )
        : document
      ;(target ?? document).dispatchEvent(event)
    },
    [type, x, y, targetSelector],
  )
  await page.waitForTimeout(50)
}

test("drags a job within the same day via touch", async ({ page }) => {
  await page.goto("/")

  const jobBlock = page.getByTitle(/Piano delivery/)
  await expect(jobBlock).toBeVisible()

  const jobBox = await jobBlock.boundingBox()
  const crewBBox = await page.getByText("Crew B", { exact: true }).boundingBox()
  if (!jobBox || !crewBBox) throw new Error("Could not measure job block or Crew B column")

  const startX = jobBox.x + jobBox.width / 2
  const startY = jobBox.y + jobBox.height / 2
  const targetX = crewBBox.x + crewBBox.width / 2
  const targetY = crewBBox.y + 900 // deep afternoon, clear on every crew per seed.py

  await fireTouchEvent(page, "pointerdown", startX, startY, "Piano delivery")
  await fireTouchEvent(page, "pointermove", startX + 10, startY + 10)
  await fireTouchEvent(page, "pointermove", targetX, targetY)
  await fireTouchEvent(page, "pointermove", targetX + 1, targetY)
  await fireTouchEvent(page, "pointerup", targetX, targetY)

  const board = await fetchBoard(page)
  const crewB = board.crews.find((crew) => crew.name === "Crew B")
  await expect
    .poll(async () => (await fetchBoard(page)).jobs.find((job) => job.title === "Piano delivery")?.crewId)
    .toBe(crewB?.id)
})
