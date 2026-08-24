/**
 * How long the pointer (or keyboard focus, during a keyboard drag) has to
 * rest over an inactive day tab before it becomes the active one. Long
 * enough that brushing past a tab on the way to a crew column doesn't
 * trigger a switch; short enough that a deliberate hover doesn't feel
 * like waiting.
 */
export const DRAG_AUTO_SWITCH_THRESHOLD_MS = 600

export type DragAutoSwitch = {
  /**
   * Call on every drag-move event, with the tab currently under the
   * pointer (or `null` if the pointer isn't over any tab). Calling this
   * repeatedly with the same tab id is a no-op — the timer only resets
   * when the hovered tab actually changes, so a stream of pointermove
   * events over one tab doesn't restart the clock on every pixel.
   */
  hover: (tabId: string | null) => void
  /** Stops any pending timer without firing it. Call on drag end/cancel. */
  cancel: () => void
}

/**
 * `onSwitch` fires once, `DRAG_AUTO_SWITCH_THRESHOLD_MS` after `hover` is
 * first called with a given tab id — provided nothing else calls `hover`
 * with a different id (or `null`) in the meantime, which cancels it.
 */
export function createDragAutoSwitch(onSwitch: (tabId: string) => void): DragAutoSwitch {
  let hoveredTabId: string | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    hoveredTabId = null
  }

  return {
    hover(tabId) {
      if (tabId === hoveredTabId) return
      clear()

      if (tabId === null) return

      hoveredTabId = tabId
      timeoutId = setTimeout(() => {
        onSwitch(tabId)
        clear()
      }, DRAG_AUTO_SWITCH_THRESHOLD_MS)
    },
    cancel: clear,
  }
}
