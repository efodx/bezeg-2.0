import {boxesOverlap} from './broadPhase'
import type {BroadBodies} from './broadPhase'

export type SweepEventKind = 'enter' | 'leave' | 'box-test' | 'candidate' | 'y-rejected'

/**
 * One step of a sweep. `x` is the sweep position (the x_min of the body being inserted). `body` is the entering or leaving
 * body, or the inserted body for tests; `other` is the active body it is tested against, or -1 for enter and leave.
 */
export interface SweepEvent {
  readonly kind: SweepEventKind
  readonly x: number
  readonly body: number
  readonly other: number
}

export interface SweepTrace {
  readonly events: readonly SweepEvent[]
  /** Bodies sorted by x_min (stable insertion sort of the initial order). */
  readonly order: Int32Array
  readonly boxTests: number
  /** Pairs (smaller, larger index) that pass the box test, in emission order. */
  readonly candidates: readonly (readonly [number, number])[]
}

/**
 * Replays one pass of `sweepAndPruneCandidates` as ordered events, without touching the caller's order.
 * `initialOrder` is the persistent order the real pass would start from (identity when omitted); the stable insertion
 * sort and the strict exit test (x_max < x_min, so entries come before exits on ties) are the same as in the real pass.
 * Per inserted body: a `leave` for each active body that ended before it, a `box-test` for each remaining active body
 * followed by `candidate` (closed boxes overlap) or `y-rejected` (overlap in x, not in y), then `enter`.
 */
export function traceSweep(b: BroadBodies, initialOrder?: ArrayLike<number>): SweepTrace {
  const n = b.count
  const order = new Int32Array(n)
  for (let i = 0; i < n; i++) order[i] = initialOrder ? initialOrder[i] : i
  const {x, r} = b
  for (let k = 1; k < n; k++) {
    const id = order[k]
    const key = x[id] - r[id]
    let m = k - 1
    while (m >= 0 && x[order[m]] - r[order[m]] > key) {
      order[m + 1] = order[m]
      m--
    }
    order[m + 1] = id
  }
  const events: SweepEvent[] = []
  const candidates: (readonly [number, number])[] = []
  let active: number[] = []
  let boxTests = 0
  for (let k = 0; k < n; k++) {
    const cur = order[k]
    const xmin = x[cur] - r[cur]
    const kept: number[] = []
    for (const o of active) {
      if (x[o] + r[o] < xmin) {
        events.push({kind: 'leave', x: xmin, body: o, other: -1})
        continue
      }
      kept.push(o)
      boxTests++
      events.push({kind: 'box-test', x: xmin, body: cur, other: o})
      if (boxesOverlap(b, o, cur)) {
        events.push({kind: 'candidate', x: xmin, body: cur, other: o})
        candidates.push(o < cur ? [o, cur] : [cur, o])
      } else {
        events.push({kind: 'y-rejected', x: xmin, body: cur, other: o})
      }
    }
    kept.push(cur)
    active = kept
    events.push({kind: 'enter', x: xmin, body: cur, other: -1})
  }
  return {events, order, boxTests, candidates}
}

export interface SweepReplay {
  /** Open intervals (the active list) after the first `applied` events, in insertion order. */
  readonly active: readonly number[]
  /** Pairs decided so far: `passes` is true for candidates and false for pairs rejected by the y test. */
  readonly lines: readonly {readonly a: number; readonly b: number; readonly passes: boolean}[]
  readonly boxTests: number
  /** Sweep position of the last applied event, or null before the first. */
  readonly sweepX: number | null
  readonly current: SweepEvent | null
}

/** The state of the sweep after the first `applied` events of a trace (clamped to the trace length). */
export function replaySweep(events: readonly SweepEvent[], applied: number): SweepReplay {
  const end = Math.max(0, Math.min(applied, events.length))
  let active: number[] = []
  const lines: {a: number; b: number; passes: boolean}[] = []
  let boxTests = 0
  for (let k = 0; k < end; k++) {
    const e = events[k]
    if (e.kind === 'enter') active.push(e.body)
    else if (e.kind === 'leave') active = active.filter(o => o !== e.body)
    else if (e.kind === 'box-test') boxTests++
    else lines.push({a: Math.min(e.body, e.other), b: Math.max(e.body, e.other), passes: e.kind === 'candidate'})
  }
  const current = end > 0 ? events[end - 1] : null
  return {active, lines, boxTests, sweepX: current ? current.x : null, current}
}
