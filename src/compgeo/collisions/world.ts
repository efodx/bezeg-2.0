import {
  createSweepState,
  naiveCandidates,
  sweepAndPruneCandidates,
  type BroadPhaseMethod,
  type SweepState,
} from './broadPhase'
import { circlesTouch } from './narrowPhase'
import { mulberry32 } from './random'

export type { BroadPhaseMethod } from './broadPhase'

export const WORLD_WIDTH = 1600
export const WORLD_HEIGHT = 1000
export const TIME_STEP = 1 / 60
/**
 * Share of the world's area covered by bodies, at every n. The base radius scales with 1/sqrt(n),
 * so the picture keeps the same density as n grows and about 5 % of bodies touch at any n
 * (measured in world.test.ts). Fixed radii would have to be sub-pixel to stay sparse at n = 1000.
 */
export const AREA_FRACTION = 0.0125
/** Radii are drawn uniformly from [RADIUS_SPREAD_MIN, RADIUS_SPREAD_MAX] times the base radius. */
export const RADIUS_SPREAD_MIN = 0.75
export const RADIUS_SPREAD_MAX = 1.25

/** Base radius for n bodies in a width x height world (mean body area = AREA_FRACTION * area / n). */
export function baseRadius(count: number, width = WORLD_WIDTH, height = WORLD_HEIGHT): number {
  return Math.sqrt((AREA_FRACTION * width * height) / (Math.PI * Math.max(count, 1)))
}
/** Speed range (world units per second). */
export const SPEED_MIN = 30
export const SPEED_MAX = 120

export interface World {
  readonly seed: number
  readonly count: number
  readonly width: number
  readonly height: number
  readonly x: Float64Array
  readonly y: Float64Array
  readonly vx: Float64Array
  readonly vy: Float64Array
  readonly r: Float64Array
}

export interface WorldOptions {
  seed: number
  count: number
  width?: number
  height?: number
}

export interface StepCounters {
  boxTests: number
  candidates: number
  narrowTests: number
  touchingPairs: number
}

export interface StepScratch {
  readonly count: number
  readonly sweep: SweepState
  /** touching[i] = 1 when body i touches any other body after the last step. */
  readonly touching: Uint8Array
  /** Touching pairs (i<j) as consecutive entries; valid up to 2 * counters.touchingPairs. Grows when needed. */
  pairs: Int32Array
}

export interface StepResult {
  touching: Uint8Array
  pairs: Int32Array
  counters: StepCounters
}

export function createWorld({ seed, count, width = WORLD_WIDTH, height = WORLD_HEIGHT }: WorldOptions): World {
  const rand = mulberry32(seed)
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const r = new Float64Array(count)
  const base = baseRadius(count, width, height)
  for (let i = 0; i < count; i++) {
    const ri = base * (RADIUS_SPREAD_MIN + (RADIUS_SPREAD_MAX - RADIUS_SPREAD_MIN) * rand())
    r[i] = ri
    x[i] = ri + (width - 2 * ri) * rand()
    y[i] = ri + (height - 2 * ri) * rand()
    const angle = 2 * Math.PI * rand()
    const speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * rand()
    vx[i] = speed * Math.cos(angle)
    vy[i] = speed * Math.sin(angle)
  }
  return { seed, count, width, height, x, y, vx, vy, r }
}

export function createScratch(count: number): StepScratch {
  return { count, sweep: createSweepState(count), touching: new Uint8Array(count), pairs: new Int32Array(64) }
}

function reflect(p: Float64Array, v: Float64Array, i: number, lo: number, hi: number): void {
  if (p[i] < lo) {
    p[i] = 2 * lo - p[i]
    v[i] = -v[i]
  } else if (p[i] > hi) {
    p[i] = 2 * hi - p[i]
    v[i] = -v[i]
  }
}

/** Advance one step and report touching bodies and counters. The result aliases scratch buffers. */
export function stepWorld(world: World, method: BroadPhaseMethod, scratch: StepScratch): StepResult {
  const { count: n, x, y, vx, vy, r } = world
  for (let i = 0; i < n; i++) {
    x[i] += vx[i] * TIME_STEP
    y[i] += vy[i] * TIME_STEP
    reflect(x, vx, i, r[i], world.width - r[i])
    reflect(y, vy, i, r[i], world.height - r[i])
  }
  return measureWorld(world, method, scratch)
}

/**
 * Broad and narrow phase on the current positions without advancing time or moving bodies; stepWorld ends with it, so
 * the two share one code path. Measuring does update the sweep state's order (a permutation that only warm-starts the
 * next sort), so results never depend on it. The result aliases scratch buffers.
 */
export function measureWorld(world: World, method: BroadPhaseMethod, scratch: StepScratch): StepResult {
  const { x, y, r } = world
  scratch.touching.fill(0)
  const counters: StepCounters = { boxTests: 0, candidates: 0, narrowTests: 0, touchingPairs: 0 }
  const emit = (i: number, j: number): void => {
    counters.candidates++
    counters.narrowTests++
    if (!circlesTouch(x[i], y[i], r[i], x[j], y[j], r[j])) return
    const k = 2 * counters.touchingPairs++
    if (k + 2 > scratch.pairs.length) {
      const grown = new Int32Array(scratch.pairs.length * 2)
      grown.set(scratch.pairs)
      scratch.pairs = grown
    }
    scratch.pairs[k] = i
    scratch.pairs[k + 1] = j
    scratch.touching[i] = 1
    scratch.touching[j] = 1
  }
  counters.boxTests =
    method === 'naive' ? naiveCandidates(world, emit) : sweepAndPruneCandidates(world, scratch.sweep, emit)
  return { touching: scratch.touching, pairs: scratch.pairs, counters }
}
