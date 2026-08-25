import { type VariantProps, cva } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The one button style used across the unhappy paths (board error, route
 * error, 404). Extracted so those three stop repeating the same class
 * string. `buttonVariants` is exported too, so a Next `<Link>` — which must
 * stay an anchor for client navigation — can wear the exact same look
 * without wrapping it in a <button>.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        secondary:
          "border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:border-[var(--fg-brand)] hover:bg-[var(--bg-hover-soft)]",
        primary:
          "bg-[var(--fg-brand)] text-[var(--bg-canvas)] transition-[filter] hover:brightness-110 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
)
Button.displayName = "Button"
