import {
  createSweepState,
  naiveCandidates,
  sweepAndPruneCandidates,
  type BroadPhaseMethod,
  type SweepState,
} from './broadPhase'
import { circlesTouch, shapesTouch } from './narrowPhase'
import { POLYGON_MEAN_AREA, POLYGON_TEMPLATES } from './polygonTemplates'
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

/**
 * The one scale of a polygon world, in world units per template unit: the same for every body, so that
 * count * s^2 * (mean template area) = AREA_FRACTION * width * height, the circles' area share.
 */
export function polygonScale(count: number, width = WORLD_WIDTH, height = WORLD_HEIGHT): number {
  return Math.sqrt((AREA_FRACTION * width * height) / (POLYGON_MEAN_AREA * Math.max(count, 1)))
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
  /** Circle radius; for a polygon world an alias of `hx` (not a radius). */
  readonly r: Float64Array
  readonly shape: WorldShape
  /** Box half-extents in world units. For circles both alias `r` (one array, no copy). */
  readonly hx: Float64Array
  readonly hy: Float64Array
  /** Polygon worlds: template index per body (into POLYGON_TEMPLATES) and the common scale; empty and 0 for circles. */
  readonly template: Uint8Array
  readonly scale: number
}

export type WorldShape = 'circle' | 'polygon'

export interface WorldOptions {
  seed: number
  count: number
  width?: number
  height?: number
  shape?: WorldShape
}

/**
 * hullTests, hullPasses and pieceTests are 0 for circles. For polygons narrowTests = candidates = hullTests; the
 * readouts derive the removed pairs: box stage C(n,2) - candidates, hull stage candidates - hullPasses, piece stage
 * hullPasses - touchingPairs.
 */
export interface StepCounters {
  boxTests: number
  candidates: number
  narrowTests: number
  touchingPairs: number
  hullTests: number
  hullPasses: number
  pieceTests: number
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

export function createWorld({ seed, count, width = WORLD_WIDTH, height = WORLD_HEIGHT, shape = 'circle' }: WorldOptions): World {
  if (shape === 'polygon') return createPolygonWorld(seed, count, width, height)
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
  return { seed, count, width, height, x, y, vx, vy, r, shape: 'circle', hx: r, hy: r, template: new Uint8Array(0), scale: 0 }
}

function createPolygonWorld(seed: number, count: number, width: number, height: number): World {
  const rand = mulberry32(seed)
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const hx = new Float64Array(count)
  const hy = new Float64Array(count)
  const template = new Uint8Array(count)
  const scale = polygonScale(count, width, height)
  for (let i = 0; i < count; i++) {
    const t = Math.min(POLYGON_TEMPLATES.length - 1, Math.floor(POLYGON_TEMPLATES.length * rand()))
    template[i] = t
    hx[i] = scale * POLYGON_TEMPLATES[t].hx
    hy[i] = scale * POLYGON_TEMPLATES[t].hy
    x[i] = hx[i] + (width - 2 * hx[i]) * rand()
    y[i] = hy[i] + (height - 2 * hy[i]) * rand()
    const angle = 2 * Math.PI * rand()
    const speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * rand()
    vx[i] = speed * Math.cos(angle)
    vy[i] = speed * Math.sin(angle)
  }
  return { seed, count, width, height, x, y, vx, vy, r: hx, shape: 'polygon', hx, hy, template, scale }
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
  const { count: n, x, y, vx, vy, hx, hy } = world
  for (let i = 0; i < n; i++) {
    x[i] += vx[i] * TIME_STEP
    y[i] += vy[i] * TIME_STEP
    reflect(x, vx, i, hx[i], world.width - hx[i])
    reflect(y, vy, i, hy[i], world.height - hy[i])
  }
  return measureWorld(world, method, scratch)
}

/**
 * Broad and narrow phase on the current positions without advancing time or moving bodies; stepWorld ends with it, so
 * the two share one code path. Measuring does update the sweep state's order (a permutation that only warm-starts the
 * next sort), so results never depend on it. The result aliases scratch buffers.
 */
export function measureWorld(world: World, method: BroadPhaseMethod, scratch: StepScratch): StepResult {
  const { x, y, r, template, scale } = world
  const polygons = world.shape === 'polygon'
  scratch.touching.fill(0)
  const counters: StepCounters = {
    boxTests: 0, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0,
  }
  const emit = (i: number, j: number): void => {
    counters.candidates++
    counters.narrowTests++
    if (polygons) {
      if (!shapesTouch(POLYGON_TEMPLATES[template[i]], x[i], y[i], POLYGON_TEMPLATES[template[j]], x[j], y[j], scale, counters)) return
    } else if (!circlesTouch(x[i], y[i], r[i], x[j], y[j], r[j])) return
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
