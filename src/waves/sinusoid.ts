/**
 * Sinusoid components and their sum (waves spec, kernel items 1 and 2; ADR 0055).
 *
 * x(t) = A cos(2 pi f t + phi). Amplitudes, phases and sums are computed doubles;
 * only the integer decisions elsewhere in this folder are exact.
 */

/** One sinusoidal component: amplitude A, frequency f in hertz, phase phi in radians. */
export interface Sinusoid {
  readonly amplitude: number;
  readonly frequency: number;
  readonly phase: number;
}

/** The phasor sum of two equal-frequency components. */
export interface PhasorSum {
  readonly frequency: number;
  readonly amplitude: number;
  /** Phase of the sum relative to component 1: atan2(A2 sin(dphi), A1 + A2 cos(dphi)). */
  readonly relativePhase: number;
  /** Absolute phase, phi1 + relativePhase, so the sum is amplitude * cos(2 pi f t + phase). */
  readonly phase: number;
}

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite number, got ${value}`);
}

/** Value of one component at time t seconds. */
export function valueAt(c: Sinusoid, t: number): number {
  return c.amplitude * Math.cos(2 * Math.PI * c.frequency * t + c.phase);
}

/** Sum of the components at time t (computed). An empty list sums to 0. */
export function sumAt(components: readonly Sinusoid[], t: number): number {
  requireFinite('t', t);
  let total = 0;
  for (const c of components) total += valueAt(c, t);
  return total;
}

/**
 * Amplitude and phase of the sum of two components of the same frequency. For equal
 * amplitudes and a phase difference of pi the amplitude is a rounding residue near 0
 * and the phase is arbitrary; callers declare "opposite phase" from exact inputs.
 */
export function phasorSum(c1: Sinusoid, c2: Sinusoid): PhasorSum {
  if (c1.frequency !== c2.frequency) {
    throw new RangeError('phasorSum needs equal frequencies');
  }
  requireFinite('amplitude', c1.amplitude);
  requireFinite('amplitude', c2.amplitude);
  requireFinite('phase', c1.phase);
  requireFinite('phase', c2.phase);
  const dphi = c2.phase - c1.phase;
  const amplitude = Math.sqrt(
    c1.amplitude ** 2 + c2.amplitude ** 2 + 2 * c1.amplitude * c2.amplitude * Math.cos(dphi),
  );
  const relativePhase = Math.atan2(c2.amplitude * Math.sin(dphi), c1.amplitude + c2.amplitude * Math.cos(dphi));
  return { frequency: c1.frequency, amplitude, relativePhase, phase: c1.phase + relativePhase };
}
