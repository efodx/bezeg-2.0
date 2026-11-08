import type {BroadPhaseMethod, StepCounters, WorldShape} from '../../../compgeo/collisions/world'

export type {BroadPhaseMethod, StepCounters, WorldShape}

/**
 * Polygon limits from the CP9 step bench (spec: Bounded cost), by the CP3 rule: throttled naive steps were 91 ms at
 * n = 3000 and 275 ms at 5000; a quadratic fit reaches 250 ms near 4 960, rounded down to 4 500 (4 500 itself was not
 * run). Sweep stayed at 3.7 ms at 5000, so the 5 000 cap applies. CP10 lowered them to 3 000 and 3 500 for drawing,
 * not stepping: with sprite drawing the throttled draw still cost about 8.5 ms per 1 000 bodies, so 4 500 bodies drew
 * in 31-39 ms (target 33.3) and naive at 4 000 left frames over 50 ms (spec: Drawing).
 */
const POLYGON_NAIVE = 3000
const POLYGON_SWEEP = 3500

/**
 * Maximum object counts per shape and method (spec: Containment, Bounded cost): a naive step stays near 250 ms and a
 * sweep step under 8 ms on the 4x throttled reference profile. Circles were measured in CP3, polygons in CP9.
 */
export const MAX_COUNT: Readonly<Record<WorldShape, Readonly<Record<BroadPhaseMethod, number>>>> = {
  circle: {naive: 4000, sweep: 5000},
  polygon: {naive: POLYGON_NAIVE, sweep: POLYGON_SWEEP},
}

export const MIN_COUNT = 1

/** Overlay selector (inspect mode; polygon mode: boxes, hulls, pieces). The worker stores and echoes it; the main thread draws it. */
export type CollisionOverlay = 'none' | 'boxes' | 'sweep' | 'hulls' | 'pieces'

export type CollisionCommand =
  | {
      type: 'init'
      seed: number
      count: number
      method: BroadPhaseMethod
      playing: boolean
      overlay?: CollisionOverlay
      /** Default 'circle'. */
      shape?: WorldShape
    }
  | {type: 'setCount'; count: number}
  | {type: 'setMethod'; method: BroadPhaseMethod}
  | {type: 'play'}
  | {type: 'pause'}
  | {type: 'stepOnce'}
  /** A new world; a new seed when given, the same one otherwise. */
  | {type: 'reset'; seed?: number}
  | {type: 'setOverlay'; overlay: CollisionOverlay}

export interface CollisionSnapshot {
  type: 'snapshot'
  /** Number of steps taken since the world was created; 0 for a fresh world. */
  stepIndex: number
  count: number
  method: BroadPhaseMethod
  shape: WorldShape
  seed: number
  /** Interleaved x, y per body, length 2 * count. */
  positions: Float32Array
  /** Radii per body, length count. They scale with the count, so they are sent with every snapshot. */
  radii: Float32Array
  /** Polygon world: template index per body (into POLYGON_TEMPLATES) and the common scale; empty and 0 for circles. */
  templates: Uint8Array
  scale: number
  /** 1 when the body touches another one. */
  touching: Uint8Array
  counters: StepCounters
  /** Wall time of the step computation (ms). */
  stepMs: number
  /** Simulated time per wall time as a percentage, at most 100. */
  simSpeed: number
  overlay: CollisionOverlay
  /** The count the reader asked for when it was clamped to the method limit, otherwise null. */
  clampedFrom: number | null
}

export type CollisionEvent = CollisionSnapshot | {type: 'error'; message: string}

/** Arrays of a snapshot to hand to postMessage as transferables. */
export function snapshotTransferables(s: CollisionSnapshot): ArrayBuffer[] {
  return [s.positions.buffer, s.radii.buffer, s.touching.buffer, s.templates.buffer].filter(
    (b): b is ArrayBuffer => b instanceof ArrayBuffer,
  )
}

export function clampCount(count: number, method: BroadPhaseMethod, shape: WorldShape = 'circle'): number {
  const whole = Number.isFinite(count) ? Math.round(count) : MIN_COUNT
  return Math.min(MAX_COUNT[shape][method], Math.max(MIN_COUNT, whole))
}
