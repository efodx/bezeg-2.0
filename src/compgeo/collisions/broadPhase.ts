export type BroadPhaseMethod = 'naive' | 'sweep'

/**
 * Body arrays read by the broad phase. A body's box is [x-hx, x+hx] x [y-hy, y+hy], closed. Circles have hx = hy = r;
 * when `hx` and `hy` are absent they default to `r`, and a circle world sets both to its `r` array itself (no copy),
 * so circle costs are unchanged. Polygon worlds carry their own half-extents (`r` is then unused by the broad phase).
 */
export interface BroadBodies {
  readonly count: number
  readonly x: Float64Array
  readonly y: Float64Array
  readonly r: Float64Array
  readonly hx?: Float64Array
  readonly hy?: Float64Array
}

function overlap(x: Float64Array, y: Float64Array, hx: Float64Array, hy: Float64Array, i: number, j: number): boolean {
  const hxi = hx[i]
  const hxj = hx[j]
  const hyi = hy[i]
  const hyj = hy[j]
  return x[i] - hxi <= x[j] + hxj && x[j] - hxj <= x[i] + hxi && y[i] - hyi <= y[j] + hyj && y[j] - hyj <= y[i] + hyi
}

/** Closed box overlap of bodies i and j: shared edges and corners count. */
export function boxesOverlap(b: BroadBodies, i: number, j: number): boolean {
  return overlap(b.x, b.y, b.hx ?? b.r, b.hy ?? b.r, i, j)
}

export type CandidateSink = (i: number, j: number) => void

/** Every pair i<j gets one box test. Returns the number of box tests (n(n-1)/2). */
export function naiveCandidates(b: BroadBodies, emit: CandidateSink): number {
  const n = b.count
  const { x, y } = b
  const hx = b.hx ?? b.r
  const hy = b.hy ?? b.r
  let tests = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      tests++
      if (overlap(x, y, hx, hy, i, j)) emit(i, j)
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
  const { x, y } = b
  const hx = b.hx ?? b.r
  const hy = b.hy ?? b.r
  for (let k = 1; k < n; k++) {
    const id = order[k]
    const key = x[id] - hx[id]
    let m = k - 1
    while (m >= 0 && x[order[m]] - hx[order[m]] > key) {
      order[m + 1] = order[m]
      m--
    }
    order[m + 1] = id
  }
  let tests = 0
  let size = 0
  for (let k = 0; k < n; k++) {
    const cur = order[k]
    const xmin = x[cur] - hx[cur]
    let kept = 0
    for (let a = 0; a < size; a++) {
      const o = active[a]
      if (x[o] + hx[o] < xmin) continue
      active[kept++] = o
      tests++
      if (overlap(x, y, hx, hy, o, cur)) emit(o < cur ? o : cur, o < cur ? cur : o)
    }
    size = kept
    active[size++] = cur
  }
  return tests
}
