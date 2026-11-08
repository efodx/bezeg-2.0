import { describe, expect, it } from 'vitest'
import { polygonMassProperties, POLYGON_TEMPLATES } from './polygonTemplates'
import { bounceTouchingPairs, contactImpulse, FRICTION } from './response'
import { makePlacement, place, polygonContact, shapesTouchRotated } from './rotation'
import { mulberry32 } from './random'
import { clearRotation, createScratch, createWorld, stepWorld } from './world'
import type { World } from './world'

type Pt = { x: number; y: number }

describe('template mass properties', () => {
  it('matches the closed form for a unit square', () => {
    const m = polygonMassProperties([{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }])
    expect(m.area).toBeCloseTo(1, 12)
    expect(m.centroidX).toBeCloseTo(0, 12)
    expect(m.centroidY).toBeCloseTo(0, 12)
    expect(m.inertia).toBeCloseTo(1 / 6, 12) // (w^2 + h^2) / 12
  })

  it('matches a triangle-by-triangle computation for every template, the L being non-convex', () => {
    POLYGON_TEMPLATES.forEach((t) => {
      // Fan each convex piece; a triangle's polar moment about its own centroid is A (a^2 + b^2 + c^2) / 36.
      let area = 0
      let sx = 0
      let sy = 0
      const tris: { a: number; gx: number; gy: number; p: number }[] = []
      const d2 = (u: Pt, v: Pt): number => (u.x - v.x) ** 2 + (u.y - v.y) ** 2
      for (const cycle of t.pieceIndices) {
        for (let k = 1; k + 1 < cycle.length; k++) {
          const [p, q, r] = [t.vertices[cycle[0]], t.vertices[cycle[k]], t.vertices[cycle[k + 1]]]
          const a = Math.abs((q.x - p.x) * (r.y - p.y) - (r.x - p.x) * (q.y - p.y)) / 2
          const tri = { a, gx: (p.x + q.x + r.x) / 3, gy: (p.y + q.y + r.y) / 3, p: (a * (d2(p, q) + d2(q, r) + d2(r, p))) / 36 }
          tris.push(tri)
          area += a
          sx += a * tri.gx
          sy += a * tri.gy
        }
      }
      const cx = sx / area
      const cy = sy / area
      let inertia = 0
      for (const tr of tris) inertia += tr.p + tr.a * ((tr.gx - cx) ** 2 + (tr.gy - cy) ** 2)
      expect(t.doubledArea / 2).toBeCloseTo(area, 10)
      expect(t.centroidX).toBeCloseTo(cx, 10)
      expect(t.centroidY).toBeCloseTo(cy, 10)
      expect(t.inertia).toBeCloseTo(inertia, 9)
    })
    // The L: a 4 x 4 square minus a 2 x 2 corner has its centroid at (-1/3, -1/3).
    expect(POLYGON_TEMPLATES[0].centroidX).toBeCloseTo(-1 / 3, 12)
  })
})

function rotateAll(pts: readonly Pt[], angle: number): Pt[] {
  return pts.map((p) => ({ x: Math.cos(angle) * p.x - Math.sin(angle) * p.y, y: Math.sin(angle) * p.x + Math.cos(angle) * p.y }))
}

/** World outline of template t, explicitly rotated, box centred on (x, y), scaled by s. */
function outline(t: number, x: number, y: number, angle: number, s: number): Pt[] {
  const rotated = rotateAll(POLYGON_TEMPLATES[t].vertices, angle)
  const xs = rotated.map((p) => p.x)
  const ys = rotated.map((p) => p.y)
  const bx = (Math.min(...xs) + Math.max(...xs)) / 2
  const by = (Math.min(...ys) + Math.max(...ys)) / 2
  return rotated.map((p) => ({ x: x + s * (p.x - bx), y: y + s * (p.y - by) }))
}

const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

function segmentsCross(p: Pt, q: Pt, r: Pt, s: Pt): boolean {
  return cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0
}

function contains(poly: readonly Pt[], pt: Pt): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Simple polygons overlap exactly when two edges cross properly or one contains a vertex of the other. */
function bruteForceTouch(a: readonly Pt[], b: readonly Pt[]): boolean {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  return contains(a, b[0]) || contains(b, a[0])
}

