// Batch runners (randomness spec, kernel item 3; ADR 0049 sections 2-3).
// Every runner draws from createPcg32(seed), keeps integer tallies in a caller-supplied typed array and
// allocates nothing per trial. Decisions are integer comparisons identical to samplers.ts (tests compare
// each runner with a naive loop over the samplers); the inline forms only avoid the sampler result objects
// and BigInt. A run of n trials is the first n trials of any longer run from the same seed (prefix property).
import { createPcg32 } from './pcg32';
import { bernoulliThreshold } from './samplers';

const TWO16 = 65536;
const TWO32 = 4294967296;

/**
 * Running tally after chosen trial counts: `out[i]` is the primary tally after `at[i]` trials
 * (ascending, each at most n). Primary tally per runner: Galton, total right bounces; Frequency, heads;
 * Area, points inside; Walks, walks ending at 0; Markov, steps spent in A; Intervals, misses.
 */
export interface Checkpoints {
  at: ArrayLike<number>;
  out: Uint32Array;
}

export interface RunSummary {
  /** Trials completed (= n). */
  trials: number;
  /** uint32 draws consumed from the generator. */
  draws: number;
}

function checkCount(name: string, value: number, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
}

function checkBuffer(buffer: ArrayLike<number>, length: number): void {
  if (buffer.length < length) throw new RangeError(`output buffer needs length ${length}`);
}

function checkCheckpoints(cp: Checkpoints | undefined, n: number): void {
  if (!cp) return;
  checkBuffer(cp.out, cp.at.length);
  let previous = 0;
  for (let i = 0; i < cp.at.length; i++) {
    const c = cp.at[i];
    if (!Number.isInteger(c) || c < previous || c > n) {
      throw new RangeError('checkpoints must be ascending integers from 0 to n');
    }
    previous = c;
  }
}

/** Writes the primary tally at every checkpoint equal to `done` trials. Returns the next checkpoint index. */
function record(cp: Checkpoints | undefined, index: number, done: number, tally: number): number {
  if (!cp) return index;
  while (index < cp.at.length && cp.at[index] === done) cp.out[index++] = tally;
  return index;
}

/** Galton board: `rows` pegs, each ball goes right with probability pPercent/100. out[k] = balls in slot k. */
export function runGalton(
  seed: number,
  rows: number,
  pPercent: number,
  n: number,
  out: Uint32Array,
  cp?: Checkpoints,
): RunSummary {
  checkCount('rows', rows, 1, 64);
  checkCount('n', n, 0, 2 ** 31);
  checkBuffer(out, rows + 1);
  checkCheckpoints(cp, n);
  const threshold = bernoulliThreshold(pPercent);
  const rng = createPcg32(seed);
  out.fill(0, 0, rows + 1);
  let rights = 0;
  let ci = record(cp, 0, 0, 0);
  for (let ball = 1; ball <= n; ball++) {
    let slot = 0;
    for (let r = 0; r < rows; r++) if (rng.next() < threshold) slot++;
    out[slot]++;
    rights += slot;
    ci = record(cp, ci, ball, rights);
  }
  return { trials: n, draws: n * rows };
}

/** Coin tosses: out[0] = heads (draw < threshold of pPercent/100). */
export function runFrequency(
  seed: number,
  pPercent: number,
  n: number,
  out: Uint32Array,
  cp?: Checkpoints,
): RunSummary {
  checkCount('n', n, 0, 2 ** 31);
  checkBuffer(out, 1);
  checkCheckpoints(cp, n);
  const threshold = bernoulliThreshold(pPercent);
  const rng = createPcg32(seed);
  let heads = 0;
  let ci = record(cp, 0, 0, 0);
  for (let i = 1; i <= n; i++) {
    if (rng.next() < threshold) heads++;
    ci = record(cp, ci, i, heads);
  }
  out[0] = heads;
  return { trials: n, draws: n };
}

/**
 * x^2 + y^2 < 2^64 for uint32 x, y, in exact double arithmetic (no BigInt). With x = xh 2^16 + xl:
 * x^2 + y^2 = H 2^32 + T, H = xh^2 + yh^2 < 2^33, T = 2 (xh xl + yh yl) 2^16 + xl^2 + yl^2 < 2^51,
 * so the sum is below 2^64 iff H + floor(T / 2^32) < 2^32.
 */
