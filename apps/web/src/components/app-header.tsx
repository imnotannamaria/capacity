import { CalendarClock } from "lucide-react"
import { ModeToggle } from "./mode-toggle"

/**
 * The app's face: a wordmark and the board's identity, plus a quiet legend
 * on the right. Deliberately tertiary chrome — it names the tool without
 * competing with the board, which is the one thing on the screen that
 * should read first.
 */

function LogoMark() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)]"
      style={{
        background: "linear-gradient(150deg, var(--fg-brand) 0%, var(--crew-5) 100%)",
        boxShadow: "0 2px 8px var(--bg-surface-brand), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
      aria-hidden
    >
      {/* three stacked blocks — the board, in miniature */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="3" width="7" height="2.4" rx="1.2" fill="white" opacity="0.95" />
        <rect x="4.5" y="6.8" width="9" height="2.4" rx="1.2" fill="white" opacity="0.75" />
        <rect x="2.5" y="10.6" width="6" height="2.4" rx="1.2" fill="white" opacity="0.9" />
      </svg>
    </span>
  )
}

export function AppHeader({ today }: { today: string }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark />
        <div className="flex min-w-0 flex-col leading-none">
          <h1
            className="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--fg-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Capacity
          </h1>
          <span className="mt-0.5 font-mono text-micro uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            dispatch board
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 font-mono text-tiny text-[var(--fg-secondary)] sm:flex">
          <CalendarClock size={14} className="text-[var(--fg-brand)]" aria-hidden />
          <span>{today}</span>
        </div>
        <ModeToggle />
      </div>
    </header>
  )
}