describe('rotated narrow phase', () => {
  it('agrees with a brute-force polygon intersection on explicitly rotated outlines', () => {
    const rand = mulberry32(7)
    let touching = 0
    const cases = 3000
    for (let c = 0; c < cases; c++) {
      const ta = Math.floor(rand() * POLYGON_TEMPLATES.length)
      const tb = Math.floor(rand() * POLYGON_TEMPLATES.length)
      const s = 0.5 + rand()
      const angleA = (rand() - 0.5) * 2 * Math.PI
      const angleB = (rand() - 0.5) * 2 * Math.PI
      const x2 = (rand() - 0.5) * 16 * s
      const y2 = (rand() - 0.5) * 16 * s
      const expected = bruteForceTouch(outline(ta, 0, 0, angleA, s), outline(tb, x2, y2, angleB, s))
      const actual = shapesTouchRotated(POLYGON_TEMPLATES[ta], 0, 0, angleA, POLYGON_TEMPLATES[tb], x2, y2, angleB, s)
      expect(actual).toBe(expected)
      if (expected) touching++
    }
    expect(touching).toBeGreaterThan(cases / 10)
    expect(touching).toBeLessThan(cases * 0.9)
  })

  it('has a rotated box that contains every rotated vertex and touches each side', () => {
    const rand = mulberry32(11)
    const p = makePlacement()
    for (let c = 0; c < 500; c++) {
      const t = Math.floor(rand() * POLYGON_TEMPLATES.length)
      const angle = (rand() - 0.5) * 2 * Math.PI
      const s = 0.5 + rand()
      const x = rand() * 100
      const y = rand() * 100
      place(p, POLYGON_TEMPLATES[t], x, y, angle, s)
      const pts = outline(t, x, y, angle, s)
      const hx = s * p.hx
      const hy = s * p.hy
      const eps = 1e-9
      for (const q of pts) {
        expect(q.x).toBeGreaterThanOrEqual(x - hx - eps)
        expect(q.x).toBeLessThanOrEqual(x + hx + eps)
        expect(q.y).toBeGreaterThanOrEqual(y - hy - eps)
        expect(q.y).toBeLessThanOrEqual(y + hy + eps)
      }
      expect(Math.min(...pts.map((q) => q.x))).toBeCloseTo(x - hx, 9)
      expect(Math.max(...pts.map((q) => q.x))).toBeCloseTo(x + hx, 9)
      expect(Math.min(...pts.map((q) => q.y))).toBeCloseTo(y - hy, 9)
      expect(Math.max(...pts.map((q) => q.y))).toBeCloseTo(y + hy, 9)
    }
  })
})

/** Two polygon bodies at scale 1 for the impulse tests. */
function bodies(): World {
  const w = { ...createWorld({ seed: 1, count: 2, shape: 'polygon' }), scale: 1 }
  w.vx.fill(0)
  w.vy.fill(0)
  return w
}

