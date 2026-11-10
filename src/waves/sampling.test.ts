import { describe, expect, it } from 'vitest';
import { alias, linearJoinError, nyquistRelation, reconstruct, sample, sincError, sincInterpolate } from './sampling';
import { sumAt, type Sinusoid } from './sinusoid';

const tone = (f: number, phase = 0.4, amplitude = 1): Sinusoid => ({ amplitude, frequency: f, phase });

/**
 * Independent oracle by brute force on the samples: integer candidates g in [-fs/2, fs/2]
 * whose samples of cos(2 pi g n / fs + 0.4) equal those of the tone f (phase 0.4 tells the sign).
 */
function bruteCandidates(f: number, fs: number): number[] {
  const found: number[] = [];
  for (let g = -Math.floor(fs / 2); g <= Math.floor(fs / 2); g++) {
    let same = true;
    for (let n = 0; n < 2 * fs + 3 && same; n++) {
      const a = Math.cos((2 * Math.PI * f * n) / fs + 0.4);
      const b = Math.cos((2 * Math.PI * g * n) / fs + 0.4);
      if (Math.abs(a - b) > 1e-9) same = false;
    }
    if (same) found.push(g);
  }
  return found;
}

describe('alias over the whole grid', () => {
  it('agrees with brute-force sample equality for f 1..40, fs 2..64', () => {
    for (let fs = 2; fs <= 64; fs++) {
      for (let f = 1; f <= 40; f++) {
        const cands = bruteCandidates(f, fs);
        const a = alias(f, fs);
        if (cands.length === 2) {
          // two tones +-fs/2 share the samples: ambiguous, only when 2 r = fs
          expect(a.ambiguous, `f=${f} fs=${fs}`).toBe(true);
          expect(cands).toEqual([-fs / 2, fs / 2]);
        } else {
          expect(cands, `f=${f} fs=${fs}`).toHaveLength(1);
          expect(a.ambiguous, `f=${f} fs=${fs}`).toBe(false);
          if (!a.ambiguous) {
            expect(a.signed, `f=${f} fs=${fs}`).toBe(cands[0]);
            expect(a.magnitude).toBe(Math.abs(cands[0]));
          }
        }
      }
    }
  });

  it('agrees with the spec rule: smallest |g| in (-fs/2, fs/2] with f - g a multiple of fs', () => {
    for (let fs = 2; fs <= 64; fs++) {
      for (let f = 1; f <= 40; f++) {
        let g = Number.NaN;
        for (let c = -fs; c <= fs; c++) {
          if ((f - c) % fs === 0 && (Number.isNaN(g) || Math.abs(c) < Math.abs(g))) g = c;
        }
        const a = alias(f, fs);
        if (a.ambiguous) expect(Math.abs(g)).toBe(fs / 2);
        else expect(a.signed).toBe(g);
      }
    }
  });

  it('reproduces the WV4 defaults and edge cases', () => {
    const s = (f: number, fs: number) => {
      const a = alias(f, fs);
      return a.ambiguous ? 'ambiguous' : a.signed;
    };
    expect(s(23, 24)).toBe(-1);
    expect(s(25, 24)).toBe(1);
    expect(s(9, 12)).toBe(-3);
    expect(s(13, 24)).toBe(-11);
    expect(s(5, 12)).toBe(5);
    expect(s(6, 12)).toBe('ambiguous');
    expect(s(24, 24)).toBe(0);
    expect(s(30, 15)).toBe(0);
    expect(s(1, 2)).toBe('ambiguous');
    expect(s(2, 2)).toBe(0);
    expect(s(3, 2)).toBe('ambiguous');
    expect(s(1, 64)).toBe(1);
  });

  it('throws RangeError for non-integer or out-of-range arguments', () => {
    for (const [f, fs] of [[0, 12], [41, 12], [2.5, 12], [5, 1], [5, 65], [5, 12.5], [Number.NaN, 12], [5, Infinity]]) {
      expect(() => alias(f, fs)).toThrow(RangeError);
    }
    expect(() => nyquistRelation(0, 12)).toThrow(RangeError);
    expect(() => nyquistRelation(5, 65)).toThrow(RangeError);
    expect(() => sample(tone(5), 12, -1)).toThrow(RangeError);
    expect(() => sample(tone(5), 1.5, 3)).toThrow(RangeError);
  });
});

