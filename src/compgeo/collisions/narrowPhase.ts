import type { ConvexPart, PolygonShape } from './polygonTemplates'

/** Circles touch when the squared centre distance is at most the squared radius sum (closed). */
export function circlesTouch(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2
  const dy = y1 - y2
  const s = r1 + r2
  return dx * dx + dy * dy <= s * s
}

/**
 * Separating-axis test of two convex parts, each its template scaled by `s` and translated by (ax, ay) / (bx, by).
 * Axes: both parts' integer edge normals m. A part's projection interval on m is [s*lo + m.t, s*hi + m.t] with lo,
 * hi the exact integer extremes of m.p over its template vertices p and t the position. The parts are separated when
 * some axis gives a strictly positive gap; touching (gap 0) counts as touching, as for circles.
 *
 * Why the hull stage is a sound filter: the hull contains every template vertex, so for
 * any integer m the hull's integer extremes bound every piece's. The computed bound s*q + m.t is monotone in the
 * integer q (rounding is monotone), so on the same axis the piece intervals lie inside the hull intervals; a
 * strictly positive hull gap on m is then a strictly positive gap of every piece pair on m. The piece test does not
 * evaluate hull axes, so the pipeline defines touching; it differs from a direct all-piece test only for gaps at
 * rounding scale. The same monotonicity makes the box [x-s*hx, x+s*hx] contain every scaled vertex.
 */
export function convexPartsTouch(
  a: ConvexPart, ax: number, ay: number, b: ConvexPart, bx: number, by: number, s: number,
): boolean {
  for (let side = 0; side < 2; side++) {
    const p = side === 0 ? a : b
    for (let k = 0; k < p.size; k++) {
      const mx = p.mx[k]
      const my = p.my[k]
      let loA = Infinity
      let hiA = -Infinity
      for (let v = 0; v < a.size; v++) {
        const q = mx * a.px[v] + my * a.py[v]
        if (q < loA) loA = q
        if (q > hiA) hiA = q
      }
      let loB = Infinity
      let hiB = -Infinity
      for (let v = 0; v < b.size; v++) {
        const q = mx * b.px[v] + my * b.py[v]
        if (q < loB) loB = q
        if (q > hiB) hiB = q
      }
      const ta = mx * ax + my * ay
      const tb = mx * bx + my * by
      if (s * hiA + ta < s * loB + tb || s * hiB + tb < s * loA + ta) return false
    }
  }
  return true
}

/** Optional tallies of the polygon narrow phase; the counters of a step are such an object. */
export interface PolygonTallies {
  hullTests: number
  hullPasses: number
  pieceTests: number
}

/**
 * Hull SAT, then piece-pair SAT, stopping at the first touching piece pair. The bodies touch exactly when some
 * piece pair touches (the pieces tile each template).
 */
export function shapesTouch(
  a: PolygonShape, ax: number, ay: number, b: PolygonShape, bx: number, by: number, s: number,
  tallies?: PolygonTallies,
): boolean {
  if (tallies) tallies.hullTests++
  if (!convexPartsTouch(a.hull, ax, ay, b.hull, bx, by, s)) return false
  if (tallies) tallies.hullPasses++
  for (let i = 0; i < a.pieces.length; i++) {
    for (let j = 0; j < b.pieces.length; j++) {
      if (tallies) tallies.pieceTests++
      if (convexPartsTouch(a.pieces[i], ax, ay, b.pieces[j], bx, by, s)) return true
    }
  }
  return false
}
