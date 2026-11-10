import { describe, expect, it } from 'vitest';
import { binomialMasses } from '../analysis/distributions';
import { createPcg32 } from './pcg32';
import {
  insideQuarterDiscUint32,
  intervalCoverLimit,
  runArea,
  runFrequency,
  runGalton,
  runIntervals,
  runMarkov,
  runWalks,
  simulationDigest,
  type Checkpoints,
} from './runners';
import { below, bernoulli, insideQuarterDisc, walkStep } from './samplers';

/** Test helper only: Pearson chi-square of integer counts against masses. */
function chiSquare(counts: ArrayLike<number>, masses: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < counts.length; i++) total += counts[i];
  let sum = 0;
  for (let i = 0; i < masses.length; i++) sum += (counts[i] - total * masses[i]) ** 2 / (total * masses[i]);
  return sum;
}

const array = (a: ArrayLike<number>) => Array.from(a);

describe('runners reproduce the spec tallies at seed 42', () => {
  it('RS1 Galton: 10 rows, p = 1/2, 1000 balls', () => {
    const out = new Uint32Array(11);
    runGalton(42, 10, 50, 1000, out);
    expect(array(out)).toEqual([0, 12, 38, 118, 218, 229, 207, 125, 42, 11, 0]);
    const masses = binomialMasses(10, 0.5);
    expect(masses[5]).toBeCloseTo(252 / 1024, 12);
    const largest = Math.max(...array(out).map((c, k) => Math.abs(c / 1000 - masses[k])));
    expect(largest.toFixed(4)).toBe('0.0171');
    expect(chiSquare(out, masses).toFixed(2)).toBe('6.06');
  });

  it('RS1 Galton: 10^5 balls, largest bar difference 0,0011', () => {
    const out = new Uint32Array(11);
    runGalton(42, 10, 50, 100000, out);
    const masses = binomialMasses(10, 0.5);
    const largest = Math.max(...array(out).map((c, k) => Math.abs(c / 100000 - masses[k])));
    expect(largest.toFixed(4)).toBe('0.0011');
  });

  it('RS2 frequency: heads after 10, 100, 1000, 10000 tosses', () => {
    const out = new Uint32Array(1);
    const cp: Checkpoints = { at: [10, 100, 1000, 10000], out: new Uint32Array(4) };
    runFrequency(42, 50, 10000, out, cp);
    expect(array(cp.out)).toEqual([1, 45, 493, 5011]);
    expect(out[0]).toBe(5011);
  });

  it('RS3 area: inside after 100, 1000, 10000 points', () => {
    const out = new Uint32Array(1);
    const cp: Checkpoints = { at: [100, 1000, 10000], out: new Uint32Array(3) };
    runArea(42, 10000, out, cp);
    expect(array(cp.out)).toEqual([76, 779, 7833]);
    expect((4 * 779) / 1000).toBe(3.116);
  });

  it('RS4 walks: 1000 walks of 100 steps', () => {
    const out = new Uint32Array(101);
    const run = runWalks(42, 1000, 100, out);
    expect(Math.sqrt(run.sumSquares / 1000).toFixed(2)).toBe('10.31');
    expect((run.sumAbs / 1000).toFixed(3)).toBe('8.218');
    expect(run.zeros).toBe(68);
    expect(out[50]).toBe(68);
    expect(array(out).reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('RS5 Markov: share of time in A, a = 30 %, b = 60 %, start A', () => {
    const out = new Uint32Array(2);
    const cp: Checkpoints = { at: [100, 1000, 10000], out: new Uint32Array(3) };
    runMarkov(42, 30, 60, 0, 10000, out, cp);
    expect(array(cp.out)).toEqual([71, 660, 6713]);
    expect(out[0] + out[1]).toBe(10000);
  });

  it('RS6 intervals: 100 intervals miss at 21 and 28; 10 000 intervals miss 524; no rejections', () => {
    const missed = new Uint8Array(100);
    const hundred = runIntervals(42, 100, 36, missed);
    const numbers = array(missed).flatMap((m, r) => (m ? [r + 1] : []));
    expect(numbers).toEqual([21, 28]);
    expect(hundred.misses).toBe(2);
    expect(hundred.rejections).toBe(0);
    expect(hundred.draws).toBe(3600);
    const many = runIntervals(42, 10000, 36, new Uint8Array(10000));
    expect(many.misses).toBe(524);
    expect(many.rejections).toBe(0);
    expect(many.draws).toBe(360000);
  });

  it('RS6 coverage is the integer test |S - 1782| <= 339 with no tie case', () => {
    expect(intervalCoverLimit(36)).toBe(2 * 339);
    // the double 339,465 never lands on an integer S, so the integer bound is unambiguous
    expect(Math.floor(1.96 * Math.sqrt(9999 / 12 / 36) * 36)).toBe(339);
    // an independent recomputation of the 100-interval run from the sampler, with the explicit bound
    const rng = createPcg32(42);
    const missedRuns: number[] = [];
    for (let r = 1; r <= 100; r++) {
      let s = 0;
      for (let i = 0; i < 36; i++) s += below(rng, 100).value;
      if (Math.abs(s - 1782) > 339) missedRuns.push(r);
    }
    expect(missedRuns).toEqual([21, 28]);
    // neighbours of the bound: a sum with deviation 339 covers, 340 misses
    expect(Math.abs(1782 + 339 - 1782) <= 339).toBe(true);
    expect(Math.abs(1782 + 340 - 1782) <= 339).toBe(false);
  });
});

describe('runners agree with the samplers (one definition of each decision)', () => {
  it('Galton, frequency and Markov equal naive bernoulli loops', () => {
    const rng = createPcg32(7);
    const slots = new Array<number>(13).fill(0);
    for (let b = 0; b < 500; b++) {
      let k = 0;
      for (let r = 0; r < 12; r++) if (bernoulli(rng, 35).value) k++;
      slots[k]++;
    }
    const out = new Uint32Array(13);
    runGalton(7, 12, 35, 500, out);
    expect(array(out)).toEqual(slots);

    const rng2 = createPcg32(8);
    let state = 1;
    let inA = 0;
    for (let i = 0; i < 2000; i++) {
      const move = bernoulli(rng2, state === 0 ? 45 : 15).value;
      if (move) state = 1 - state;
      if (state === 0) inA++;
    }
    const m = new Uint32Array(2);
    runMarkov(8, 45, 15, 1, 2000, m);
    expect(m[0]).toBe(inA);

    const rng3 = createPcg32(9);
    let heads = 0;
    for (let i = 0; i < 1000; i++) if (bernoulli(rng3, 90).value) heads++;
    const h = new Uint32Array(1);
    runFrequency(9, 90, 1000, h);
    expect(h[0]).toBe(heads);
  });

  it('area equals the BigInt sampler, and the double-limb test equals BigInt on edge values', () => {
    const rng = createPcg32(11);
    let inside = 0;
    for (let i = 0; i < 3000; i++) if (insideQuarterDisc(rng).value) inside++;
    const out = new Uint32Array(1);
    runArea(11, 3000, out);
    expect(out[0]).toBe(inside);
    const edges = [0, 1, 65535, 65536, 2147483647, 2147483648, 3037000499, 3037000500, 4294967295];
    for (const x of edges) {
      for (const y of edges) {
        expect(insideQuarterDiscUint32(x, y)).toBe(BigInt(x) ** 2n + BigInt(y) ** 2n < 1n << 64n);
      }
    }
  });

  it('walks equal a walkStep loop', () => {
    const rng = createPcg32(5);
    const ends = new Array<number>(41).fill(0);
    for (let w = 0; w < 300; w++) {
      let s = 0;
      for (let i = 0; i < 40; i++) s += walkStep(rng).value;
      ends[(s + 40) / 2]++;
    }
    const out = new Uint32Array(41);
    runWalks(5, 300, 40, out);
    expect(array(out)).toEqual(ends);
  });

  it('intervals equal a below loop, including draws', () => {
    const rng = createPcg32(3);
    const missed: number[] = [];
    let draws = 0;
    for (let r = 0; r < 400; r++) {
      let s = 0;
      for (let i = 0; i < 16; i++) {
        const sample = below(rng, 100);
        s += sample.value;
        draws += sample.draws;
      }
      missed.push(Math.abs(2 * s - 99 * 16) > intervalCoverLimit(16) ? 1 : 0);
    }
    const out = new Uint8Array(400);
    const run = runIntervals(3, 400, 16, out);
    expect(array(out)).toEqual(missed);
    expect(run.draws).toBe(draws);
  });
});

describe('prefix property, repeatability and the digest', () => {
  it('first n trials of a longer run equal the run of n', () => {
    const long = { g: new Uint32Array(11), cp: new Uint32Array(3) };
    runGalton(42, 10, 50, 1000, long.g, { at: [10, 100, 1000], out: long.cp });
    for (const n of [10, 100]) {
      const short = new Uint32Array(11);
      runGalton(42, 10, 50, n, short);
      // total rights of the short run equals the long run's checkpoint at n
      const rights = array(short).reduce((s, c, k) => s + c * k, 0);
      expect(rights).toBe(long.cp[n === 10 ? 0 : 1]);
    }
    const f = new Uint32Array(1);
    const fcp: Checkpoints = { at: [10, 100, 1000], out: new Uint32Array(3) };
    runFrequency(42, 50, 1000, f, fcp);
    for (const [i, n] of [10, 100, 1000].entries()) {
      runFrequency(42, 50, n, f);
      expect(f[0]).toBe(fcp.out[i]);
    }
    const a = new Uint32Array(1);
    const acp: Checkpoints = { at: [100, 1000], out: new Uint32Array(2) };
    runArea(42, 1000, a, acp);
    runArea(42, 100, a);
    expect(a[0]).toBe(acp.out[0]);
    const m = new Uint32Array(2);
    const mcp: Checkpoints = { at: [100, 1000], out: new Uint32Array(2) };
    runMarkov(42, 30, 60, 0, 1000, m, mcp);
    runMarkov(42, 30, 60, 0, 100, m);
    expect(m[0]).toBe(mcp.out[0]);
    const w = new Uint32Array(101);
    const wcp: Checkpoints = { at: [100, 1000], out: new Uint32Array(2) };
    runWalks(42, 1000, 100, w, wcp);
    expect(runWalks(42, 100, 100, w).zeros).toBe(wcp.out[0]);
    const flags = new Uint8Array(100);
    const icp: Checkpoints = { at: [21, 28, 100], out: new Uint32Array(3) };
    runIntervals(42, 100, 36, flags, icp);
    expect(array(icp.out)).toEqual([1, 2, 2]);
    const prefix = new Uint8Array(30);
    runIntervals(42, 30, 36, prefix);
    expect(array(prefix)).toEqual(array(flags).slice(0, 30));
  });

  it('changing n from 1000 to 100 and back restores the same tally; repeated calls are identical', () => {
    const first = new Uint32Array(11);
    const again = new Uint32Array(11);
    runGalton(42, 10, 50, 1000, first);
    runGalton(42, 10, 50, 100, again);
    runGalton(42, 10, 50, 1000, again);
    expect(array(again)).toEqual(array(first));
    expect(simulationDigest(42, 200)).toBe(simulationDigest(42, 200));
    expect(simulationDigest(42, 200)).not.toBe(simulationDigest(43, 200));
  });

  it('simulationDigest is stable', () => {
    expect(simulationDigest(42, 1000)).toBe(
      'galton=0,12,38,118,218,229,207,125,42,11,0;heads=493;inside=779;walk=' +
        '106364/8218/68;markovA=660;misses=39',
    );
  });

  it('rejects bad arguments', () => {
    expect(() => runGalton(42, 10, 50, 10, new Uint32Array(5))).toThrow(RangeError);
    expect(() => runFrequency(42, 101, 10, new Uint32Array(1))).toThrow(RangeError);
    expect(() => runArea(42, 10, new Uint32Array(1), { at: [11], out: new Uint32Array(1) })).toThrow(RangeError);
  });
});

describe('statistical checks use a fixed seed and a tolerance from the exact law', () => {
  it('Galton slot counts are within 5 sigma of the binomial', () => {
    const out = new Uint32Array(11);
    const n = 20000;
    runGalton(42, 10, 50, n, out);
    const masses = binomialMasses(10, 0.5);
    for (let k = 0; k <= 10; k++) {
      const sigma = Math.sqrt(n * masses[k] * (1 - masses[k]));
      expect(Math.abs(out[k] - n * masses[k])).toBeLessThan(5 * sigma);
    }
  });

  it('heads, area and walk ends are within 5 sigma', () => {
    const f = new Uint32Array(1);
    runFrequency(42, 50, 10000, f);
    expect(Math.abs(f[0] - 5000)).toBeLessThan(5 * 50);
    const a = new Uint32Array(1);
    runArea(42, 10000, a);
    const p = Math.PI / 4;
    expect(Math.abs(a[0] - 10000 * p)).toBeLessThan(5 * Math.sqrt(10000 * p * (1 - p)));
    const w = new Uint32Array(101);
    const run = runWalks(42, 1000, 100, w);
    const q = binomialMasses(100, 0.5)[50];
    expect(Math.abs(run.zeros - 1000 * q)).toBeLessThan(5 * Math.sqrt(1000 * q * (1 - q)));
  });

  it('Markov share of time in A is near b / (a + b) = 2/3', () => {
    const out = new Uint32Array(2);
    runMarkov(42, 30, 60, 0, 10000, out);
    // correlated steps: tolerance 5 sigma of an independent share, a loose bound for the chain
    expect(Math.abs(out[0] - 6667)).toBeLessThan(5 * Math.sqrt(10000 * (2 / 3) * (1 / 3)));
  });
});
