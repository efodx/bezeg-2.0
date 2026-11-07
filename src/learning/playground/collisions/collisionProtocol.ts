import type {BroadPhaseMethod, StepCounters} from '../../../compgeo/collisions/world'

export type {BroadPhaseMethod, StepCounters}

/**
 * Provisional maximum object counts per method. CP3 measures the real limits (spec: Containment, Bounded cost) and
 * replaces these values.
 */
export const MAX_COUNT: Readonly<Record<BroadPhaseMethod, number>> = {naive: 2000, sweep: 5000}

export const MIN_COUNT = 1

/** Overlay selector for the inspect mode. A protocol placeholder: the worker stores and echoes it. */
export type CollisionOverlay = 'none' | 'boxes' | 'sweep'

export type CollisionCommand =
  | {type: 'init'; seed: number; count: number; method: BroadPhaseMethod; playing: boolean; overlay?: CollisionOverlay}
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
  seed: number
  /** Interleaved x, y per body, length 2 * count. */
  positions: Float32Array
  /** Radii per body, length count. They scale with the count, so they are sent with every snapshot. */
  radii: Float32Array
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
  return [s.positions.buffer, s.radii.buffer, s.touching.buffer].filter(
    (b): b is ArrayBuffer => b instanceof ArrayBuffer,
  )
}

export function clampCount(count: number, method: BroadPhaseMethod): number {
  const whole = Number.isFinite(count) ? Math.round(count) : MIN_COUNT
  return Math.min(MAX_COUNT[method], Math.max(MIN_COUNT, whole))
}
