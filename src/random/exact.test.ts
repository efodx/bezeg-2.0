import { describe, expect, it } from 'vitest';
import { binomialMasses } from '../analysis/distributions';
import { intervalCoverage, markovDistribution, markovStationary, missCountLaw, walkLaw } from './exact';
import { runIntervals } from './runners';

const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0);

describe('markovStationary', () => {
  it('is (b, a) / (a + b), the left eigenvector', () => {
    for (const [a, b] of [[0.3, 0.6], [0.05, 0.95], [1, 1], [0.2, 1], [0.5, 0.5]] as const) {
      const pi = markovStationary(a, b)!;
      // pi P = pi with P = [[1-a, a], [b, 1-b]]
      expect(pi[0] * (1 - a) + pi[1] * b).toBeCloseTo(pi[0], 14);
      expect(pi[0] * a + pi[1] * (1 - b)).toBeCloseTo(pi[1], 14);
      expect(pi[0] + pi[1]).toBeCloseTo(1, 14);
    }
    const spec = markovStationary(0.3, 0.6)!;
    expect(spec[0]).toBeCloseTo(2 / 3, 14);
    expect(spec[1]).toBeCloseTo(1 / 3, 14);
  });

  it('agrees with 1000 matrix steps from either start', () => {
    for (const [a, b] of [[0.3, 0.6], [0.05, 0.95], [0.9, 0.4]] as const) {
      const pi = markovStationary(a, b)!;
      for (const start of [0, 1] as const) {
        const [pa, pb] = markovDistribution(a, b, start, 1000);
        expect(pa).toBeCloseTo(pi[0], 12);
        expect(pb).toBeCloseTo(pi[1], 12);
      }
    }
  });

  it('edge cases: identity chain has none, a = b = 1 gives (1/2, 1/2) but oscillates', () => {
    expect(markovStationary(0, 0)).toBeNull();
    expect(markovStationary(1, 1)).toEqual([0.5, 0.5]);
    expect(markovDistribution(1, 1, 0, 1000)).toEqual([1, 0]);
    expect(markovDistribution(1, 1, 0, 1001)).toEqual([0, 1]);
    expect(() => markovStationary(-0.1, 0.5)).toThrow(RangeError);
  });
});

describe('markovDistribution', () => {
  it('matches repeated multiplication by the transition matrix and the closed form', () => {
    const a = 0.3;
    const b = 0.6;
    let row: [number, number] = [1, 0];
    for (let n = 0; n <= 8; n++) {
      const got = markovDistribution(a, b, 0, n);
      expect(got[0]).toBeCloseTo(row[0], 14);
      expect(got[1]).toBeCloseTo(row[1], 14);
      expect(got[0]).toBeCloseTo(2 / 3 + (1 / 3) * 0.1 ** n, 12);
      row = [row[0] * (1 - a) + row[1] * b, row[0] * a + row[1] * (1 - b)];
    }
    expect([1, 2, 3, 4, 5].map((n) => markovDistribution(a, b, 0, n)[0].toFixed(5))).toEqual([
      '0.70000', '0.67000', '0.66700', '0.66670', '0.66667',
    ]);
  });
});

describe('walkLaw', () => {
  it('equals full enumeration of all 2^n step sequences for n <= 16', () => {
    for (let n = 1; n <= 16; n++) {
      const counts = new Map<number, number>();
      for (let mask = 0; mask < 1 << n; mask++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += (mask >> i) & 1 ? 1 : -1;
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      const law = walkLaw(n);
      expect(law.positions.length).toBe(n + 1);
      law.positions.forEach((position, k) => {
        expect(law.masses[k]).toBeCloseTo((counts.get(position) ?? 0) / 2 ** n, 13);
      });
      expect(sum(law.masses)).toBeCloseTo(1, 12);
    }
  });

  it('RS4 numbers: P(S_100 = 0) and E|S_100|', () => {
    const law = walkLaw(100);
    expect(law.masses[50]).toBeCloseTo(0.0796, 4);
    const mean = law.masses.reduce((s, m, k) => s + m * Math.abs(law.positions[k]), 0);
    expect(mean.toFixed(4)).toBe('7.9589');
    expect(walkLaw(7).positions).toEqual([-7, -5, -3, -1, 1, 3, 5, 7]);
  });
});

describe('intervalCoverage', () => {
  it('equals direct enumeration for a 4-value population and n = 3', () => {
    // values 0 ... 3, mean 1,5, variance (16 - 1)/12; interval covers iff |S - 4,5| <= z sqrt(15/12 * 3)
    for (const z of [0.5, 1, 1.28, 1.96, 3]) {
      let covered = 0;
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          for (let c = 0; c < 4; c++) {
            const s = a + b + c;
            // exact in integers: (2S - 9)^2 * 12 * 10^4 <= 4 (100 z)^2 (16 - 1) 3
            const zc = Math.round(z * 100);
            if ((2 * s - 9) ** 2 * 120000 <= 4 * zc * zc * 15 * 3) covered++;
          }
        }
      }
      expect(intervalCoverage(3, 3, z)).toBeCloseTo(covered / 64, 15);
    }
    // a value checked by hand: z = 1 gives half-width sqrt(3,75) = 1,936, so S = 3 ... 6 cover
    // S counts for 0 ... 3: 1, 3, 6, 10, 12, 12, 10, 6, 3, 1 over 64; 3 ... 6 : 10 + 12 + 12 + 10 = 44
    expect(intervalCoverage(3, 3, 1)).toBeCloseTo(44 / 64, 15);
  });

  it('RS6 numbers: 0,95030 at n = 36, 0,95083 at 16, 0,94999 at 100, 0,962 at 2, always 1 at 1', () => {
    expect(intervalCoverage(99, 36, 1.96).toFixed(5)).toBe('0.95030');
    expect(intervalCoverage(99, 16, 1.96).toFixed(5)).toBe('0.95083');
    expect(intervalCoverage(99, 100, 1.96).toFixed(5)).toBe('0.94999');
    expect(intervalCoverage(99, 2, 1.96).toFixed(3)).toBe('0.962');
    expect(intervalCoverage(99, 1, 1.96)).toBe(1);
  });

  it('rejects unsupported arguments', () => {
    expect(() => intervalCoverage(99, 36, 1.955)).toThrow(RangeError);
    expect(() => intervalCoverage(0, 3, 1)).toThrow(RangeError);
  });
});

describe('missCountLaw', () => {
  it('sums to 1 and uses 1 - coverage', () => {
    const miss = 1 - intervalCoverage(99, 36, 1.96);
    expect(miss.toFixed(5)).toBe('0.04970');
    const law = missCountLaw(100, miss);
    expect(law.length).toBe(101);
    expect(sum(law)).toBeCloseTo(1, 12);
    expect(sum(law.slice(0, 3)).toFixed(4)).toBe('0.1208');
    expect(sum(law.slice(10)).toFixed(4)).toBe('0.0272');
    expect(law).toEqual(binomialMasses(100, miss));
  });

  it('the simulated miss count at seed 42 lies within 5 sigma of the exact law', () => {
    const miss = 1 - intervalCoverage(99, 36, 1.96);
    const runs = 1000;
    const { misses } = runIntervals(42, runs, 36, new Uint8Array(runs));
    const sigma = Math.sqrt(runs * miss * (1 - miss));
    expect(Math.abs(misses - runs * miss)).toBeLessThan(5 * sigma);
  });
});
