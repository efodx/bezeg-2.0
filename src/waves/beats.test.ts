import { describe, expect, it } from 'vitest';
import { beatFrequency, beatProduct, envelope, meanFrequency, signedEnvelope } from './beats';
import { sumAt } from './sinusoid';

const pair = (a: number, f1: number, f2: number) => [
  { amplitude: a, frequency: f1, phase: 0 },
  { amplitude: a, frequency: f2, phase: 0 },
];

describe('beat frequency', () => {
  it('is the exact integer |f1 - f2| and the mean frequency', () => {
    expect(beatFrequency(10, 12)).toBe(2);
    expect(beatFrequency(12, 10)).toBe(2);
    expect(beatFrequency(10, 11)).toBe(1);
    expect(beatFrequency(7, 7)).toBe(0);
    expect(meanFrequency(10, 12)).toBe(11);
  });

  it('equals the number of envelope maxima per second, counted on the sampled sum (independent)', () => {
    for (const [f1, f2] of [[10, 12], [10, 11], [20, 22], [3, 6]]) {
      const comps = pair(1, f1, f2);
      const N = 16384;
      // Slowly varying amplitude of the sum: maximum of |sum| in short blocks, then count its local maxima.
      const block = 1024;
      const levels: number[] = [];
      for (let b = 0; b < N / block; b++) {
        let m = 0;
        for (let i = 0; i < block; i++) m = Math.max(m, Math.abs(sumAt(comps, (b * block + i) / N)));
        levels.push(m);
      }
      let peaks = 0;
      for (let i = 0; i < levels.length; i++) {
        const prev = levels[(i - 1 + levels.length) % levels.length];
        const next = levels[(i + 1) % levels.length];
        if (levels[i] > prev && levels[i] >= next && levels[i] > 1.9) peaks++;
      }
      expect(peaks).toBe(beatFrequency(f1, f2));
    }
  });

  it('throws RangeError outside 1..40 Hz or for non-integers', () => {
    for (const bad of [0, 41, 2.5, Number.NaN, -3]) {
      expect(() => beatFrequency(bad, 10)).toThrow(RangeError);
      expect(() => beatFrequency(10, bad)).toThrow(RangeError);
      expect(() => meanFrequency(bad, 10)).toThrow(RangeError);
    }
  });
});

describe('product identity and envelope', () => {
  it('product form equals the direct sum on a grid (sum-to-product oracle)', () => {
    for (const [f1, f2] of [[10, 12], [10, 11], [40, 1], [5, 5], [13, 30]]) {
      for (const a of [1, 0.4, 3]) {
        let worst = 0;
        for (let i = 0; i <= 4000; i++) {
          const t = (2 * i) / 4000;
          const direct = a * Math.cos(2 * Math.PI * f1 * t) + a * Math.cos(2 * Math.PI * f2 * t);
          worst = Math.max(worst, Math.abs(beatProduct(a, f1, f2, t) - direct));
        }
        expect(worst).toBeLessThan(1e-12 * Math.max(1, a));
      }
    }
  });

  it('envelope bounds the sum and touches it where the carrier peaks', () => {
    const comps = pair(1, 10, 12);
    for (let i = 0; i <= 4000; i++) {
      const t = (2 * i) / 4000;
      expect(Math.abs(sumAt(comps, t))).toBeLessThanOrEqual(envelope(1, 10, 12, t) + 1e-12);
    }
  });

  it('reproduces the WV2 numbers', () => {
    expect(envelope(1, 10, 12, 0)).toBeCloseTo(2, 14);
    expect(envelope(1, 10, 12, 0.5)).toBeCloseTo(2, 14);
    expect(envelope(1, 10, 12, 0.25)).toBeLessThan(1e-14);
    // period 0.5 s for df = 2, 1 s for df = 1
    for (const t of [0.05, 0.13, 0.3, 0.41]) {
      expect(envelope(1, 10, 12, t + 0.5)).toBeCloseTo(envelope(1, 10, 12, t), 12);
      expect(envelope(1, 10, 11, t + 1)).toBeCloseTo(envelope(1, 10, 11, t), 12);
    }
    // the envelope is not periodic with half the beat period
    expect(Math.abs(envelope(1, 10, 12, 0.1 + 0.25) - envelope(1, 10, 12, 0.1))).toBeGreaterThan(0.1);
  });

  it('signed factor has frequency df/2 and flips sign at each envelope node', () => {
    // df = 2: signed factor 2 cos(2 pi t), period 1 s; nodes at t = 0.25, 0.75, 1.25
    expect(signedEnvelope(1, 10, 12, 0.1)).toBeCloseTo(signedEnvelope(1, 10, 12, 1.1), 12);
    expect(signedEnvelope(1, 10, 12, 0.1)).toBeCloseTo(-signedEnvelope(1, 10, 12, 0.6), 12);
    for (const node of [0.25, 0.75, 1.25, 1.75]) {
      const before = Math.sign(signedEnvelope(1, 10, 12, node - 1e-3));
      const after = Math.sign(signedEnvelope(1, 10, 12, node + 1e-3));
      expect(before * after).toBe(-1);
      expect(envelope(1, 10, 12, node)).toBeLessThan(1e-14);
    }
  });

  it('is constant 2A when the frequencies are equal', () => {
    expect(envelope(1.5, 8, 8, 0.37)).toBeCloseTo(3, 14);
  });

  it('throws RangeError for out-of-range frequencies', () => {
    expect(() => envelope(1, 10.5, 12, 0)).toThrow(RangeError);
    expect(() => beatProduct(1, 10, 41, 0)).toThrow(RangeError);
    expect(() => signedEnvelope(1, 0, 12, 0)).toThrow(RangeError);
  });
});