describe('nyquistRelation', () => {
  it('is the exact integer comparison of fs with 2f', () => {
    expect(nyquistRelation(5, 12)).toBe('above');
    expect(nyquistRelation(6, 12)).toBe('at');
    expect(nyquistRelation(7, 12)).toBe('below');
    expect(nyquistRelation(1, 2)).toBe('at');
  });
});

describe('sample and reconstruct', () => {
  it('a tone and its reconstruction have the same samples (grid, 1e-12)', () => {
    for (let fs = 2; fs <= 64; fs += 3) {
      for (let f = 1; f <= 40; f++) {
        for (const phase of [0.4, -Math.PI, Math.PI / 2]) {
          const c = tone(f, phase, 1.7);
          const r = reconstruct(c, fs);
          if (alias(f, fs).ambiguous) {
            expect(r).toBeNull();
            continue;
          }
          const a = sample(c, fs, 3 * fs);
          const b = sample(r as Sinusoid, fs, 3 * fs);
          for (let n = 0; n < a.length; n++) expect(Math.abs(a[n] - b[n])).toBeLessThan(1e-12);
        }
      }
    }
  });

  it('reproduces the WV4 sample agreement for 23 Hz at 24 Hz and keeps the sign', () => {
    const c = tone(23);
    const r = reconstruct(c, 24) as Sinusoid;
    expect(r.frequency).toBe(-1);
    expect(r.phase).toBe(0.4);
    const a = sample(c, 24, 48);
    const b = sample(r, 24, 48);
    for (let n = 0; n < 48; n++) expect(Math.abs(a[n] - b[n])).toBeLessThan(1e-12);
    // dropping the sign would give different samples
    const wrong = sample({ ...r, frequency: 1 }, 24, 48);
    expect(Math.max(...a.map((v, n) => Math.abs(v - wrong[n])))).toBeGreaterThan(0.1);
  });

  it('at 2f = fs the samples depend on the phase (WV5)', () => {
    const s0 = sample(tone(6, 0.4), 12, 6);
    s0.forEach((v, n) => expect(v).toBeCloseTo(Math.cos(0.4) * (n % 2 === 0 ? 1 : -1), 12));
    expect(Math.cos(0.4)).toBeCloseTo(0.9211, 4);
    sample(tone(6, Math.PI / 2), 12, 6).forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-14));
  });

  it('sampling at n / fs is x(n / fs) exactly', () => {
    const c = tone(5, 0.4, 2);
    sample(c, 12, 5).forEach((v, n) => expect(v).toBe(2 * Math.cos(2 * Math.PI * 5 * (n / 12) + 0.4)));
    expect(sample(c, 12, 0)).toEqual([]);
  });
});

describe('interpolation errors (WV5)', () => {
  it('linear join error for 5 Hz at 12 Hz', () => {
    expect(linearJoinError(tone(5, 0.4), 12, 1)).toBeCloseTo(0.7348, 4);
    expect(linearJoinError(tone(5, 0), 12, 1)).toBeCloseTo(0.7183, 4);
  });

  // Window: samples n = -E..fs+E with E = 12, 48, 192, i.e. the window [0, 1] s plus E extra samples each side.
  it('truncated sinc error over t in [0.4, 0.6] falls slowly with the window', () => {
    const c = [tone(5, 0.4)];
    expect(sincError(c, 12, 0.4, 0.6, 12)).toBeCloseTo(0.0253, 5);
    expect(sincError(c, 12, 0.4, 0.6, 48)).toBeCloseTo(0.00858, 5);
    expect(sincError(c, 12, 0.4, 0.6, 192)).toBeCloseTo(0.00234, 5);
  });

  it('sinc interpolation passes through the samples and reports error for sums', () => {
    const sum = [tone(3, 0.1), tone(4, 1, 0.5)];
    for (let n = 0; n <= 12; n++) {
      expect(sincInterpolate(sum, 12, n / 12, 20)).toBeCloseTo(sumAt(sum, n / 12), 12);
    }
    const err = sincError(sum, 12, 0.4, 0.6, 20);
    expect(err).toBeGreaterThan(0);
    expect(err).toBeLessThan(0.5);
  });

  it('throws RangeError for invalid windows', () => {
    expect(() => sincInterpolate([tone(3)], 12, 0.5, -1)).toThrow(RangeError);
    expect(() => sincInterpolate([tone(3)], 12, 0.5, 2, 0)).toThrow(RangeError);
    expect(() => sincError([tone(3)], 12, 0, 1, 2, 0)).toThrow(RangeError);
    expect(() => linearJoinError(tone(3), 1, 1)).toThrow(RangeError);
  });
});
