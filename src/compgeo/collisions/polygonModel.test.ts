import { describe, expect, it } from 'vitest'
import type { GridPoint } from '../grid'
import { orient } from '../predicates'
import { doubledSignedArea } from '../polygonMeasures'
import { convexPartsTouch, shapesTouch } from './narrowPhase'
import {
  makeShape,
  POLYGON_MEAN_AREA,
  POLYGON_TEMPLATES,
  TEMPLATE_VERTICES,
  type ConvexPart,
  type PolygonShape,
} from './polygonTemplates'
import { AREA_FRACTION, createScratch, createWorld, polygonScale, stepWorld, type BroadPhaseMethod } from './world'

const key = (p: GridPoint) => `${p.x},${p.y}`
const points = (c: ConvexPart): GridPoint[] => Array.from({ length: c.size }, (_, k) => ({ x: c.px[k], y: c.py[k] }))

describe('polygon templates', () => {
  it('has five to seven templates of at most 12 vertices, some concave and one convex', () => {
    expect(TEMPLATE_VERTICES.length).toBeGreaterThanOrEqual(5)
    expect(TEMPLATE_VERTICES.length).toBeLessThanOrEqual(7)
    for (const t of POLYGON_TEMPLATES) expect(t.vertices.length).toBeLessThanOrEqual(12)
    const convex = POLYGON_TEMPLATES.filter((t) => t.hull.size === t.vertices.length)
    expect(convex.length).toBeGreaterThanOrEqual(1)
    expect(POLYGON_TEMPLATES.length - convex.length).toBeGreaterThanOrEqual(3)
    for (const t of convex) expect(t.pieces).toHaveLength(1)
  })

  POLYGON_TEMPLATES.forEach((t, index) => {
    describe(`template ${index} (${t.vertices.length} vertices)`, () => {
      const v = t.vertices
      const n = v.length

      it('is counter-clockwise, centred, with no collinear consecutive vertices', () => {
        expect(doubledSignedArea(v) > 0n).toBe(true)
        expect(Math.min(...v.map((p) => p.x)) + Math.max(...v.map((p) => p.x))).toBe(0)
        expect(Math.min(...v.map((p) => p.y)) + Math.max(...v.map((p) => p.y))).toBe(0)
        for (let k = 0; k < n; k++) expect(orient(v[(k + n - 1) % n], v[k], v[(k + 1) % n])).not.toBe(0)
      })

      it('has a hull containing every template vertex (exact orient >= 0 against each hull edge)', () => {
        const h = points(t.hull)
        for (let k = 0; k < h.length; k++) {
          for (const p of v) expect(orient(h[k], h[(k + 1) % h.length], p)).toBeGreaterThanOrEqual(0)
        }
        for (let k = 0; k < h.length; k++) expect(orient(h[k], h[(k + 1) % h.length], h[(k + 2) % h.length])).toBe(1)
      })

      it('has strictly convex pieces whose doubled areas sum exactly to the template area', () => {
        let sum = 0n
        for (const piece of t.pieces) {
          const q = points(piece)
          for (let k = 0; k < q.length; k++) {
            expect(orient(q[(k + q.length - 1) % q.length], q[k], q[(k + 1) % q.length])).toBe(1)
          }
          sum += doubledSignedArea(q)
          for (const p of q) expect(v.map(key)).toContain(key(p))
        }
        expect(sum).toBe(doubledSignedArea(v))
        expect(t.pieces.length).toBeLessThanOrEqual(t.triangleCount)
        expect(t.triangleCount).toBe(n - 2)
      })

      it('has integer edge normals (-dy, dx)', () => {
        for (const part of [t.hull, ...t.pieces]) {
          for (let k = 0; k < part.size; k++) {
            const k2 = (k + 1) % part.size
            expect(part.mx[k]).toBe(-(part.py[k2] - part.py[k]))
            expect(part.my[k]).toBe(part.px[k2] - part.px[k])
          }
        }
      })
    })
  })

  it('chooses one scale per world with the circles area share', () => {
    for (const n of [1, 10, 200, 1000]) {
      const s = polygonScale(n)
      expect(n * s * s * POLYGON_MEAN_AREA).toBeCloseTo(AREA_FRACTION * 1600 * 1000, 6)
    }
    const w = createWorld({ seed: 1, count: 5, shape: 'polygon' })
    expect(w.scale).toBe(polygonScale(5))
  })
})

// ---- independent integer SAT over the same pieces (translated vertices first, then project) ----

