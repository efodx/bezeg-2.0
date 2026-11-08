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
import { centroidOf, makePlacement, place, shapesTouchRotated } from './rotation'

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
export function baseRadius(count: number, width = WORLD_WIDTH, height = WORLD_HEIGHT, areaFraction = AREA_FRACTION): number {
  return Math.sqrt((areaFraction * width * height) / (Math.PI * Math.max(count, 1)))
}

/**
 * The one scale of a polygon world, in world units per template unit: the same for every body, so that
 * count * s^2 * (mean template area) = AREA_FRACTION * width * height, the circles' area share.
 */
export function polygonScale(count: number, width = WORLD_WIDTH, height = WORLD_HEIGHT, areaFraction = AREA_FRACTION): number {
  return Math.sqrt((areaFraction * width * height) / (POLYGON_MEAN_AREA * Math.max(count, 1)))
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
  /**
   * Bounce prototype: orientation (radians, counter-clockwise) and angular velocity per body. All zero unless the
   * bounce response ran, and then every unrotated path is the old one. Polygons turn about their area centroid with
   * `x`, `y` kept at the centre of the rotated box (see rotation.ts); `vx`, `vy` are the centroid's velocity.
   */
  readonly angle: Float64Array
  readonly omega: Float64Array
}

export type WorldShape = 'circle' | 'polygon'

export interface WorldOptions {
  seed: number
  count: number
  width?: number
  height?: number
  shape?: WorldShape
  /** Share of the world area covered by bodies; default AREA_FRACTION. */
  areaFraction?: number
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

export function createWorld({ seed, count, width = WORLD_WIDTH, height = WORLD_HEIGHT, shape = 'circle', areaFraction = AREA_FRACTION }: WorldOptions): World {
  if (shape === 'polygon') return createPolygonWorld(seed, count, width, height, areaFraction)
  const rand = mulberry32(seed)
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const r = new Float64Array(count)
  const base = baseRadius(count, width, height, areaFraction)
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
  return { seed, count, width, height, x, y, vx, vy, r, shape: 'circle', hx: r, hy: r, template: new Uint8Array(0), scale: 0, angle: new Float64Array(count), omega: new Float64Array(count) }
}

function createPolygonWorld(seed: number, count: number, width: number, height: number, areaFraction: number): World {
  const rand = mulberry32(seed)
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const hx = new Float64Array(count)
  const hy = new Float64Array(count)
  const template = new Uint8Array(count)
  const scale = polygonScale(count, width, height, areaFraction)
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
  return { seed, count, width, height, x, y, vx, vy, r: hx, shape: 'polygon', hx, hy, template, scale, angle: new Float64Array(count), omega: new Float64Array(count) }
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

/** Like `reflect` but only ever turns the velocity inward: a growing rotated box can poke out while moving away. */
function reflectInward(p: Float64Array, v: Float64Array, i: number, lo: number, hi: number): void {
  if (p[i] < lo) {
    p[i] = 2 * lo - p[i]
    v[i] = Math.abs(v[i])
  } else if (p[i] > hi) {
    p[i] = 2 * hi - p[i]
    v[i] = -Math.abs(v[i])
  }
}

const spinPlacement = makePlacement()
const spinCentroid = { x: 0, y: 0 }
const spinOffset = { x: 0, y: 0 }

/** Turns a spinning polygon about its centroid for one step and moves it; refreshes its box half-extents. */
function advanceSpinning(world: World, i: number): void {
  const shape = POLYGON_TEMPLATES[world.template[i]]
  const s = world.scale
  place(spinPlacement, shape, world.x[i], world.y[i], world.angle[i], s)
  centroidOf(spinPlacement, shape, spinCentroid)
  let angle = world.angle[i] + world.omega[i] * TIME_STEP
  angle -= 2 * Math.PI * Math.round(angle / (2 * Math.PI))
  world.angle[i] = angle
  place(spinPlacement, shape, 0, 0, angle, s)
  // Box centre = centroid (moved by the velocity) minus the centroid's offset from the box centre.
  centroidOf(spinPlacement, shape, spinOffset) // placed at the origin: the centroid's offset from the box centre
  world.x[i] = spinCentroid.x + world.vx[i] * TIME_STEP - spinOffset.x
  world.y[i] = spinCentroid.y + world.vy[i] * TIME_STEP - spinOffset.y
  world.hx[i] = s * spinPlacement.hx
  world.hy[i] = s * spinPlacement.hy
}

/** Removes all rotation (bounce switched off): bodies return to their template orientation about their box centre. */
export function clearRotation(world: World): void {
  world.angle.fill(0)
  world.omega.fill(0)
  if (world.shape !== 'polygon') return
  for (let i = 0; i < world.count; i++) {
    const t = POLYGON_TEMPLATES[world.template[i]]
    world.hx[i] = world.scale * t.hx
    world.hy[i] = world.scale * t.hy
  }
}

/**
 * Advance one step and report touching bodies and counters. The result aliases scratch buffers. With `spin` (bounce
 * prototype) bodies turn by their angular velocity; without it the step is the unrotated one.
 */
export function stepWorld(world: World, method: BroadPhaseMethod, scratch: StepScratch, spin = false): StepResult {
  const { count: n, x, y, vx, vy, hx, hy, omega, angle } = world
  for (let i = 0; i < n; i++) {
    if (spin && omega[i] !== 0) {
      if (world.shape === 'polygon') {
        advanceSpinning(world, i)
      } else {
        angle[i] += omega[i] * TIME_STEP
        x[i] += vx[i] * TIME_STEP
        y[i] += vy[i] * TIME_STEP
      }
    } else {
      x[i] += vx[i] * TIME_STEP
      y[i] += vy[i] * TIME_STEP
    }
    if (angle[i] !== 0 && world.shape === 'polygon') {
      reflectInward(x, vx, i, hx[i], world.width - hx[i])
      reflectInward(y, vy, i, hy[i], world.height - hy[i])
    } else {
      reflect(x, vx, i, hx[i], world.width - hx[i])
      reflect(y, vy, i, hy[i], world.height - hy[i])
    }
  }
  return measureWorld(world, method, scratch)
}

/**
 * Broad and narrow phase on the current positions without advancing time or moving bodies; stepWorld ends with it, so
 * the two share one code path. Measuring does update the sweep state's order (a permutation that only warm-starts the
 * next sort), so results never depend on it. The result aliases scratch buffers.
 */
export function measureWorld(world: World, method: BroadPhaseMethod, scratch: StepScratch): StepResult {
  const { x, y, r, template, scale, angle } = world
  const polygons = world.shape === 'polygon'
  scratch.touching.fill(0)
  const counters: StepCounters = {
    boxTests: 0, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0,
  }
  const emit = (i: number, j: number): void => {
    counters.candidates++
    counters.narrowTests++
    if (polygons) {
      const touch = angle[i] === 0 && angle[j] === 0
        ? shapesTouch(POLYGON_TEMPLATES[template[i]], x[i], y[i], POLYGON_TEMPLATES[template[j]], x[j], y[j], scale, counters)
        : shapesTouchRotated(
            POLYGON_TEMPLATES[template[i]], x[i], y[i], angle[i], POLYGON_TEMPLATES[template[j]], x[j], y[j], angle[j], scale, counters,
          )
      if (!touch) return
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
