"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"

type Mode = "light" | "dark"

/**
 * Dark/light switch. Dark is the default (globals.css :root); light is the
 * override at :root[data-mode="light"]. The chosen mode is written to
 * <html data-mode> and persisted; a tiny inline script in layout.tsx
 * re-applies it before hydration so there's no flash of the wrong theme.
 *
 * <html data-mode> is the single source of truth. We read it through
 * useSyncExternalStore (server snapshot = dark, matching SSR) so there's no
 * hydration mismatch and no setState-in-effect — a MutationObserver on the
 * attribute drives the re-render when the toggle flips it.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] })
  return () => observer.disconnect()
}

function getSnapshot(): Mode {
  return document.documentElement.dataset.mode === "light" ? "light" : "dark"
}

export function ModeToggle() {
  const mode = useSyncExternalStore<Mode>(subscribe, getSnapshot, () => "dark")
  const isLight = mode === "light"

  function toggle() {
    const next: Mode = isLight ? "dark" : "light"
    document.documentElement.dataset.mode = next
    try {
      localStorage.setItem("mode", next)
    } catch {
      // private mode / storage disabled — the toggle still works for the session
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--fg-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {isLight ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />}
    </button>
  )
}