function integerPartsTouch(a: GridPoint[], b: GridPoint[]): boolean {
  for (const poly of [a, b]) {
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k]
      const q = poly[(k + 1) % poly.length]
      const nx = q.y - p.y
      const ny = -(q.x - p.x)
      const pa = a.map((r) => nx * r.x + ny * r.y)
      const pb = b.map((r) => nx * r.x + ny * r.y)
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false
    }
  }
  return true
}

function integerShapesTouch(a: PolygonShape, ax: number, ay: number, b: PolygonShape, bx: number, by: number): boolean {
  const move = (c: ConvexPart, dx: number, dy: number) => points(c).map((p) => ({ x: p.x + dx, y: p.y + dy }))
  return a.pieces.some((pa) => b.pieces.some((pb) => integerPartsTouch(move(pa, ax, ay), move(pb, bx, by))))
}

const P = (x: number, y: number): GridPoint => ({ x, y })
const square = makeShape([P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)])
const diamond = makeShape([P(0, -1), P(1, 0), P(0, 1), P(-1, 0)])
// U with a 4 x 3 notch: box [-4,4] x [-3,3], notch x in [-2,2], y in [0,3].
const wideU = makeShape([P(-4, -3), P(4, -3), P(4, 3), P(2, 3), P(2, 0), P(-2, 0), P(-2, 3), P(-4, 3)])

describe('exact touching cases (scale 1, integer positions)', () => {
  const touch = (a: PolygonShape, ax: number, ay: number, b: PolygonShape, bx: number, by: number) =>
    shapesTouch(a, ax, ay, b, bx, by, 1)

  it('shared edge touches', () => expect(touch(square, 0, 0, square, 2, 0)).toBe(true))
  it('shared vertex touches', () => expect(touch(square, 0, 0, square, 2, 2)).toBe(true))
  it('a vertex on an edge touches', () => expect(touch(square, 2, 0, diamond, 0, 0)).toBe(true))
  it('a one-unit gap does not touch', () => {
    expect(touch(square, 0, 0, square, 3, 0)).toBe(false)
    expect(touch(square, 0, 0, square, 3, 3)).toBe(false)
    expect(touch(square, 0, 0, diamond, 3, 0)).toBe(false)
  })
  it('a body nested in a concave notch without contact: hulls overlap, pieces do not', () => {
    const tallies = { hullTests: 0, hullPasses: 0, pieceTests: 0 }
    expect(shapesTouch(wideU, 0, 0, square, 0, 2, 1, tallies)).toBe(false)
    expect(tallies.hullPasses).toBe(1)
    expect(tallies.pieceTests).toBe(wideU.pieces.length)
    expect(integerShapesTouch(wideU, 0, 0, square, 0, 2)).toBe(false)
    // Touching the notch floor and a wall counts as contact.
    expect(touch(wideU, 0, 0, square, 0, 1)).toBe(true)
    expect(touch(wideU, 0, 0, square, 1, 2)).toBe(true)
    expect(touch(wideU, 0, 0, square, 1, 1)).toBe(true)
  })

  it('agrees with an independent integer SAT for every template pair over a grid of offsets', () => {
    let touching = 0
    let total = 0
    for (const a of POLYGON_TEMPLATES) {
      for (const b of POLYGON_TEMPLATES) {
        for (let dx = -9; dx <= 9; dx++) {
          for (let dy = -7; dy <= 7; dy++) {
            const expected = integerShapesTouch(a, 0, 0, b, dx, dy)
            total++
            if (expected) touching++
            expect(shapesTouch(a, 0, 0, b, dx, dy, 1)).toBe(expected)
          }
        }
      }
    }
    expect(touching).toBeGreaterThan(total / 10)
    expect(touching).toBeLessThan(total)
  })
})

// ---- worlds ----

function pairKeys(pairs: Int32Array, count: number): number[] {
  const out: number[] = []
  for (let k = 0; k < count; k++) out.push(Math.min(pairs[2 * k], pairs[2 * k + 1]) * 100000 + Math.max(pairs[2 * k], pairs[2 * k + 1]))
  return out.sort((p, q) => p - q)
}

function directPairs(w: ReturnType<typeof createWorld>): number[] {
  const out: number[] = []
  for (let i = 0; i < w.count; i++) {
    for (let j = i + 1; j < w.count; j++) {
      const a = POLYGON_TEMPLATES[w.template[i]]
      const b = POLYGON_TEMPLATES[w.template[j]]
      const hit = a.pieces.some((pa) =>
        b.pieces.some((pb) => convexPartsTouch(pa, w.x[i], w.y[i], pb, w.x[j], w.y[j], w.scale)))
      if (hit) out.push(i * 100000 + j)
    }
  }
  return out
}