export function insideQuarterDiscUint32(x: number, y: number): boolean {
  const xh = Math.floor(x / TWO16);
  const xl = x - xh * TWO16;
  const yh = Math.floor(y / TWO16);
  const yl = y - yh * TWO16;
  const high = xh * xh + yh * yh;
  const t = 2 * (xh * xl + yh * yl) * TWO16 + xl * xl + yl * yl;
  return high + Math.floor(t / TWO32) < TWO32;
}

/** Monte Carlo area: n points (two draws each); out[0] = points inside the quarter disc. */
export function runArea(seed: number, n: number, out: Uint32Array, cp?: Checkpoints): RunSummary {
  checkCount('n', n, 0, 2 ** 30);
  checkBuffer(out, 1);
  checkCheckpoints(cp, n);
  const rng = createPcg32(seed);
  let inside = 0;
  let ci = record(cp, 0, 0, 0);
  for (let i = 1; i <= n; i++) {
    const x = rng.next();
    const y = rng.next();
    if (insideQuarterDiscUint32(x, y)) inside++;
    ci = record(cp, ci, i, inside);
  }
  out[0] = inside;
  return { trials: n, draws: 2 * n };
}

export interface WalkSummary extends RunSummary {
  /** Sum of S^2 over the walks (integer). */
  sumSquares: number;
  /** Sum of |S| over the walks (integer). */
  sumAbs: number;
  /** Walks ending at 0. */
  zeros: number;
}

/**
 * `walks` random walks of `steps` steps (+1 when the top bit of the draw is set). out[k] = walks with
 * k up-steps, i.e. ending at 2k - steps. Checkpoints count walks, primary tally = walks ending at 0.
 * The sign convention matches samplers.walkStep and is arbitrary: the RS4 numbers (rms, mean |S|, zeros)
 * are sign-invariant, and the spec's reference script used the opposite sign.
 */
export function runWalks(
  seed: number,
  walks: number,
  steps: number,
  out: Uint32Array,
  cp?: Checkpoints,
): WalkSummary {
  checkCount('walks', walks, 0, 2 ** 20);
  checkCount('steps', steps, 1, 4096);
  checkBuffer(out, steps + 1);
  checkCheckpoints(cp, walks);
  const rng = createPcg32(seed);
  out.fill(0, 0, steps + 1);
  let sumSquares = 0;
  let sumAbs = 0;
  let zeros = 0;
  let ci = record(cp, 0, 0, 0);
  for (let w = 1; w <= walks; w++) {
    let ups = 0;
    for (let s = 0; s < steps; s++) if (rng.next() >>> 31 === 1) ups++;
    out[ups]++;
    const position = 2 * ups - steps;
    sumSquares += position * position;
    sumAbs += Math.abs(position);
    if (position === 0) zeros++;
    ci = record(cp, ci, w, zeros);
  }
  return { trials: walks, draws: walks * steps, sumSquares, sumAbs, zeros };
}

/**
 * Two-state chain, states 0 (A) and 1 (B), one draw per step on both branches. From A to B with
 * probability aPercent/100, from B to A with bPercent/100. out[0], out[1] = steps spent in A, B after
 * each of the n transitions (the start is not counted). Checkpoint tally = steps in A.
 */
export function runMarkov(
  seed: number,
  aPercent: number,
  bPercent: number,
  start: 0 | 1,
  n: number,
  out: Uint32Array,
  cp?: Checkpoints,
): RunSummary {
  checkCount('n', n, 0, 2 ** 31);
  checkCount('start', start, 0, 1);
  checkBuffer(out, 2);
  checkCheckpoints(cp, n);
  const leaveA = bernoulliThreshold(aPercent);
  const leaveB = bernoulliThreshold(bPercent);
  const rng = createPcg32(seed);
  let state: number = start;
  let inA = 0;
  let ci = record(cp, 0, 0, 0);
  for (let i = 1; i <= n; i++) {
    const u = rng.next();
    if (state === 0) {
      if (u < leaveA) state = 1;
    } else if (u < leaveB) {
      state = 0;
    }
    if (state === 0) inA++;
    ci = record(cp, ci, i, inA);
  }
  out[0] = inA;
  out[1] = n - inA;
  return { trials: n, draws: n };
}

/** Population of the interval lesson: uniform integers 0 ... 99 (spec RS6). */
export const INTERVAL_POPULATION_SIZE = 100;
/** z = 1,96 in hundredths. */
export const INTERVAL_Z_HUNDREDTHS = 196;