describe('contact impulse', () => {
  function randomContact(rand: () => number) {
    const world = bodies()
    const ang = rand() * 2 * Math.PI
    // r runs from each centre to the contact point P, which is taken as the origin of the angular momentum.
    const r = [0, 1, 2, 3].map(() => (rand() - 0.5) * 3)
    const m = [1 + 3 * rand(), 1 + 3 * rand()]
    const inertia = [m[0] * (0.2 + rand()), m[1] * (0.2 + rand())]
    for (let k = 0; k < 2; k++) {
      world.vx[k] = (rand() - 0.5) * 20
      world.vy[k] = (rand() - 0.5) * 20
      world.omega[k] = (rand() - 0.5) * 6
    }
    return { world, nx: Math.cos(ang), ny: Math.sin(ang), r, m, inertia }
  }
  const kinetic = (w: World, m: number[], inertia: number[]): number =>
    [0, 1].reduce((e, k) => e + 0.5 * m[k] * (w.vx[k] ** 2 + w.vy[k] ** 2) + 0.5 * inertia[k] * w.omega[k] ** 2, 0)
  // Centres relative to the contact point are -r; angular momentum about that fixed point.
  const angularMomentum = (w: World, r: number[], m: number[], inertia: number[]): number => {
    const gx = [-r[0], -r[2]]
    const gy = [-r[1], -r[3]]
    return [0, 1].reduce((l, k) => l + m[k] * (gx[k] * w.vy[k] - gy[k] * w.vx[k]) + inertia[k] * w.omega[k], 0)
  }
  const momentum = (w: World, m: number[]): number[] => [m[0] * w.vx[0] + m[1] * w.vx[1], m[0] * w.vy[0] + m[1] * w.vy[1]]
  const close = (a: number, b: number, scale: number): void => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, scale))

  function approaching(c: ReturnType<typeof randomContact>): boolean {
    const { world: w, nx, ny, r } = c
    const rvx = w.vx[1] - w.omega[1] * r[3] - (w.vx[0] - w.omega[0] * r[1])
    const rvy = w.vy[1] + w.omega[1] * r[2] - (w.vy[0] + w.omega[0] * r[0])
    return rvx * nx + rvy * ny < 0
  }

  it('frictionless: conserves linear momentum, angular momentum and kinetic energy', () => {
    const rand = mulberry32(3)
    let applied = 0
    for (let c = 0; c < 400; c++) {
      const k = randomContact(rand)
      const { world, nx, ny, r, m, inertia } = k
      const wasApproaching = approaching(k)
      const e0 = kinetic(world, m, inertia)
      const l0 = angularMomentum(world, r, m, inertia)
      const p0 = momentum(world, m)
      contactImpulse(world, 0, 1, nx, ny, r[0], r[1], r[2], r[3], 1 / m[0], 1 / inertia[0], 1 / m[1], 1 / inertia[1], 0)
      close(kinetic(world, m, inertia), e0, e0)
      close(angularMomentum(world, r, m, inertia), l0, Math.abs(l0) + e0)
      close(momentum(world, m)[0], p0[0], Math.abs(p0[0]))
      close(momentum(world, m)[1], p0[1], Math.abs(p0[1]))
      if (wasApproaching) applied++
    }
    expect(applied).toBeGreaterThan(100)
  })

  it('with friction: kinetic energy never rises, momenta are conserved and |jt| <= mu jn', () => {
    const rand = mulberry32(5)
    let clamped = 0
    for (let c = 0; c < 400; c++) {
      const k = randomContact(rand)
      const { world, nx, ny, r, m, inertia } = k
      const e0 = kinetic(world, m, inertia)
      const l0 = angularMomentum(world, r, m, inertia)
      const p0 = momentum(world, m)
      const v1 = [world.vx[1], world.vy[1]]
      contactImpulse(world, 0, 1, nx, ny, r[0], r[1], r[2], r[3], 1 / m[0], 1 / inertia[0], 1 / m[1], 1 / inertia[1])
      expect(kinetic(world, m, inertia)).toBeLessThanOrEqual(e0 * (1 + 1e-12))
      close(angularMomentum(world, r, m, inertia), l0, Math.abs(l0) + e0)
      close(momentum(world, m)[0], p0[0], Math.abs(p0[0]))
      close(momentum(world, m)[1], p0[1], Math.abs(p0[1]))
      // The total impulse on body 1 is jn along n plus jt along t = (-ny, nx).
      const dx = m[1] * (world.vx[1] - v1[0])
      const dy = m[1] * (world.vy[1] - v1[1])
      const jn = dx * nx + dy * ny
      const jt = -dx * ny + dy * nx
      expect(Math.abs(jt)).toBeLessThanOrEqual(FRICTION * jn * (1 + 1e-9) + 1e-12)
      if (jn > 0 && Math.abs(jt) > 0.99 * FRICTION * jn) clamped++
    }
    expect(clamped).toBeGreaterThan(0)
  })

  it('gives no spin for a centred hit and a spin of the right sign for an off-centre one', () => {
    const centred = bodies()
    centred.vx[0] = 5
    contactImpulse(centred, 0, 1, 1, 0, 1, 0, -1, 0, 1, 1, 1, 1)
    expect(centred.omega[0]).toBe(0)
    expect(centred.omega[1]).toBe(0)
    expect(centred.vx[1]).toBeGreaterThan(0)
    // Body 1's contact point lies at r = (-1, +0.5) from its centre (y up): a +x force above the centre turns it clockwise.
    const off = bodies()
    off.vx[0] = 5
    contactImpulse(off, 0, 1, 1, 0, 1, 0, -1, 0.5, 1, 1, 1, 1, 0)
    expect(off.omega[1]).toBeLessThan(0)
    expect(off.omega[0]).toBe(0)
  })

  it('turns a resting polygon hit off-centre, with the sign of the lever arm', () => {
    // L template, scale 1, centroid (-1/3, -1/3). A moves +x into B's vertical left edge; the contact point is about
    // (2, -1) (the middle of A's right edge), and B's centroid is at (3.9 - 1/3, by - 1/3).
    const run = (by: number): World => {
      const w = bodies()
      w.template[0] = 0
      w.template[1] = 0
      w.x[0] = 0
      w.y[0] = 0
      w.x[1] = 3.9
      w.y[1] = by
      w.vx[0] = 1
      w.vy[0] = 0
      w.vx[1] = 0
      w.vy[1] = 0
      bounceTouchingPairs(w, Int32Array.from([0, 1]), 1)
      return w
    }
    // Torque on B = -(Py - Gy) jn with Py = -1.
    expect(run(-1).omega[1]).toBeLessThan(0) // Gy = -4/3: contact above the centroid, clockwise
    expect(run(0.5).omega[1]).toBeGreaterThan(0) // Gy = 1/6: contact below, anticlockwise
    // Level with B's centroid the normal impulse gives B no torque; B turns only through friction with A's spin.
    expect(run(-2 / 3).vx[1]).toBeGreaterThan(0)
    const head = createWorld({ seed: 1, count: 2 })
    head.x.set([0, 1.9])
    head.y.set([0, 0])
    head.r.fill(1)
    head.vx.set([3, 0])
    head.vy.fill(0)
    bounceTouchingPairs(head, Int32Array.from([0, 1]), 1)
    expect(head.omega[0]).toBe(0)
    expect(head.omega[1]).toBe(0)
  })

  it('a glancing circle hit spins both circles anticlockwise (friction drags along the surface)', () => {
    const w = createWorld({ seed: 1, count: 2 })
    w.r[0] = 1
    w.r[1] = 1
    w.x[0] = 0
    w.y[0] = 0
    w.x[1] = 1.7
    w.y[1] = 1.0
    w.vx[0] = 4
    w.vy[0] = 0
    w.vx[1] = 0
    w.vy[1] = 0
    bounceTouchingPairs(w, Int32Array.from([0, 1]), 1)
    expect(w.omega[0]).toBeGreaterThan(0)
    expect(w.omega[1]).toBeGreaterThan(0)
    expect(w.vx[0] + w.vx[1]).toBeCloseTo(4, 9) // equal masses: linear momentum along x is kept
  })
})