describe('polygon worlds', () => {
  const configs: { n: number; seeds: number; directEvery: number }[] = [
    { n: 0, seeds: 50, directEvery: 1 },
    { n: 1, seeds: 50, directEvery: 1 },
    { n: 2, seeds: 50, directEvery: 1 },
    { n: 10, seeds: 50, directEvery: 1 },
    { n: 200, seeds: 50, directEvery: 60 },
    { n: 1000, seeds: 2, directEvery: 120 },
  ]
  for (const { n, seeds, directEvery } of configs) {
    it(`both broad phases and the direct piece test agree: n=${n}, seeds 1-${seeds}, 120 steps`, () => {
      for (let seed = 1; seed <= seeds; seed++) {
        const a = createWorld({ seed, count: n, shape: 'polygon' })
        const b = createWorld({ seed, count: n, shape: 'polygon' })
        const sa = createScratch(n)
        const sb = createScratch(n)
        for (let step = 0; step < 120; step++) {
          const ra = stepWorld(a, 'naive' as BroadPhaseMethod, sa)
          const rb = stepWorld(b, 'sweep' as BroadPhaseMethod, sb)
          const ka = pairKeys(ra.pairs, ra.counters.touchingPairs)
          expect(pairKeys(rb.pairs, rb.counters.touchingPairs)).toEqual(ka)
          const c = ra.counters
          expect(c.hullTests).toBe(c.candidates)
          expect(c.hullPasses).toBeLessThanOrEqual(c.hullTests)
          expect(c.touchingPairs).toBeLessThanOrEqual(c.hullPasses)
          expect(c.pieceTests).toBeGreaterThanOrEqual(c.hullPasses)
          if (step % directEvery === 0 || step === 119) expect(directPairs(a)).toEqual(ka)
        }
      }
    })
  }

  it('keeps bodies inside the world, with boxes containing the scaled vertices', () => {
    const w = createWorld({ seed: 7, count: 200, shape: 'polygon' })
    const scratch = createScratch(200)
    for (let step = 0; step < 300; step++) {
      stepWorld(w, 'sweep', scratch)
      for (let i = 0; i < w.count; i++) {
        expect(w.x[i] - w.hx[i]).toBeGreaterThanOrEqual(0)
        expect(w.x[i] + w.hx[i]).toBeLessThanOrEqual(w.width)
        expect(w.y[i] - w.hy[i]).toBeGreaterThanOrEqual(0)
        expect(w.y[i] + w.hy[i]).toBeLessThanOrEqual(w.height)
      }
    }
    for (let i = 0; i < w.count; i++) {
      for (const p of POLYGON_TEMPLATES[w.template[i]].vertices) {
        expect(Math.abs(w.scale * p.x)).toBeLessThanOrEqual(w.hx[i])
        expect(Math.abs(w.scale * p.y)).toBeLessThanOrEqual(w.hy[i])
      }
    }
  })

  it('reproduces identical positions for the same seed and n', () => {
    const a = createWorld({ seed: 11, count: 50, shape: 'polygon' })
    const b = createWorld({ seed: 11, count: 50, shape: 'polygon' })
    const sa = createScratch(50)
    const sb = createScratch(50)
    for (let step = 0; step < 100; step++) {
      stepWorld(a, 'naive', sa)
      stepWorld(b, 'sweep', sb)
    }
    expect(Array.from(a.x)).toEqual(Array.from(b.x))
    expect(Array.from(a.y)).toEqual(Array.from(b.y))
    expect(Array.from(a.template)).toEqual(Array.from(b.template))
  })

  it('uses every template at n=1000 and leaves circle counters at zero', () => {
    const w = createWorld({ seed: 3, count: 1000, shape: 'polygon' })
    expect(new Set(w.template).size).toBe(POLYGON_TEMPLATES.length)
    const c = createWorld({ seed: 3, count: 50 })
    expect(c.shape).toBe('circle')
    expect(c.hx).toBe(c.r)
    expect(c.hy).toBe(c.r)
    const { counters } = stepWorld(c, 'naive', createScratch(50))
    expect([counters.hullTests, counters.hullPasses, counters.pieceTests]).toEqual([0, 0, 0])
  })
})
