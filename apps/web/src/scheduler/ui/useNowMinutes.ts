import { useEffect, useState } from "react"
import { nowToMinutes } from "../core/geometry"

/**
 * Minutes-since-midnight for *now*, but only when the given day is today —
 * otherwise `null`, and the caller draws no now-line. Returns `null` on the
 * server and on the first client render too: the clock is read only after
 * mount, so a render that straddles a minute boundary can't mismatch
 * between server and client (the hydration trap the board's date maths
 * exists to avoid).
 */
export function useNowMinutes(dayIso: string, todayIso: string): number | null {
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    // Not today → no now-line; state stays at its initial null, and we set
    // up nothing. (dayIso is fixed per BoardGrid instance.)
    if (dayIso !== todayIso) return

    const tick = () => setMinutes(nowToMinutes(new Date()))
    // First read on the next frame, not synchronously in the effect body,
    // so the clock is touched only after mount (no hydration mismatch) and
    // no setState fires straight from the effect.
    const raf = requestAnimationFrame(tick)
    const id = setInterval(tick, 60_000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(id)
    }
  }, [dayIso, todayIso])

  return minutes
}
