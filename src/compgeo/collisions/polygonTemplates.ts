import type { GridPoint } from '../grid'
import { earClippingTrace } from '../earClipping'
import { monotoneChainTrace } from '../monotoneChain'
import { orient } from '../predicates'

/**
 * A convex part of a template (the hull or one piece): counter-clockwise integer vertices and the integer edge
 * normals (-dy, dx) of its edges. Normal k belongs to the edge from vertex k to vertex k+1. Typed arrays so the
 * narrow phase allocates nothing.
 */
export interface ConvexPart {
  readonly size: number
  readonly px: Float64Array
  readonly py: Float64Array
  readonly mx: Float64Array
  readonly my: Float64Array
}

/** A template with everything the narrow phase needs, computed once with the exact kernels on integer points. */
export interface PolygonShape {
  /** Simple counter-clockwise outline on grid points; the bounding box is centred at the origin. */
  readonly vertices: readonly GridPoint[]
  /** Template half-extents: the box is [-hx, hx] x [-hy, hy]. */
  readonly hx: number
  readonly hy: number
  /** Final hull of monotoneChainTrace (collinear points dropped). */
  readonly hull: ConvexPart
  /** Convex pieces (Hertel-Mehlhorn merge of the ear-clipping triangles). */
  readonly pieces: readonly ConvexPart[]
  /** The pieces as cycles of indices into `vertices`. */
  readonly pieceIndices: readonly (readonly number[])[]
  /** Ear-clipping triangle count (an upper bound on the piece count). */
  readonly triangleCount: number
  /** Twice the template area (integer). */
  readonly doubledArea: number
}

function part(points: readonly GridPoint[]): ConvexPart {
  const size = points.length
  const px = new Float64Array(size)
  const py = new Float64Array(size)
  const mx = new Float64Array(size)
  const my = new Float64Array(size)
  for (let k = 0; k < size; k++) {
    const a = points[k]
    const b = points[(k + 1) % size]
    px[k] = a.x
    py[k] = a.y
    mx[k] = -(b.y - a.y)
    my[k] = b.x - a.x
  }
  return { size, px, py, mx, my }
}

/** True when every vertex of the cycle turns strictly left (exact orient). */
function strictlyConvex(vertices: readonly GridPoint[], cycle: readonly number[]): boolean {
  const n = cycle.length
  for (let k = 0; k < n; k++) {
    if (orient(vertices[cycle[(k + n - 1) % n]], vertices[cycle[k]], vertices[cycle[(k + 1) % n]]) <= 0) return false
  }
  return true
}

/**
 * Hertel-Mehlhorn over the triangles: repeatedly remove a diagonal when the merged piece stays strictly convex at
 * both diagonal endpoints (decided with exact orient; strict, so no piece gets a collinear vertex). Deterministic:
 * pieces are scanned in order, merging the first mergeable neighbour, until nothing merges. Since the merged cycle
 * is checked at every vertex, only the two diagonal endpoints can fail (the others keep their neighbours).
 */
export function mergeTriangles(vertices: readonly GridPoint[], triangles: readonly (readonly number[])[]): number[][] {
  const pieces: number[][] = triangles.map((t) => [...t])
  let merged = true
  while (merged) {
    merged = false
    outer: for (let a = 0; a < pieces.length; a++) {
      const pa = pieces[a]
      for (let ia = 0; ia < pa.length; ia++) {
        const u = pa[ia]
        const v = pa[(ia + 1) % pa.length]
        for (let b = a + 1; b < pieces.length; b++) {
          const pb = pieces[b]
          const ib = pb.findIndex((w, k) => w === v && pb[(k + 1) % pb.length] === u)
          if (ib < 0) continue
          // A from v round to u, then B's vertices strictly between u and v.
          const cycle: number[] = []
          for (let k = 1; k <= pa.length; k++) cycle.push(pa[(ia + k) % pa.length])
          for (let k = 2; k < pb.length; k++) cycle.push(pb[(ib + k) % pb.length])
          if (!strictlyConvex(vertices, cycle)) continue
          pieces[a] = cycle
          pieces.splice(b, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return pieces
}

/** Build a shape from a simple counter-clockwise outline whose bounding box is centred at the origin. */
export function makeShape(vertices: readonly GridPoint[]): PolygonShape {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of vertices) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  if (minX + maxX !== 0 || minY + maxY !== 0) throw new Error('template bounding box must be centred at the origin')
  const chain = monotoneChainTrace(vertices)
  const output = chain.find((e) => e.kind === 'output')
  const hullIndices = output?.payload.hull
  if (!hullIndices || hullIndices.length < 3) throw new Error('template hull is degenerate')
  const ears = earClippingTrace(vertices)
  if (!ears.ok) throw new Error(`template is not clippable: ${ears.reason}`)
  if (ears.reversed) throw new Error('template must be counter-clockwise')
  const pieceIndices = mergeTriangles(vertices, ears.triangles)
  let twice = 0
  for (let k = 0; k < vertices.length; k++) {
    const a = vertices[k]
    const b = vertices[(k + 1) % vertices.length]
    twice += a.x * b.y - a.y * b.x
  }
  return {
    vertices,
    hx: maxX,
    hy: maxY,
    hull: part(hullIndices.map((i) => vertices[i])),
    pieces: pieceIndices.map((cycle) => part(cycle.map((i) => vertices[i]))),
    pieceIndices,
    triangleCount: ears.triangles.length,
    doubledArea: twice,
  }
}

const P = (x: number, y: number): GridPoint => ({ x, y })

/**
 * Seven fixed templates, counter-clockwise on grid points, bounding boxes centred at the origin, no collinear
 * consecutive vertices, at most 12 vertices. Six are concave (L, U, chevron, dart, notched star, comb); the hexagon
 * is convex, so the hull stage removes nothing for it.
 */
export const TEMPLATE_VERTICES: readonly (readonly GridPoint[])[] = [
  // L (6)
  [P(-2, -2), P(2, -2), P(2, 0), P(0, 0), P(0, 2), P(-2, 2)],
  // U (8)
  [P(-3, -2), P(3, -2), P(3, 2), P(1, 2), P(1, 0), P(-1, 0), P(-1, 2), P(-3, 2)],
  // chevron (6)
  [P(-4, -2), P(-2, -2), P(0, 0), P(2, -2), P(4, -2), P(0, 2)],
  // dart (4)
  [P(-3, -3), P(0, -1), P(3, -3), P(0, 3)],
  // notched four-point star (8)
  [P(0, -4), P(1, -1), P(4, 0), P(1, 1), P(0, 4), P(-1, 1), P(-4, 0), P(-1, -1)],
  // comb (12)
  [P(-4, -2), P(4, -2), P(4, 2), P(2, 2), P(2, 0), P(1, 0), P(1, 2), P(-1, 2), P(-1, 0), P(-2, 0), P(-2, 2), P(-4, 2)],
  // convex hexagon (6)
  [P(-2, -3), P(2, -3), P(4, 0), P(2, 3), P(-2, 3), P(-4, 0)],
]

export const POLYGON_TEMPLATES: readonly PolygonShape[] = TEMPLATE_VERTICES.map(makeShape)

/** Mean template area in template units squared; the world scale is chosen from it (see `polygonScale`). */
export const POLYGON_MEAN_AREA: number =
  POLYGON_TEMPLATES.reduce((sum, t) => sum + t.doubledArea / 2, 0) / POLYGON_TEMPLATES.length
