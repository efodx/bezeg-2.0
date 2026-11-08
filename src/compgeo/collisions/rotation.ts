import type { ConvexPart, PolygonShape } from './polygonTemplates'
import type { PolygonTallies } from './narrowPhase'

/**
 * Rotated polygon geometry for the bounce prototype (owner prototype, 2026-11-08).
 *
 * Model: a body at angle theta has world vertices  pos + s * (R(theta) p - bb(theta))  for template vertices p, where
 * R rotates counter-clockwise and bb(theta) is the centre of the bounding box of the rotated hull. So `pos` stays the
 * centre of the body's axis-aligned box (what the broad phase reads) and at theta = 0 the formula is the unrotated
 * template, bit for bit. The physical rotation centre is the area centroid: G = pos + s * (R c - bb), with c the
 * template centroid; a body spins about G, and `pos` follows it (see `advanceSpinning` in world.ts).
 */

export interface Placement {
  x: number
  y: number
  s: number
  cos: number
  sin: number
  /** Box centre of the rotated hull, in template units. */
  bbx: number
  bby: number
  /** Box half-extents of the rotated hull, in template units. */
  hx: number
  hy: number
}

export function makePlacement(): Placement {
  return { x: 0, y: 0, s: 1, cos: 1, sin: 0, bbx: 0, bby: 0, hx: 0, hy: 0 }
}

/** Fills `out` for a body at box centre (x, y), angle and scale; the box is the exact box of the rotated hull. */
export function place(out: Placement, shape: PolygonShape, x: number, y: number, angle: number, s: number): Placement {
  const c = angle === 0 ? 1 : Math.cos(angle)
  const sn = angle === 0 ? 0 : Math.sin(angle)
  const h = shape.hull
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let v = 0; v < h.size; v++) {
    const rx = c * h.px[v] - sn * h.py[v]
    const ry = sn * h.px[v] + c * h.py[v]
    if (rx < minX) minX = rx
    if (rx > maxX) maxX = rx
    if (ry < minY) minY = ry
    if (ry > maxY) maxY = ry
  }
  out.x = x
  out.y = y
  out.s = s
  out.cos = c
  out.sin = sn
  out.bbx = (minX + maxX) / 2
  out.bby = (minY + maxY) / 2
  out.hx = (maxX - minX) / 2
  out.hy = (maxY - minY) / 2
  return out
}

/** World position of the area centroid of a placed body. */
export function centroidOf(p: Placement, shape: PolygonShape, out: { x: number; y: number }): void {
  const cx = shape.centroidX
  const cy = shape.centroidY
  out.x = p.x + p.s * (p.cos * cx - p.sin * cy - p.bbx)
  out.y = p.y + p.s * (p.sin * cx + p.cos * cy - p.bby)
}

const MAX_VERTICES = 32
const ax = new Float64Array(MAX_VERTICES)
const ay = new Float64Array(MAX_VERTICES)
const bxs = new Float64Array(MAX_VERTICES)
const bys = new Float64Array(MAX_VERTICES)
const pa = makePlacement()
const pb = makePlacement()

function placeVertices(part: ConvexPart, p: Placement, xs: Float64Array, ys: Float64Array): void {
  for (let v = 0; v < part.size; v++) {
    xs[v] = p.x + p.s * (p.cos * part.px[v] - p.sin * part.py[v] - p.bbx)
    ys[v] = p.y + p.s * (p.sin * part.px[v] + p.cos * part.py[v] - p.bby)
  }
}

/** The contact of two convex parts: unit normal from A to B, penetration depth and the contact point. */
export interface Contact {
  nx: number
  ny: number
  depth: number
  px: number
  py: number
}

/** Work state of one SAT run that wants a contact (reused, allocation free). */
const best: Contact = { nx: 0, ny: 0, depth: 0, px: 0, py: 0 }

/**
 * Separating-axis test of two placed convex parts over the outward normals of both. The parts are separated when
 * some axis has a strictly positive gap (closed touching, as the integer test). With `contact` given, also finds the
 * axis of minimum penetration (outward face normal of one part: depth = its support minus the other's lowest
 * projection) and the deepest vertex of the other part, averaging vertices within `tol` of the deepest.
 */