/**
 * Largest integer L with |2S - 99 n| <= L meaning "the interval contains the mean" for the sum S of n
 * draws from 0 ... 99. Exact: (2S - 99n)^2 <= 4 z^2 var n with var = (100^2 - 1) / 12, z = 196/100, i.e.
 * d^2 * 120000 <= 4 * 196^2 * 9999 * n, all integers. For n = 36, L = 678, i.e. |S - 1782| <= 339.
 */
export function intervalCoverLimit(sampleSize: number): number {
  checkCount('sampleSize', sampleSize, 1, 100000);
  const zz = INTERVAL_Z_HUNDREDTHS * INTERVAL_Z_HUNDREDTHS;
  const m = INTERVAL_POPULATION_SIZE;
  const rhs = BigInt(4 * zz * (m * m - 1) * sampleSize);
  let limit = Number(BigInt(Math.floor(Math.sqrt(Number(rhs) / 120000))));
  while (BigInt(limit) ** 2n * 120000n > rhs) limit--;
  while (BigInt(limit + 1) ** 2n * 120000n <= rhs) limit++;
  return limit;
}

/**
 * Lemire bounded integer for 1 <= m <= 2^21 in exact doubles (x m < 2^53), same results and draws as
 * samplers.below: reject while the low word is below 2^32 mod m. Module-private; callers must keep
 * m <= 2^21 (exactness depends on it). Add a range check before exporting it.
 */
function belowSmall(rng: { next(): number }, m: number, reject: number): number {
  for (;;) {
    const product = rng.next() * m;
    const high = Math.floor(product / TWO32);
    const low = product - high * TWO32;
    if (low >= reject) return high; // reject < m, so this also covers the fast path low >= m
  }
}

/**
 * Confidence intervals: `runs` samples of `sampleSize` draws from 0 ... 99; a run misses when the integer
 * test |2S - 99 n| <= L fails. out[r] = 1 when run r missed. Checkpoint tally = misses so far.
 * Returns misses and the number of Lemire rejections (the spec expects 0 at seed 42).
 */
export function runIntervals(
  seed: number,
  runs: number,
  sampleSize: number,
  out: Uint8Array,
  cp?: Checkpoints,
): RunSummary & { misses: number; rejections: number } {
  checkCount('runs', runs, 0, 2 ** 24);
  checkBuffer(out, runs);
  checkCheckpoints(cp, runs);
  const limit = intervalCoverLimit(sampleSize);
  const m = INTERVAL_POPULATION_SIZE;
  const reject = TWO32 % m;
  const center = (m - 1) * sampleSize;
  const rng = createPcg32(seed);
  let misses = 0;
  let draws = 0;
  let ci = record(cp, 0, 0, 0);
  const counting = { next: () => (draws++, rng.next()) };
  for (let r = 1; r <= runs; r++) {
    let sum = 0;
    for (let i = 0; i < sampleSize; i++) sum += belowSmall(counting, m, reject);
    const deviation = 2 * sum - center;
    const miss = deviation > limit || deviation < -limit ? 1 : 0;
    out[r - 1] = miss;
    misses += miss;
    ci = record(cp, ci, r, misses);
  }
  return { trials: runs, draws, misses, rejections: draws - runs * sampleSize };
}

/** Compact, stable text of the default tallies of every runner for one seed and trial count. */
export function simulationDigest(seed: number, n: number): string {
  const galton = new Uint32Array(11);
  runGalton(seed, 10, 50, n, galton);
  const heads = new Uint32Array(1);
  runFrequency(seed, 50, n, heads);
  const inside = new Uint32Array(1);
  runArea(seed, n, inside);
  const ends = new Uint32Array(101);
  const walk = runWalks(seed, n, 100, ends);
  const markov = new Uint32Array(2);
  runMarkov(seed, 30, 60, 0, n, markov);
  const missed = new Uint8Array(n);
  const intervals = runIntervals(seed, n, 36, missed);
  return [
    `galton=${galton.join(',')}`,
    `heads=${heads[0]}`,
    `inside=${inside[0]}`,
    `walk=${walk.sumSquares}/${walk.sumAbs}/${walk.zeros}`,
    `markovA=${markov[0]}`,
    `misses=${intervals.misses}`,
  ].join(';');
}
