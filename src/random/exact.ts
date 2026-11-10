// Exact comparators for the simulations (randomness spec, kernel item 4). Independent of the samplers and
// runners: they never draw. Results are doubles labelled "computed"; counts inside are integers or BigInt.
import { binomialMasses } from '../analysis/distributions';

/** Distribution of the walk position after n steps of +-1: position 2k - n has the mass of B(n, 1/2) at k. */
export function walkLaw(n: number): { positions: number[]; masses: number[] } {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const masses = binomialMasses(n, 0.5);
  return { positions: masses.map((_, k) => 2 * k - n), masses };
}

function checkProbability(name: string, value: number): void {
  if (!(value >= 0 && value <= 1)) throw new RangeError(`${name} must be a probability from 0 to 1`);
}

/**
 * Stationary distribution (pi_A, pi_B) = (b, a) / (a + b) of the chain A -> B with probability a and
 * B -> A with probability b. Returns null when a + b = 0 (identity chain, no unique distribution);
 * never divides by zero. a = b = 1 gives (1/2, 1/2) although the distribution after n steps does not converge.
 */
export function markovStationary(a: number, b: number): [number, number] | null {
  checkProbability('a', a);
  checkProbability('b', b);
  const total = a + b;
  if (total === 0) return null;
  return [b / total, a / total];
}

/** Distribution (P(A), P(B)) after n steps from the given start state (0 = A, 1 = B), by repeated multiplication. */
export function markovDistribution(a: number, b: number, start: 0 | 1, n: number): [number, number] {
  checkProbability('a', a);
  checkProbability('b', b);
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
  let pa = start === 0 ? 1 : 0;
  let pb = 1 - pa;
  for (let i = 0; i < n; i++) {
    const nextA = pa * (1 - a) + pb * b;
    const nextB = pa * a + pb * (1 - b);
    pa = nextA;
    pb = nextB;
  }
  return [pa, pb];
}

/**
 * Exact coverage of the interval x_bar +- z sigma / sqrt(n) for n draws from the uniform integers
 * 0 ... populationMax (z a multiple of 0,01). The sum S has an integer count by convolution (BigInt, sliding
 * window); the interval covers the mean iff (2S - populationMax n)^2 * 120000 <= 4 (100 z)^2 (M^2 - 1) n with
 * M = populationMax + 1, an exact integer test. The final division is the only double step.
 * Cost grows with n (BigInt convolution of n copies); the spec's sizes stay at n <= 100.
 */
export function intervalCoverage(populationMax: number, n: number, z: number): number {
  if (!Number.isInteger(populationMax) || populationMax < 1) throw new RangeError('populationMax must be an integer >= 1');
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const zc = Math.round(z * 100);
  if (!(z > 0) || Math.abs(zc - z * 100) > 1e-9) throw new RangeError('z must be a positive multiple of 0.01');
  const size = populationMax + 1;
  let counts: bigint[] = [1n];
  for (let step = 0; step < n; step++) {
    const length = counts.length + populationMax;
    const next: bigint[] = new Array<bigint>(length);
    let window = 0n; // sum of counts[s - populationMax ... s]
    for (let s = 0; s < length; s++) {
      if (s < counts.length) window += counts[s];
      if (s - size >= 0 && s - size < counts.length) window -= counts[s - size];
      next[s] = window;
    }
    counts = next;
  }
  const limit = BigInt(4 * zc * zc * (size * size - 1) * n);
  let covered = 0n;
  for (let s = 0; s < counts.length; s++) {
    const d = BigInt(2 * s - populationMax * n);
    if (d * d * 120000n <= limit) covered += counts[s];
  }
  const total = BigInt(size) ** BigInt(n);
  return Number((covered * 10n ** 18n) / total) / 1e18;
}

/** Law of the number of intervals that miss among `runs` fresh ones, each with probability `miss` (use 1 - intervalCoverage). */
export function missCountLaw(runs: number, miss: number): number[] {
  return binomialMasses(runs, miss);
}
