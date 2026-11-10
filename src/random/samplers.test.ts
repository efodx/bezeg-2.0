import { describe, expect, it } from 'vitest';
import { createPcg32, type Uint32Source } from './pcg32';
import { below, bernoulli, bernoulliThreshold, insideQuarterDisc, walkStep } from './samplers';

/** Generator that replays a script of uint32 values and counts its draws. */
function scripted(values: number[]): Uint32Source & { used: () => number } {
  let i = 0;
  return {
    next() {
      if (i >= values.length) throw new Error('script exhausted');
      return values[i++];
    },
    used: () => i,
  };
}

describe('bernoulli', () => {
  it('threshold equals the integer definition round(p * 2^32) for every percent', () => {
    for (let percent = 0; percent <= 100; percent++) {
      const reference = (2n * BigInt(percent) * 2n ** 32n + 100n) / 200n;
      expect(BigInt(bernoulliThreshold(percent))).toBe(reference);
    }
    expect(bernoulliThreshold(0)).toBe(0);
    expect(bernoulliThreshold(25)).toBe(2 ** 30);
    expect(bernoulliThreshold(50)).toBe(2 ** 31);
    expect(bernoulliThreshold(100)).toBe(2 ** 32);
  });

  it('decides with a strict inequality at the threshold (injected draws)', () => {
    for (const percent of [1, 30, 50, 77, 99]) {
      const t = bernoulliThreshold(percent);
      expect(bernoulli(scripted([t - 1]), percent).value).toBe(true);
      expect(bernoulli(scripted([t]), percent).value).toBe(false);
      expect(bernoulli(scripted([t + 1]), percent).value).toBe(false);
    }
    expect(bernoulli(scripted([0]), 0).value).toBe(false);
    expect(bernoulli(scripted([2 ** 32 - 1]), 100).value).toBe(true);
  });

  it('consumes one draw and rejects invalid percent', () => {
    const rng = scripted([5, 6]);
    expect(bernoulli(rng, 50).draws).toBe(1);
    expect(rng.used()).toBe(1);
    expect(() => bernoulli(rng, 50.5)).toThrow(RangeError);
    expect(() => bernoulli(rng, 101)).toThrow(RangeError);
  });
});

