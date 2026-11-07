import {describe, expect, it} from 'vitest'
import {createSweepState, sweepAndPruneCandidates} from './broadPhase'
import type {BroadBodies} from './broadPhase'
import {replaySweep, traceSweep} from './sweepTrace'
import {createScratch, createWorld, stepWorld} from './world'

function bodies(boxes: readonly (readonly [number, number, number])[]): BroadBodies {
  return {
    count: boxes.length,
    x: Float64Array.from(boxes.map(b => b[0])),
    y: Float64Array.from(boxes.map(b => b[1])),
    r: Float64Array.from(boxes.map(b => b[2])),
  }
}

function real(b: BroadBodies, order?: Int32Array) {
  const state = createSweepState(b.count)
  if (order) state.order.set(order)
  const pairs: [number, number][] = []
  const tests = sweepAndPruneCandidates(b, state, (i, j) => pairs.push([i, j]))
  return {pairs, tests, order: state.order}
}

describe('traceSweep equivalence with sweepAndPruneCandidates', () => {
  for (const n of [0, 1, 2, 5, 20, 40, 200]) {
    it(`matches candidates, order and box-test count for seeds 1-50 at n=${n}`, () => {
      for (let seed = 1; seed <= 50; seed++) {
        const w = createWorld({seed, count: n})
        const t = traceSweep(w)
        const ref = real(w)
        expect(t.candidates).toEqual(ref.pairs)
        expect(t.boxTests).toBe(ref.tests)
        expect(Array.from(t.order)).toEqual(Array.from(ref.order))
        expect(t.events.filter(e => e.kind === 'box-test').length).toBe(ref.tests)
        expect(t.events.filter(e => e.kind === 'candidate').map(e => [Math.min(e.body, e.other), Math.max(e.body, e.other)])).toEqual(ref.pairs)
      }
    })
  }

  it('matches from a persistent, nearly sorted order after the world has moved', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const w = createWorld({seed, count: 30})
      const scratch = createScratch(30)
      for (let s = 0; s < 40; s++) stepWorld(w, 'sweep', scratch)
      const before = Int32Array.from(scratch.sweep.order)
      // Move once more without sorting, then compare both passes from the same starting order.
      for (let i = 0; i < 30; i++) w.x[i] += w.vx[i] * 0.5
      const t = traceSweep(w, before)
      const ref = real(w, before)
      expect(t.candidates).toEqual(ref.pairs)
      expect(t.boxTests).toBe(ref.tests)
      expect(Array.from(t.order)).toEqual(Array.from(ref.order))
    }
  })

  it('does not modify the initial order it is given', () => {
    const w = createWorld({seed: 3, count: 10})
    const order = Int32Array.from({length: 10}, (_, i) => 9 - i)
    const copy = Int32Array.from(order)
    traceSweep(w, order)
    expect(order).toEqual(copy)
  })
})

describe('traceSweep event order', () => {
  it('lists box tests, then candidate or y-rejected, then enter, per inserted body', () => {
    // 0 and 1 overlap in x and y; 2 overlaps 0 and 1 in x only.
    const t = traceSweep(bodies([[10, 10, 5], [14, 10, 5], [12, 100, 5]]))
    expect(t.events.map(e => [e.kind, e.body, e.other])).toEqual([
      ['enter', 0, -1],
      ['box-test', 2, 0], ['y-rejected', 2, 0], ['enter', 2, -1],
      ['box-test', 1, 0], ['candidate', 1, 0], ['box-test', 1, 2], ['y-rejected', 1, 2], ['enter', 1, -1],
    ])
  })

  it('emits a leave only when x_max < x_min and carries the sweep x', () => {
    const t = traceSweep(bodies([[10, 0, 5], [30, 0, 5]]))
    expect(t.events.map(e => [e.kind, e.body, e.x])).toEqual([
      ['enter', 0, 5], ['leave', 0, 25], ['enter', 1, 25],
    ])
    expect(t.boxTests).toBe(0)
  })

  it('puts the entry before the exit on a tie: touching intervals stay active and are tested', () => {
    // Body 0 spans [5,15], body 1 spans [15,25]: x_max == x_min.
    const t = traceSweep(bodies([[10, 0, 5], [20, 0, 5]]))
    expect(t.events.map(e => e.kind)).toEqual(['enter', 'box-test', 'candidate', 'enter'])
    expect(t.candidates).toEqual([[0, 1]])
  })

  it('has non-decreasing sweep x', () => {
    const t = traceSweep(createWorld({seed: 7, count: 40}))
    for (let k = 1; k < t.events.length; k++) expect(t.events[k].x).toBeGreaterThanOrEqual(t.events[k - 1].x)
  })

  it('returns an empty trace for no bodies', () => {
    expect(traceSweep(createWorld({seed: 1, count: 0})).events).toEqual([])
  })
})

describe('replaySweep', () => {
  it('tracks the active list, decided pairs and box-test count event by event', () => {
    const t = traceSweep(bodies([[10, 10, 5], [14, 10, 5], [12, 100, 5], [200, 10, 5]]))
    const kinds = t.events.map(e => e.kind)
    expect(replaySweep(t.events, 0)).toMatchObject({active: [], lines: [], boxTests: 0, sweepX: null, current: null})
    let last = replaySweep(t.events, 0)
    for (let k = 1; k <= t.events.length; k++) {
      const s = replaySweep(t.events, k)
      expect(s.boxTests).toBe(kinds.slice(0, k).filter(x => x === 'box-test').length)
      expect(s.lines.length).toBe(kinds.slice(0, k).filter(x => x === 'candidate' || x === 'y-rejected').length)
      last = s
    }
    expect(last.boxTests).toBe(t.boxTests)
    expect(last.lines.filter(l => l.passes).map(l => [l.a, l.b])).toEqual(t.candidates)
    expect(last.lines.filter(l => !l.passes)).toEqual([{a: 0, b: 2, passes: false}, {a: 1, b: 2, passes: false}])
    // Body 3 starts after 0, 1 and 2 have ended; only it is open at the end.
    expect(last.active).toEqual([3])
  })

  it('clamps the applied count', () => {
    const t = traceSweep(bodies([[10, 10, 5]]))
    expect(replaySweep(t.events, 99).active).toEqual([0])
    expect(replaySweep(t.events, -3).active).toEqual([])
  })
})
