/**
 * Adaptive draw pacing for the collision canvas (CP7, decision 2026-11-07).
 *
 * On a loaded main thread (a throttled phone) the cost of drawing the DPR-scaled canvas every frame starves scrolling and
 * taps. The pacer watches the interval between requestAnimationFrame callbacks and, while that interval is long, lets the
 * canvas draw at most every MIN_LOADED_GAP_MS. The simulation, its step rate and the readout are untouched.
 */

/** Smoothed frame interval above which the thread counts as loaded: 20 ms is above a 60 Hz frame (16.7 ms) with jitter margin. */
export const LOADED_ENTER_MS = 20
/** Smoothed frame interval below which a loaded thread counts as recovered. Below the enter threshold, for hysteresis. */
export const LOADED_EXIT_MS = 17.5
/** Minimum time between draws while loaded (30 Hz). */
export const MIN_LOADED_GAP_MS = 33
/** Stay loaded at least this long, so thinning the draws (which speeds frames up) does not flip the state every few frames. */
export const MIN_LOADED_HOLD_MS = 1500
/** Gaps longer than this (hidden tab, idle loop) are not load measurements. */
const MAX_SAMPLE_MS = 250
const EMA_ALPHA = 0.2

export interface DrawPacer {
  /** Call once per requestAnimationFrame callback with its timestamp; true means draw now. */
  shouldDraw(now: number): boolean
}

export function createDrawPacer(): DrawPacer {
  let lastFrame = -Infinity
  let lastDraw = -Infinity
  let ema = 0
  let loaded = false
  let loadedSince = 0
  return {
    shouldDraw(now) {
      const delta = now - lastFrame
      lastFrame = now
      if (delta > 0 && delta <= MAX_SAMPLE_MS) {
        ema = ema === 0 ? delta : ema + EMA_ALPHA * (delta - ema)
        if (!loaded && ema > LOADED_ENTER_MS) {
          loaded = true
          loadedSince = now
        } else if (loaded && ema < LOADED_EXIT_MS && now - loadedSince >= MIN_LOADED_HOLD_MS) {
          loaded = false
        }
      }
      if (loaded && now - lastDraw < MIN_LOADED_GAP_MS) return false
      lastDraw = now
      return true
    },
  }
}