describe('below', () => {
  it('is uniform within 5 sigma over 10^6 draws for m = 100 (seed 42)', () => {
    const n = 1_000_000;
    const m = 100;
    const counts = new Array<number>(m).fill(0);
    const rng = createPcg32(42);
    let draws = 0;
    for (let i = 0; i < n; i++) {
      const s = below(rng, m);
      counts[s.value]++;
      draws += s.draws;
    }
    const sigma = Math.sqrt(n * (1 / m) * (1 - 1 / m));
    for (const c of counts) expect(Math.abs(c - n / m)).toBeLessThanOrEqual(5 * sigma);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(n);
    expect(draws).toBeGreaterThanOrEqual(n);
  });

  it('rejects the lowest 2^32 mod m low words (injected generator)', () => {
    // m = 3: 2^32 mod 3 = 1, so a draw whose low word is 0 (draw 0) is rejected.
    const rng = scripted([0, 5]);
    expect(below(rng, 3)).toEqual({ value: 0, draws: 2 });
    // m = 3 with draw 0 then 2^32 - 1: product low word 2^32 - 3, accepted, value 2.
    expect(below(scripted([0, 2 ** 32 - 1]), 3)).toEqual({ value: 2, draws: 2 });
    // m = 5: 2^32 mod 5 = 1. Draws 0 rejected repeatedly.
    expect(below(scripted([0, 0, 0, 3_000_000_000]), 5)).toEqual({ value: 3, draws: 4 });
  });

  it('accepts without a second draw when the low word is at least the reject count', () => {
    // m = 3, draw 1: product 3, low word 3 >= 1, value 0.
    expect(below(scripted([1]), 3)).toEqual({ value: 0, draws: 1 });
    // A low word in [2^32 mod m, m) is accepted without a second draw.
    const m = 7n;
    expect(2n ** 32n % m).toBe(4n);
    const x = (4n * 0xb6db6db7n) & 0xffffffffn; // 0xb6db6db7 is 7^-1 mod 2^32, so the low word is 4
    expect((x * m) & 0xffffffffn).toBe(4n);
    expect(below(scripted([Number(x)]), 7).draws).toBe(1);
    // low word 3 < 4 is rejected
    const y = (3n * 0xb6db6db7n) & 0xffffffffn;
    expect(below(scripted([Number(y), 0, 2 ** 31]), 7).draws).toBe(3);
  });

  it('handles m = 1 and m = 2^32 and rejects invalid m', () => {
    expect(below(scripted([123]), 1)).toEqual({ value: 0, draws: 1 });
    expect(below(scripted([123]), 2 ** 32)).toEqual({ value: 123, draws: 1 });
    expect(() => below(scripted([1]), 0)).toThrow(RangeError);
    expect(() => below(scripted([1]), 2.5)).toThrow(RangeError);
  });

  it('m = 100: low word 92 is rejected, 96 (= 2^32 mod 100) is accepted (injected)', () => {
    const mask = 0xffffffffn;
    let inv = 1n; // 25^-1 mod 2^32 by Newton iteration; draws with product low word L are x = (L / 4) * inv
    for (let i = 0; i < 6; i++) inv = (inv * (2n - 25n * inv)) & mask;
    const drawWithLow = (low: bigint) => (low / 4n) * inv & mask;
    const rejected = drawWithLow(92n);
    const accepted = drawWithLow(96n);
    expect((rejected * 100n) & mask).toBe(92n);
    expect((accepted * 100n) & mask).toBe(96n);
    expect(2n ** 32n % 100n).toBe(96n);
    expect(below(scripted([Number(rejected), Number(accepted)]), 100)).toEqual({
      value: Number((accepted * 100n) >> 32n),
      draws: 2,
    });
    expect(below(scripted([Number(accepted)]), 100)).toEqual({
      value: Number((accepted * 100n) >> 32n),
      draws: 1,
    });
  });
});

describe('insideQuarterDisc', () => {
  it('equals a BigInt reference on seed-42 draws and consumes two draws', () => {
    const rng = createPcg32(42);
    const ref = rng.clone();
    let inside = 0;
    for (let i = 0; i < 20_000; i++) {
      const x = BigInt(ref.next());
      const y = BigInt(ref.next());
      const s = insideQuarterDisc(rng);
      expect(s.value).toBe(x * x + y * y < 2n ** 64n);
      expect(s.draws).toBe(2);
      if (s.value) inside++;
    }
    // The fraction near pi/4 is only a sanity check; the injected edge points below carry the boundary decision.
    expect(inside / 20_000).toBeGreaterThan(0.77);
    expect(inside / 20_000).toBeLessThan(0.8);
  });

  it('decides edge points exactly (injected)', () => {
    const max = 2 ** 32 - 1;
    expect(insideQuarterDisc(scripted([0, 0])).value).toBe(true);
    expect(insideQuarterDisc(scripted([max, 0])).value).toBe(true);
    expect(insideQuarterDisc(scripted([max, max])).value).toBe(false);
    expect(insideQuarterDisc(scripted([2 ** 31, 2 ** 31])).value).toBe(true);
    // Largest x with x^2 + x^2 < 2^64 is 3037000499 (3037000500^2 * 2 > 2^64).
    expect(insideQuarterDisc(scripted([3037000499, 3037000499])).value).toBe(true);
    expect(insideQuarterDisc(scripted([3037000500, 3037000500])).value).toBe(false);
  });
});

describe('walkStep', () => {
  it('returns +1 or -1 from one draw', () => {
    expect(walkStep(scripted([2 ** 31]))).toEqual({ value: 1, draws: 1 });
    expect(walkStep(scripted([2 ** 31 - 1]))).toEqual({ value: -1, draws: 1 });
    const rng = createPcg32(42);
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      const s = walkStep(rng);
      expect(Math.abs(s.value)).toBe(1);
      sum += s.value;
    }
    expect(Math.abs(sum)).toBeLessThanOrEqual(5 * Math.sqrt(1000));
  });
});
