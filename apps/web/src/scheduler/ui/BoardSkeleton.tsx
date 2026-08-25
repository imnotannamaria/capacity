import { Skeleton } from "@/components/entrepta/skeleton"

/**
 * Loading state shaped like the board itself — tabs, a time axis, and a few
 * lanes with blocks roughed in — so the jump to real data is a fill-in, not
 * a layout swap. A generic spinner would flash a shape the board never
 * takes.
 */
export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading board" className="select-none">
      {/* tabs */}
      <div className="flex gap-0 border-b border-[var(--border-subtle)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 border-r border-[var(--border-subtle)] px-4 py-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton variant="circle" className="size-4" />
          </div>
        ))}
      </div>
      {/* grid */}
      <div className="flex">
        <div className="w-14 shrink-0 border-r border-[var(--border-subtle)]" />
        {[0, 1, 2, 3].map((col) => (
          <div key={col} className="flex min-w-[184px] flex-1 flex-col border-r border-[var(--border-subtle)] last:border-r-0">
            <div className="flex h-9 items-center gap-2 border-b border-[var(--border-subtle)] px-2.5">
              <Skeleton variant="circle" className="size-2" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="relative h-[540px] px-1 pt-2">
              {/* a couple of blocks at staggered offsets */}
              <Skeleton className="absolute inset-x-1 h-16 rounded-[var(--radius-sm)]" style={{ top: 24 + col * 18 }} />
              <Skeleton className="absolute inset-x-1 h-10 rounded-[var(--radius-sm)]" style={{ top: 150 + col * 12 }} />
              {col % 2 === 0 && (
                <Skeleton className="absolute inset-x-1 h-24 rounded-[var(--radius-sm)]" style={{ top: 260 }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
