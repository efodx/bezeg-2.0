/**
 * Beats of two equal-amplitude tones (waves spec, kernel item 3).
 *
 * cos(2 pi f1 t) + cos(2 pi f2 t) = 2 cos(pi df t) cos(pi (f1 + f2) t), df = f1 - f2.
 * The signed factor 2A cos(pi df t) has frequency df/2; the visible envelope |.| and
 * the heard beat repeat with frequency |df|, period 1/|df|. The sign of the signed
 * factor flips at each envelope node, a phase jump of pi in the mean-frequency carrier.
 */

function requireIntegerHz(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 40) {
    throw new RangeError(`${name} must be an integer from 1 to 40 Hz, got ${value}`);
  }
}

/** The beat frequency |f1 - f2| in hertz: an exact integer. */
export function beatFrequency(f1: number, f2: number): number {
  requireIntegerHz('f1', f1);
  requireIntegerHz('f2', f2);
  return Math.abs(f1 - f2);
}

/** The mean frequency (f1 + f2) / 2, exact in doubles for these integers. */
export function meanFrequency(f1: number, f2: number): number {
  requireIntegerHz('f1', f1);
  requireIntegerHz('f2', f2);
  return (f1 + f2) / 2;
}

/** The signed factor 2A cos(pi df t) of the product form. */
export function signedEnvelope(amplitude: number, f1: number, f2: number, t: number): number {
  beatFrequency(f1, f2);
  return 2 * amplitude * Math.cos(Math.PI * (f1 - f2) * t);
}

/** The envelope 2A |cos(pi df t)|, drawn from this formula and never fitted. */
export function envelope(amplitude: number, f1: number, f2: number, t: number): number {
  return Math.abs(signedEnvelope(amplitude, f1, f2, t));
}

/** The product form 2A cos(pi df t) cos(pi (f1 + f2) t), equal to the direct sum. */
export function beatProduct(amplitude: number, f1: number, f2: number, t: number): number {
  return signedEnvelope(amplitude, f1, f2, t) * Math.cos(Math.PI * (f1 + f2) * t);
}
