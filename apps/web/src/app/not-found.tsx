import Link from "next/link"
import { ArrowRight, MapPinOff } from "lucide-react"
import { buttonVariants } from "@/components/button"
import { EmptyState } from "@/components/empty-state"

// 404. Same visual language as the error and empty screens so a wrong URL
// lands somewhere that still feels like the product.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
      <EmptyState
        icon={MapPinOff}
        title="This route isn't on the board"
        description="The page you're after doesn't exist — it may have moved, or the link was mistyped. The dispatch board is one click away."
      >
        <Link href="/" className={buttonVariants({ variant: "primary" })}>
          Back to the board
          <ArrowRight size={15} aria-hidden />
        </Link>
      </EmptyState>
    </div>
  )
}
