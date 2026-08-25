import type { LucideIcon } from "lucide-react"

/**
 * The designed version of "there's nothing here". A framed icon, a plain
 * sentence about what's missing, and room for one action — used for an
 * empty board and reused by the error and not-found screens so the three
 * unhappy paths feel like one product, not three afterthoughts.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  tone = "neutral",
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: React.ReactNode
  tone?: "neutral" | "brand" | "error"
}) {
  const accent =
    tone === "error" ? "var(--status-error)" : tone === "brand" ? "var(--fg-brand)" : "var(--fg-muted)"
  const wash =
    tone === "error"
      ? "var(--status-error-soft)"
      : tone === "brand"
        ? "var(--bg-surface-brand)"
        : "var(--bg-hover-strong)"

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-5 grid size-14 place-items-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
        style={{ backgroundColor: wash }}
      >
        <Icon size={24} style={{ color: accent }} aria-hidden strokeWidth={1.75} />
      </div>
      <h2 className="t-heading-md text-[var(--fg-primary)]">{title}</h2>
      <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-[var(--fg-secondary)]">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
