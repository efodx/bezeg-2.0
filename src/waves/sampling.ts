/**
 * Sampling, aliasing and reconstruction (waves spec, kernel item 5; ADR 0055 sections 2-3).
 *
 * alias and the Nyquist decision are exact integer arithmetic. Samples, reconstructions
 * and errors are computed doubles. The sampler is the strip of instants n / fs computed
 * from n, never an animation frame rate.
 */

import { type Sinusoid, sumAt, valueAt } from './sinusoid';

export type AliasResult =
  | { readonly ambiguous: true }
  | {
      readonly ambiguous: false;
      /** Signed alias in (-fs/2, fs/2): negative means the wheel seems to turn backwards. */
      readonly signed: number;
      /** min(r, fs - r), the apparent speed. 0 means "appears at rest". */
      readonly magnitude: number;
    };

function requireInt(name: string, value: number, lo: number, hi: number): void {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    throw new RangeError(`${name} must be an integer from ${lo} to ${hi}, got ${value}`);
  }
}

function requireRate(fs: number): void {
  requireInt('fs', fs, 2, 64);
}

/** Exact alias of an integer frequency f (1..40 Hz) sampled at an integer rate fs (2..64 Hz). */
export function alias(f: number, fs: number): AliasResult {
  requireInt('f', f, 1, 40);
  requireRate(fs);
  const r = f % fs;
  if (2 * r === fs) return { ambiguous: true };
  const signed = 2 * r < fs ? r : r - fs;
  return { ambiguous: false, signed, magnitude: Math.abs(signed) };
}

/** The Nyquist decision, an exact integer comparison of fs with 2f. */
export function nyquistRelation(f: number, fs: number): 'above' | 'at' | 'below' {
  requireInt('f', f, 1, 40);
  requireRate(fs);
  if (fs > 2 * f) return 'above';
  return fs === 2 * f ? 'at' : 'below';
}

/** Samples x(n / fs) for n = 0..count-1. */
export function sample(c: Sinusoid, fs: number, count: number): number[] {
  requireRate(fs);
  requireInt('count', count, 0, 1_000_000);
  return Array.from({ length: count }, (_, n) => valueAt(c, n / fs));
}

/**
 * Single-tone reconstruction A cos(2 pi fa t + phi) with the signed alias fa, which has
 * exactly the same samples. Returns null when the alias is ambiguous (2f = fs).
 */
export function reconstruct(c: Sinusoid, fs: number): Sinusoid | null {
  const a = alias(c.frequency, fs);
  if (a.ambiguous) return null;
  return { amplitude: c.amplitude, frequency: a.signed, phase: c.phase };
}

function sinc(x: number): number {
  return x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
}

/**
 * Truncated sinc interpolation of the samples of the sum at time t. The samples are
 * those of the window [0, window] (n = 0..fs*window, window a whole number of seconds)
 * plus `extra` more on each side, n = -extra..fs*window + extra. It is approximate;
 * sincError reports the error against the true sum.
 */
export function sincInterpolate(
  components: readonly Sinusoid[],
  fs: number,
  t: number,
  extra: number,
  window = 1,
): number {
  requireRate(fs);
  requireInt('extra', extra, 0, 100_000);
  requireInt('window', window, 1, 100);
  let total = 0;
  for (let n = -extra; n <= fs * window + extra; n++) {
    total += sumAt(components, n / fs) * sinc(fs * t - n);
  }
  return total;
}

/** Maximum |sinc interpolation - true sum| over t in [lo, hi] on `points` + 1 equal steps. */
export function sincError(
  components: readonly Sinusoid[],
  fs: number,
  lo: number,
  hi: number,
  extra: number,
  points = 512,
): number {
  requireInt('points', points, 1, 100_000);
  let worst = 0;
  for (let i = 0; i <= points; i++) {
    const t = lo + ((hi - lo) * i) / points;
    worst = Math.max(worst, Math.abs(sincInterpolate(components, fs, t, extra) - sumAt(components, t)));
  }
  return worst;
}

/** Maximum |linear join of the samples - true tone| over t in [0, window] on `points` + 1 steps. */
export function linearJoinError(c: Sinusoid, fs: number, window: number, points = 2048): number {
  requireRate(fs);
  const last = Math.ceil(window * fs);
  const samples = sample(c, fs, last + 1);
  let worst = 0;
  for (let i = 0; i <= points; i++) {
    const t = (window * i) / points;
    const n = Math.min(Math.floor(t * fs), last - 1);
    const u = t * fs - n;
    const line = samples[n] * (1 - u) + samples[n + 1] * u;
    worst = Math.max(worst, Math.abs(line - valueAt(c, t)));
  }
  return worst;
}
