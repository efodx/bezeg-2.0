export type BroadPhaseMethod = 'naive' | 'sweep'

/** Body arrays read by the broad phase; circles have box [x-r, x+r] x [y-r, y+r], closed. */
export interface BroadBodies {
  readonly count: number
  readonly x: Float64Array
  readonly y: Float64Array
  readonly r: Float64Array
}

/** Closed box overlap of bodies i and j: shared edges and corners count. */
export function boxesOverlap(b: BroadBodies, i: number, j: number): boolean {
  const ri = b.r[i]
  const rj = b.r[j]
  return (
    b.x[i] - ri <= b.x[j] + rj &&
    b.x[j] - rj <= b.x[i] + ri &&
    b.y[i] - ri <= b.y[j] + rj &&
    b.y[j] - rj <= b.y[i] + ri
  )
}

export type CandidateSink = (i: number, j: number) => void

/** Every pair i<j gets one box test. Returns the number of box tests (n(n-1)/2). */
export function naiveCandidates(b: BroadBodies, emit: CandidateSink): number {
  const n = b.count
  let tests = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      tests++
      if (boxesOverlap(b, i, j)) emit(i, j)
    }
  }
  return tests
}

/** Persistent sweep state: `order` is a permutation of 0..n-1, kept nearly sorted by x_min between steps. */
export interface SweepState {
  readonly order: Int32Array
  readonly active: Int32Array
}

export function createSweepState(count: number): SweepState {
  const order = new Int32Array(count)
  for (let i = 0; i < count; i++) order[i] = i
  return { order, active: new Int32Array(count) }
}

/**
 * Sweep and prune along x. Re-sorts the persistent order by x_min with insertion sort,
 * then sweeps with an active list. A body leaves the list only when x_max < current x_min
 * (strict), so on ties entries come before exits. Returns the number of box tests.
 * Candidate pairs are emitted as (smaller index, larger index).
 */
export function sweepAndPruneCandidates(b: BroadBodies, state: SweepState, emit: CandidateSink): number {
  const n = b.count
  const { order, active } = state
  const { x, r } = b
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
  let tests = 0
  let size = 0
  for (let k = 0; k < n; k++) {
    const cur = order[k]
    const xmin = x[cur] - r[cur]
    let kept = 0
    for (let a = 0; a < size; a++) {
      const o = active[a]
      if (x[o] + r[o] < xmin) continue
      active[kept++] = o
      tests++
      if (boxesOverlap(b, o, cur)) emit(o < cur ? o : cur, o < cur ? cur : o)
    }
    size = kept
    active[size++] = cur
  }
  return tests
}