function satParts(na: number, nb: number, tol: number, contact: Contact | null): boolean {
  let bestDepth = Infinity
  let bestSide = 0
  let bnx = 0
  let bny = 0
  for (let side = 0; side < 2; side++) {
    const pxs = side === 0 ? ax : bxs
    const pys = side === 0 ? ay : bys
    const n = side === 0 ? na : nb
    const oxs = side === 0 ? bxs : ax
    const oys = side === 0 ? bys : ay
    const on = side === 0 ? nb : na
    for (let k = 0; k < n; k++) {
      const k1 = k + 1 === n ? 0 : k + 1
      const ex = pxs[k1] - pxs[k]
      const ey = pys[k1] - pys[k]
      const len = Math.hypot(ex, ey)
      if (len === 0) continue
      const mx = ey / len
      const my = -ex / len
      const support = mx * pxs[k] + my * pys[k]
      let low = Infinity
      for (let v = 0; v < on; v++) {
        const q = mx * oxs[v] + my * oys[v]
        if (q < low) low = q
      }
      const depth = support - low
      if (depth < 0) return false
      if (depth < bestDepth) {
        bestDepth = depth
        bestSide = side
        bnx = mx
        bny = my
      }
    }
  }
  if (contact && bestDepth < contact.depth) {
    const oxs = bestSide === 0 ? bxs : ax
    const oys = bestSide === 0 ? bys : ay
    const on = bestSide === 0 ? nb : na
    let low = Infinity
    for (let v = 0; v < on; v++) low = Math.min(low, bnx * oxs[v] + bny * oys[v])
    let sx = 0
    let sy = 0
    let c = 0
    for (let v = 0; v < on; v++) {
      if (bnx * oxs[v] + bny * oys[v] <= low + tol) {
        sx += oxs[v]
        sy += oys[v]
        c++
      }
    }
    contact.depth = bestDepth
    // Normal from A to B: A's outward normal as is, B's outward normal reversed.
    contact.nx = bestSide === 0 ? bnx : -bnx
    contact.ny = bestSide === 0 ? bny : -bny
    contact.px = sx / c
    contact.py = sy / c
  }
  return true
}

/**
 * Hull SAT, then piece-pair SAT, on the rotated geometry; same pipeline and counter updates as `shapesTouch`.
 * Angles are in radians, positions are box centres.
 */
export function shapesTouchRotated(
  a: PolygonShape, x1: number, y1: number, angleA: number,
  b: PolygonShape, x2: number, y2: number, angleB: number,
  s: number, tallies?: PolygonTallies,
): boolean {
  place(pa, a, x1, y1, angleA, s)
  place(pb, b, x2, y2, angleB, s)
  if (tallies) tallies.hullTests++
  placeVertices(a.hull, pa, ax, ay)
  placeVertices(b.hull, pb, bxs, bys)
  if (!satParts(a.hull.size, b.hull.size, 0, null)) return false
  if (tallies) tallies.hullPasses++
  for (let i = 0; i < a.pieces.length; i++) {
    placeVertices(a.pieces[i], pa, ax, ay)
    for (let j = 0; j < b.pieces.length; j++) {
      if (tallies) tallies.pieceTests++
      placeVertices(b.pieces[j], pb, bxs, bys)
      if (satParts(a.pieces[i].size, b.pieces[j].size, 0, null)) return true
    }
  }
  return false
}

/**
 * The contact of two touching polygons for the bounce response: over every touching piece pair, the SAT axis of
 * minimum penetration. Returns false when no piece pair touches (rounding). `out` receives the normal from A to B.
 */
export function polygonContact(
  a: PolygonShape, x1: number, y1: number, angleA: number,
  b: PolygonShape, x2: number, y2: number, angleB: number,
  s: number, out: Contact,
): boolean {
  place(pa, a, x1, y1, angleA, s)
  place(pb, b, x2, y2, angleB, s)
  best.depth = Infinity
  const tol = 1e-6 * s
  for (let i = 0; i < a.pieces.length; i++) {
    placeVertices(a.pieces[i], pa, ax, ay)
    for (let j = 0; j < b.pieces.length; j++) {
      placeVertices(b.pieces[j], pb, bxs, bys)
      satParts(a.pieces[i].size, b.pieces[j].size, tol, best)
    }
  }
  if (!Number.isFinite(best.depth)) return false
  out.nx = best.nx
  out.ny = best.ny
  out.depth = best.depth
  out.px = best.px
  out.py = best.py
  return true
}
