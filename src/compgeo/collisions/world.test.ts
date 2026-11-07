import { describe, expect, it } from 'vitest'
import { baseRadius, createScratch, createWorld, stepWorld, type BroadPhaseMethod } from './world'
import { circlesTouch } from './narrowPhase'
import { mulberry32 } from './random'
import { naiveCandidates, sweepAndPruneCandidates, createSweepState, type BroadBodies } from './broadPhase'

function pairSet(pairs: Int32Array, count: number): number[] {
  const out: number[] = []
  for (let k = 0; k < count; k++) {
    const a = pairs[2 * k]
    const b = pairs[2 * k + 1]
    out.push(Math.min(a, b) * 100000 + Math.max(a, b))
  }
  return out.sort((p, q) => p - q)
}

function candidatePairs(b: BroadBodies, method: BroadPhaseMethod): number[] {
  const out: number[] = []
  const sink = (i: number, j: number) => out.push(Math.min(i, j) * 100000 + Math.max(i, j))
  if (method === 'naive') naiveCandidates(b, sink)
  else sweepAndPruneCandidates(b, createSweepState(b.count), sink)
  return out.sort((p, q) => p - q)
}

function bodies(list: [number, number, number][]): BroadBodies {
  return {
    count: list.length,
    x: Float64Array.from(list.map((b) => b[0])),
    y: Float64Array.from(list.map((b) => b[1])),
    r: Float64Array.from(list.map((b) => b[2])),
  }
}

describe('PRNG', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v >= 0 && v < 1).toBe(true)
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('equivalence of broad phases', () => {
  it('gives identical touching-pair sets for seeds 1-50, n in {0,1,2,10,200,1000}', () => {
    const t0 = performance.now()
    let touchingSeen = 0
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [0, 1, 2, 10, 200, 1000]) {
        const steps = n === 1000 ? 12 : 120
        const wa = createWorld({ seed, count: n })
        const wb = createWorld({ seed, count: n })
        const sa = createScratch(n)
        const sb = createScratch(n)
        for (let s = 0; s < steps; s++) {
          const ra = stepWorld(wa, 'naive', sa)
          const rb = stepWorld(wb, 'sweep', sb)
          expect(pairSet(rb.pairs, rb.counters.touchingPairs)).toEqual(pairSet(ra.pairs, ra.counters.touchingPairs))
          expect(ra.counters.boxTests).toBe(Math.max(0, (n * (n - 1)) / 2))
          expect(rb.counters.boxTests).toBeLessThanOrEqual(ra.counters.boxTests)
          if (n === 1000) expect(rb.counters.boxTests).toBeLessThan(0.1 * ra.counters.boxTests)
          touchingSeen += ra.counters.touchingPairs
        }
      }
    }
    expect(touchingSeen).toBeGreaterThan(0)
    console.log(`equivalence runtime ms: ${Math.round(performance.now() - t0)}`)
  })
})

