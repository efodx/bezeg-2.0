import { describe, expect, it } from 'vitest';
import { phasorSum, sumAt, valueAt, type Sinusoid } from './sinusoid';

const DEG = Math.PI / 180;

/** Maximum of the sampled sum over one second, refined by golden-section search (independent oracle). */
function sampledMaximum(components: readonly Sinusoid[], perSecond = 2048): number {
  let best = 0;
  let bestT = 0;
  for (let i = 0; i < perSecond; i++) {
    const t = i / perSecond;
    const v = sumAt(components, t);
    if (v > best) {
      best = v;
      bestT = t;
    }
  }
  let lo = bestT - 1 / perSecond;
  let hi = bestT + 1 / perSecond;
  const g = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 80; i++) {
    const a = hi - g * (hi - lo);
    const b = lo + g * (hi - lo);
    if (sumAt(components, a) < sumAt(components, b)) lo = a;
    else hi = b;
  }
  return sumAt(components, (lo + hi) / 2);
}

const wave = (amplitude: number, phase: number, frequency = 3): Sinusoid => ({ amplitude, frequency, phase });

describe('sumAt', () => {
  it('adds the components and an empty list is 0', () => {
    const cs = [wave(1, 0.3, 2), wave(0.5, -1, 7), wave(2, 2, 5)];
    for (const t of [0, 0.1, 0.37, 1.9]) {
      const direct = cs.reduce((s, c) => s + c.amplitude * Math.cos(2 * Math.PI * c.frequency * t + c.phase), 0);
      expect(sumAt(cs, t)).toBeCloseTo(direct, 13);
    }
    expect(sumAt([], 0.5)).toBe(0);
    expect(valueAt(wave(2, 0, 1), 0)).toBe(2);
  });

  it('rejects a non-finite time', () => {
    expect(() => sumAt([wave(1, 0)], Number.NaN)).toThrow(RangeError);
  });
});

describe('phasorSum', () => {
  it('matches the sampled maximum for many amplitudes and phase differences', () => {
    for (const [a1, a2] of [[1, 1], [3, 2], [1, 4], [0.5, 0.5], [2, 0]]) {
      for (let d = 0; d < 360; d += 15) {
        const c1 = wave(a1, 0.2);
        const c2 = wave(a2, 0.2 + d * DEG);
        expect(phasorSum(c1, c2).amplitude).toBeCloseTo(sampledMaximum([c1, c2]), 8);
      }
    }
  });

  it('describes the sum curve: amplitude * cos(2 pi f t + phase) at many points', () => {
    const c1 = wave(3, 0.7, 5);
    const c2 = wave(2, 0.7 + 90 * DEG, 5);
    const s = phasorSum(c1, c2);
    for (let i = 0; i < 200; i++) {
      const t = i / 97;
      expect(valueAt({ amplitude: s.amplitude, frequency: 5, phase: s.phase }, t)).toBeCloseTo(sumAt([c1, c2], t), 12);
    }
  });

  it('reproduces the WV1 numbers', () => {
    const r = (a1: number, a2: number, deg: number) => phasorSum(wave(a1, 0), wave(a2, deg * DEG));
    expect(r(1, 1, 0).amplitude).toBeCloseTo(2, 14);
    expect(r(1, 1, 120).amplitude).toBeCloseTo(1, 14);
    expect(Math.abs(r(1, 1, 180).amplitude)).toBeLessThan(1e-7);
    expect(r(3, 2, 90).amplitude).toBeCloseTo(Math.sqrt(13), 14);
    expect(r(3, 2, 90).amplitude).toBeCloseTo(3.60555, 5);
    expect(r(3, 2, 90).relativePhase / DEG).toBeCloseTo(33.69, 2);
    expect(r(3, 2, 60).amplitude).toBeCloseTo(4.3589, 4);
    expect(r(3, 2, 60).relativePhase / DEG).toBeCloseTo(23.41, 2);
  });

  it('gives |A1 - A2| for opposite phase and A1 + A2 in phase', () => {
    expect(phasorSum(wave(3, 0), wave(2, Math.PI)).amplitude).toBeCloseTo(1, 14);
    expect(phasorSum(wave(3, 0), wave(2, 0)).amplitude).toBeCloseTo(5, 14);
  });

  it('handles zero amplitude and phases at plus or minus pi', () => {
    expect(phasorSum(wave(0, 0), wave(0, 1)).amplitude).toBe(0);
    const s = phasorSum(wave(2, -Math.PI), wave(1, Math.PI));
    expect(s.amplitude).toBeCloseTo(3, 12);
    for (const t of [0, 0.2, 0.9]) {
      expect(valueAt({ amplitude: s.amplitude, frequency: 3, phase: s.phase }, t)).toBeCloseTo(
        sumAt([wave(2, -Math.PI), wave(1, Math.PI)], t),
        12,
      );
    }
  });

  it('throws RangeError for unequal frequencies or non-finite input', () => {
    expect(() => phasorSum(wave(1, 0, 3), wave(1, 0, 4))).toThrow(RangeError);
    expect(() => phasorSum(wave(Number.NaN, 0), wave(1, 0))).toThrow(RangeError);
    expect(() => phasorSum(wave(1, Infinity), wave(1, 0))).toThrow(RangeError);
  });
});
