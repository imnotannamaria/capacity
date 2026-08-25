"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"

// Route-level error boundary. Client component by contract (it receives a
// reset() to re-render the segment). Keep it calm: say what happened, offer
// the one action that helps, don't leak a stack.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces in the browser console and, in prod, in Vercel logs.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
      <EmptyState
        icon={AlertTriangle}
        tone="error"
        title="Something broke on this screen"
        description="An unexpected error interrupted the board. It's been logged. Reloading the view usually clears it — your scheduled jobs are safe on the server."
      >
        <Button onClick={reset}>
          <RefreshCw size={15} aria-hidden />
          Reload the board
        </Button>
      </EmptyState>
    </div>
  )
}
