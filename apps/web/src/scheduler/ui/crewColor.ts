/**
 * A stable accent per crew, so the board reads as a set of distinct lanes
 * at a glance instead of a wall of uniform grey. The colour is derived from
 * the crew id (not its list position), so a crew keeps its colour even as
 * crews are added, removed, or reordered.
 *
 * The palette values themselves live in globals.css as --crew-N /
 * --crew-N-soft, so light and dark modes can tune them; this module only
 * decides which index a crew maps to.
 */

/** How many distinct accents the palette in globals.css defines. */
export const CREW_COLOR_COUNT = 8

export type CrewAccent = {
  index: number
  /** Solid accent — the left bar, the header dot, the focus tint. */
  solid: string
  /** Translucent wash of the same hue — the block background. */
  soft: string
}

/** A small deterministic string hash (djb2), enough to spread ids across the palette. */
function hashId(id: string): number {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33) ^ id.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function crewAccent(crewId: string): CrewAccent {
  const index = hashId(crewId) % CREW_COLOR_COUNT
  return {
    index,
    solid: `var(--crew-${index})`,
    soft: `var(--crew-${index}-soft)`,
  }
}
