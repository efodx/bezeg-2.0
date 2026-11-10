// PCG32 (XSH-RR, 64-bit state, O'Neill 2014) with initseq fixed at 54.
// Integer arithmetic only; the 64-bit state is a BigInt (ADR 0049 section 1).

export const DEFAULT_SEED = 42;
export const MAX_SEED = 999_999;
const INITSEQ = 54n;
const MASK64 = (1n << 64n) - 1n;
const MULT = 6364136223846793005n;

/** Anything that yields uint32 draws; samplers accept this so tests can inject a script. */
export interface Uint32Source {
  next(): number;
}

export interface Pcg32 extends Uint32Source {
  readonly seed: number;
  /** Next uint32 (0 ... 2^32 - 1). */
  next(): number;
  /** Independent generator at the same position of the stream. */
  clone(): Pcg32;
}

export type SeedStatus = 'ok' | 'invalid-seed-snapped-to-default';

export interface SeedCheck {
  seed: number;
  status: SeedStatus;
  /** Actionable text for the seed field; undefined when the seed was valid. */
  message?: string;
}

export function checkSeed(seed: number): SeedCheck {
  if (Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED) return { seed, status: 'ok' };
  return {
    seed: DEFAULT_SEED,
    status: 'invalid-seed-snapped-to-default',
    message: `Seed must be a whole number from 0 to ${MAX_SEED}; using ${DEFAULT_SEED}.`,
  };
}

function make(seed: number, initialState: bigint): Pcg32 {
  let state = initialState;
  const inc = (INITSEQ << 1n) | 1n;
  return {
    seed,
    next() {
      const old = state;
      state = (old * MULT + inc) & MASK64;
      const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn);
      const rot = Number(old >> 59n);
      return ((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0;
    },
    clone() {
      return make(seed, state);
    },
  };
}

/** Invalid seeds snap to 42; use `checkSeed` to obtain the status message. */
export function createPcg32(seed: number): Pcg32 {
  const valid = checkSeed(seed).seed;
  const inc = (INITSEQ << 1n) | 1n;
  let state = (0n * MULT + inc) & MASK64;
  state = (state + BigInt(valid)) & MASK64;
  state = (state * MULT + inc) & MASK64;
  return make(valid, state);
}
