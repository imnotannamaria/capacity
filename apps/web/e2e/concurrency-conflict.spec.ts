import { execSync } from "node:child_process"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { dragJobTo, fetchBoard } from "./helpers"

const API_DIR = path.resolve(__dirname, "../../api")

test.beforeEach(() => {
  execSync("uv run python seed.py", { cwd: API_DIR, stdio: "ignore" })
})

test("rejects a move into a slot another session just filled, and rolls back", async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  try {
    // Both load before either move — this is the whole point. Session B's
    // Apollo cache freezes here, at a moment when Crew B's afternoon is
    // still empty, and never hears about what session A does next.
    await pageA.goto("/")
    await pageB.goto("/")

    const initialBoard = await fetchBoard(pageA)
    const crewBId = initialBoard.crews.find((crew) => crew.name === "Crew B")?.id
    if (!crewBId) throw new Error("Seed data is missing Crew B")

    const crewBBoxA = await pageA.getByText("Crew B", { exact: true }).boundingBox()
    if (!crewBBoxA) throw new Error("Could not measure Crew B column in session A")
    const targetX = crewBBoxA.x + crewBBoxA.width / 2
    const targetY = crewBBoxA.y + 900 // deep afternoon, clear on every crew per seed.py

    // Session A: "Storage pickup" (Crew A, 13:00) → Crew B, afternoon.
    await dragJobTo(pageA, /Storage pickup/, targetX, targetY)
    await expect
      .poll(async () => (await fetchBoard(pageA)).jobs.find((job) => job.title === "Storage pickup")?.crewId)
      .toBe(crewBId)

    // Session B, unaware A just took that slot: "Piano delivery" (Crew C,
    // 09:30) → the exact same Crew B position. B's own local collision
    // pre-check runs against its stale cache and sees nothing wrong —
    // this drops straight through to the server, which has to catch it
    // on its own (ADR-006). If the server's conflict check were removed
    // or weakened, this would silently succeed instead of failing below.
    const crewBBoxB = await pageB.getByText("Crew B", { exact: true }).boundingBox()
    if (!crewBBoxB) throw new Error("Could not measure Crew B column in session B")
    await dragJobTo(pageB, /Piano delivery/, crewBBoxB.x + crewBBoxB.width / 2, crewBBoxB.y + 900)

    await expect(pageB.getByText(/move rejected/i)).toBeVisible()

    // The rollback is real, not just a UI flicker that happened to land
    // back where it started: re-fetch and confirm the server's own
    // record, not the DOM, still shows the pre-drag state.
    const finalBoard = await fetchBoard(pageB)
    const pianoDelivery = finalBoard.jobs.find((job) => job.title === "Piano delivery")
    const storagePickup = finalBoard.jobs.find((job) => job.title === "Storage pickup")

    expect(pianoDelivery?.crewId).not.toBe(crewBId)
    expect(pianoDelivery?.startTime.slice(0, 5)).toBe("09:30")
    // Session A's move is the one that actually stuck.
    expect(storagePickup?.crewId).toBe(crewBId)
  } finally {
    await contextA.close()
    await contextB.close()
  }
})
