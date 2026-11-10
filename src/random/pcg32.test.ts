import { describe, expect, it } from 'vitest';
import { checkSeed, createPcg32 } from './pcg32';

const REFERENCE_42 = ['a15c02b7', '7b47f409', 'ba1d3330', '83d2f293', 'bfa4784b', 'cbed606e'];
const hex = (n: number) => n.toString(16).padStart(8, '0');

/**
 * Independent PCG32: no BigInt, 64-bit state as four 16-bit limbs (little endian),
 * schoolbook multiplication. Shares no code with pcg32.ts.
 */
function limbReference(seed: number): () => number {
  const M = [0x7f2d, 0x4c95, 0xf42d, 0x5851]; // 0x5851F42D4C957F2D, low limb first
  const INC = [0x006d, 0, 0, 0]; // (54 << 1) | 1 = 109
  const mul = (a: number[]): number[] => {
    const r = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      let carry = 0;
      for (let j = 0; i + j < 4; j++) {
        const t = r[i + j] + a[i] * M[j] + carry; // < 2^33, exact
        r[i + j] = t % 65536;
        carry = Math.floor(t / 65536);
      }
    }
    return r;
  };
  const add = (a: number[], b: number[]): number[] => {
    const r = [0, 0, 0, 0];
    let carry = 0;
    for (let i = 0; i < 4; i++) {
      const t = a[i] + b[i] + carry;
      r[i] = t % 65536;
      carry = t >= 65536 ? 1 : 0;
    }
    return r;
  };
  const step = (s: number[]) => add(mul(s), INC);
  let state = step([0, 0, 0, 0]);
  state = add(state, [seed % 65536, Math.floor(seed / 65536), 0, 0]);
  state = step(state);
  return () => {
    const old = state;
    state = step(old);
    // bits of old: old >> 18 ^ old, then >> 27, low 32 bits
    const lo32 = (old[1] * 65536 + old[0]) >>> 0;
    const hi32 = (old[3] * 65536 + old[2]) >>> 0;
    const shifted18lo = ((lo32 >>> 18) | (hi32 << 14)) >>> 0; // low 32 bits of old >> 18
    const shifted18hi = hi32 >>> 18; // bits 32.. of old >> 18
    const xlo = (shifted18lo ^ lo32) >>> 0;
    const xhi = (shifted18hi ^ hi32) >>> 0;
    const xorshifted = ((xlo >>> 27) | (xhi << 5)) >>> 0;
    const rot = old[3] >>> 11; // top 5 bits
    return rot === 0 ? xorshifted : ((xorshifted >>> rot) | (xorshifted << (32 - rot))) >>> 0;
  };
}

function fnv1a(draws: () => number, n: number): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < n; i++) {
    const v = draws();
    for (let k = 0; k < 4; k++) {
      h = Math.imul(h ^ ((v >>> (8 * k)) & 255), 0x01000193) >>> 0;
    }
  }
  return hex(h);
}

// Regression value. Provenance: FNV-1a (32 bit, little-endian bytes) of the first 10^6 draws at seed 42.
// The value is asserted for both createPcg32 (BigInt) and limbReference above, a BigInt-free
// implementation written separately; the reference matches the six published pcg32-demo outputs
// for srandom(42, 54). The digest is therefore anchored by two independent in-repo implementations
// plus the six published seed-42 outputs, not by an external long-stream source (no C compiler was
// available to rerun pcg32-demo).
const DIGEST_1E6_SEED_42 = '471bc991';

describe('createPcg32', () => {
  it('reproduces the published pcg32-demo outputs for seed 42', () => {
    const rng = createPcg32(42);
    expect(REFERENCE_42.map(() => hex(rng.next()))).toEqual(REFERENCE_42);
  });

  it('the independent limb implementation reproduces the same outputs', () => {
    const ref = limbReference(42);
    expect(REFERENCE_42.map(() => hex(ref()))).toEqual(REFERENCE_42);
  });

  it('matches the independent implementation for other seeds and rotations', () => {
    for (const seed of [0, 1, 7, 65_536, 999_999]) {
      const rng = createPcg32(seed);
      const ref = limbReference(seed);
      for (let i = 0; i < 2000; i++) expect(rng.next()).toBe(ref());
    }
  });

  it('records the digest of 10^6 draws, agreed by both implementations', () => {
    expect(fnv1a(createPcg32(42).next, 1_000_000)).toBe(DIGEST_1E6_SEED_42);
    expect(fnv1a(limbReference(42), 1_000_000)).toBe(DIGEST_1E6_SEED_42);
  });

  it('returns uint32 values', () => {
    const rng = createPcg32(5);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(Number.isInteger(v) && v >= 0 && v < 2 ** 32).toBe(true);
    }
  });

  it('clone agrees with sequential draws and is independent', () => {
    const rng = createPcg32(123);
    for (let i = 0; i < 37; i++) rng.next();
    const copy = rng.clone();
    const a = Array.from({ length: 100 }, () => rng.next());
    const b = Array.from({ length: 100 }, () => copy.next());
    expect(b).toEqual(a);
    const fresh = createPcg32(123);
    for (let i = 0; i < 37; i++) fresh.next();
    expect(fresh.next()).toBe(a[0]);
  });

  it('snaps invalid seeds to 42 with an actionable status', () => {
    for (const bad of [1.5, -1, 1_000_000, Number.NaN, Infinity]) {
      const check = checkSeed(bad);
      expect(check.seed).toBe(42);
      expect(check.status).toBe('invalid-seed-snapped-to-default');
      expect(check.message).toMatch(/0 to 999999/);
      expect(createPcg32(bad).next()).toBe(createPcg32(42).next());
    }
    expect(checkSeed(0)).toEqual({ seed: 0, status: 'ok' });
    expect(checkSeed(999_999).status).toBe('ok');
  });
});
