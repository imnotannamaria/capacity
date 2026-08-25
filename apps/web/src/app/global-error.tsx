"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import "./globals.css"

/**
 * Last-resort boundary: catches errors thrown in the root layout itself,
 * where the normal error.tsx can't reach. It replaces <html>/<body>
 * entirely, so it imports globals.css for the tokens and renders the same
 * calm error screen. Fonts fall back to system here — this page should be
 * rare enough that the missing display face doesn't matter.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="The app failed to start"
            description="Something broke before the board could load. It's been logged. Reloading usually clears it."
          >
            <Button onClick={reset}>
              <RefreshCw size={15} aria-hidden />
              Reload
            </Button>
          </EmptyState>
        </div>
      </body>
    </html>
  )
}
