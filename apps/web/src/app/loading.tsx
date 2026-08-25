import { BoardSkeleton } from "@/scheduler/ui/BoardSkeleton"

// Shown while the page's server render is in flight. It draws the app shell
// and a board-shaped skeleton so navigation never flashes bare canvas.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-canvas)]">
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
        <span
          className="size-8 shrink-0 rounded-[var(--radius-md)]"
          style={{ background: "linear-gradient(150deg, var(--fg-brand) 0%, var(--crew-5) 100%)" }}
        />
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
            Capacity
          </span>
          <span className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            dispatch board
          </span>
        </div>
      </div>
      <main className="flex-1">
        <BoardSkeleton />
      </main>
    </div>
  )
}