describe('world', () => {
  it('keeps bodies inside the world', () => {
    const w = createWorld({ seed: 3, count: 200 })
    const s = createScratch(200)
    for (let k = 0; k < 600; k++) {
      stepWorld(w, 'sweep', s)
      for (let i = 0; i < 200; i++) {
        expect(w.x[i] - w.r[i]).toBeGreaterThanOrEqual(0)
        expect(w.x[i] + w.r[i]).toBeLessThanOrEqual(w.width)
        expect(w.y[i] - w.r[i]).toBeGreaterThanOrEqual(0)
        expect(w.y[i] + w.r[i]).toBeLessThanOrEqual(w.height)
      }
    }
  })

  it('preserves the velocity sum over a step without wall contact', () => {
    const w = createWorld({ seed: 4, count: 50 })
    const s = createScratch(50)
    for (let i = 0; i < 50; i++) {
      w.x[i] = 800
      w.y[i] = 500
    }
    const sum = (v: Float64Array) => v.reduce((a, b) => a + b, 0)
    const [sx, sy] = [sum(w.vx), sum(w.vy)]
    stepWorld(w, 'naive', s)
    expect(sum(w.vx)).toBe(sx)
    expect(sum(w.vy)).toBe(sy)
  })

  it('mirrors the overshoot and reverses velocity at a wall', () => {
    const w = createWorld({ seed: 1, count: 1 })
    w.r[0] = 1
    w.x[0] = 1.2
    w.vx[0] = -60 // moves by -1 to 0.2; overshoot 0.8 past x = 1
    w.vy[0] = 0
    w.y[0] = 500
    stepWorld(w, 'naive', createScratch(1))
    expect(w.x[0]).toBeCloseTo(1.8, 12)
    expect(w.vx[0]).toBe(60)
  })

  it('reproduces identical positions for the same seed and n', () => {
    const run = () => {
      const w = createWorld({ seed: 9, count: 200 })
      const s = createScratch(200)
      for (let k = 0; k < 120; k++) stepWorld(w, 'sweep', s)
      return [Array.from(w.x), Array.from(w.y)]
    }
    expect(run()).toEqual(run())
  })

  it('differs between seeds', () => {
    expect(Array.from(createWorld({ seed: 1, count: 5 }).x)).not.toEqual(Array.from(createWorld({ seed: 2, count: 5 }).x))
  })

  it.each([200, 1000, 3000])('touches about 5 %% of bodies at n = %i (constant density)', (n) => {
    let touching = 0
    let total = 0
    for (let seed = 1; seed <= 10; seed++) {
      const w = createWorld({ seed, count: n })
      const s = createScratch(n)
      for (let k = 0; k < 10; k++) {
        const r = stepWorld(w, 'sweep', s)
        touching += r.touching.reduce((a, b) => a + b, 0)
        total += n
      }
    }
    const f = touching / total
    console.log(`touching fraction at n=${n}: ${f}`)
    expect(f).toBeGreaterThan(0.03)
    expect(f).toBeLessThan(0.08)
  })

  it('scales the base radius with 1/sqrt(n)', () => {
    expect(baseRadius(400) / baseRadius(100)).toBeCloseTo(0.5, 12)
    const w = createWorld({ seed: 3, count: 100 })
    for (const ri of w.r) {
      expect(ri).toBeGreaterThanOrEqual(0.75 * baseRadius(100))
      expect(ri).toBeLessThanOrEqual(1.25 * baseRadius(100))
    }
  })
})

describe('exact touching cases', () => {
  const methods: BroadPhaseMethod[] = ['naive', 'sweep']
  it('reports circles at distance exactly r1 + r2', () => {
    expect(circlesTouch(0, 0, 3, 5, 0, 2)).toBe(true)
    expect(circlesTouch(0, 0, 3, 5.0001, 0, 2)).toBe(false)
    expect(circlesTouch(0, 0, 5, 3, 4, 0)).toBe(true)
  })
  it('reports boxes sharing an edge or a corner as candidates', () => {
    const edge = bodies([[0, 0, 1], [2, 0, 1]])
    const corner = bodies([[0, 0, 1], [2, 2, 1]])
    const gap = bodies([[0, 0, 1], [2.5, 0, 1]])
    for (const m of methods) {
      expect(candidatePairs(edge, m)).toEqual([1])
      expect(candidatePairs(corner, m)).toEqual([1])
      expect(candidatePairs(gap, m)).toEqual([])
    }
  })
  it('sweep keeps a body active when x_max equals the next x_min', () => {
    const b = bodies([[0, 5, 1], [2, 5, 1], [4, 5, 1]])
    for (const m of methods) expect(candidatePairs(b, m)).toEqual([1, 100002])
  })
  it('stepWorld reports a touching pair at exact distance with both methods', () => {
    for (const m of methods) {
      const w = createWorld({ seed: 1, count: 2 })
      w.r.set([3, 2])
      w.x.set([100, 105])
      w.y.set([100, 100])
      w.vx.fill(0)
      w.vy.fill(0)
      const res = stepWorld(w, m, createScratch(2))
      expect(res.counters.touchingPairs).toBe(1)
      expect(Array.from(res.touching)).toEqual([1, 1])
    }
  })
})