describe('polygon contact', () => {
  it('finds the face normal, depth and contact point of two overlapping Ls', () => {
    const L = POLYGON_TEMPLATES[0]
    const out = { nx: 0, ny: 0, depth: 0, px: 0, py: 0 }
    expect(polygonContact(L, 0, 0, 0, L, 3.9, -1, 0, 1, out)).toBe(true)
    expect(out.nx).toBeCloseTo(1, 9)
    expect(out.ny).toBeCloseTo(0, 9)
    expect(out.depth).toBeCloseTo(0.1, 9)
    expect(out.px).toBeCloseTo(1.9, 9) // B's deepest vertices, the left edge x = 3.9 - 2
    expect(out.py).toBeCloseTo(-1, 9)
  })
})

describe('spinning world', () => {
  it('keeps boxes consistent with the angles and stays finite', () => {
    const w = createWorld({ seed: 4, count: 60, shape: 'polygon' })
    const scratch = createScratch(60)
    for (let i = 0; i < 60; i++) w.omega[i] = (i % 7) - 3
    const p = makePlacement()
    for (let step = 0; step < 300; step++) stepWorld(w, 'sweep', scratch, true)
    for (let i = 0; i < 60; i++) {
      place(p, POLYGON_TEMPLATES[w.template[i]], w.x[i], w.y[i], w.angle[i], w.scale)
      expect(w.hx[i]).toBeCloseTo(w.scale * p.hx, 9)
      expect(w.hy[i]).toBeCloseTo(w.scale * p.hy, 9)
      expect(w.x[i]).toBeGreaterThanOrEqual(0)
      expect(w.x[i]).toBeLessThanOrEqual(w.width)
      expect(w.y[i]).toBeGreaterThanOrEqual(0)
      expect(w.y[i]).toBeLessThanOrEqual(w.height)
    }
    clearRotation(w)
    expect(w.angle.every((a) => a === 0)).toBe(true)
    expect(w.hx[0]).toBeCloseTo(w.scale * POLYGON_TEMPLATES[w.template[0]].hx, 12)
  })

  it('moves a spinning polygon\'s centroid with its velocity', () => {
    const w = createWorld({ seed: 2, count: 1, shape: 'polygon' })
    const scratch = createScratch(1)
    w.x[0] = 800
    w.y[0] = 500
    w.vx[0] = 60
    w.vy[0] = 0
    w.omega[0] = 2
    const t = POLYGON_TEMPLATES[w.template[0]]
    const p = makePlacement()
    const centroidX = (): number => {
      place(p, t, w.x[0], w.y[0], w.angle[0], w.scale)
      return w.x[0] + w.scale * (p.cos * t.centroidX - p.sin * t.centroidY - p.bbx)
    }
    const before = centroidX()
    for (let k = 0; k < 60; k++) stepWorld(w, 'sweep', scratch, true)
    expect(centroidX() - before).toBeCloseTo(60, 6)
  })
})
