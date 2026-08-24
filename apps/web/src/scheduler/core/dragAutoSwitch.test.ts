import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createDragAutoSwitch, DRAG_AUTO_SWITCH_THRESHOLD_MS } from "./dragAutoSwitch"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("createDragAutoSwitch", () => {
  it("does not switch on a short hover", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS - 1)

    expect(onSwitch).not.toHaveBeenCalled()
  })

  it("switches once the hover reaches the threshold", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS)

    expect(onSwitch).toHaveBeenCalledExactlyOnceWith("2026-01-02")
  })

  it("cancels the pending switch when the pointer moves off the tab before the threshold", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS / 2)
    autoSwitch.hover(null)
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS)

    expect(onSwitch).not.toHaveBeenCalled()
  })

  it("restarts the timer when the hovered tab changes before the threshold", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS / 2)
    autoSwitch.hover("2026-01-03")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS / 2)

    // Total elapsed time since hovering "2026-01-02" exceeds the
    // threshold, but "2026-01-03" has only been hovered for half of it.
    expect(onSwitch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS / 2)
    expect(onSwitch).toHaveBeenCalledExactlyOnceWith("2026-01-03")
  })

  it("does not restart the timer when hover is called repeatedly with the same tab", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS - 1)
    // Simulates a stream of pointermove events over the same tab.
    autoSwitch.hover("2026-01-02")
    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(1)

    expect(onSwitch).toHaveBeenCalledExactlyOnceWith("2026-01-02")
  })

  it("cancel() stops a pending switch", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    autoSwitch.cancel()
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS)

    expect(onSwitch).not.toHaveBeenCalled()
  })

  it("can switch again after an earlier switch already fired", () => {
    const onSwitch = vi.fn()
    const autoSwitch = createDragAutoSwitch(onSwitch)

    autoSwitch.hover("2026-01-02")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS)
    autoSwitch.hover(null)
    autoSwitch.hover("2026-01-03")
    vi.advanceTimersByTime(DRAG_AUTO_SWITCH_THRESHOLD_MS)

    expect(onSwitch).toHaveBeenCalledTimes(2)
    expect(onSwitch).toHaveBeenNthCalledWith(1, "2026-01-02")
    expect(onSwitch).toHaveBeenNthCalledWith(2, "2026-01-03")
  })
})
