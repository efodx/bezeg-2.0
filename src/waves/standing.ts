/**
 * Standing waves (waves spec, kernel item 4).
 *
 * sin(kx - w t) + sin(kx + w t) = 2 sin(kx) cos(w t). Nodes are at x = n pi / k,
 * antinodes at (n + 1/2) pi / k.
 */

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive, got ${value}`);
}

function requireCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`count must be a non-negative integer, got ${count}`);
  }
}

/** One travelling wave sin(kx - w t) (direction +1) or sin(kx + w t) (direction -1). */
export function travelling(k: number, omega: number, direction: 1 | -1, x: number, t: number): number {
  return Math.sin(k * x - direction * omega * t);
}

/** The closed form 2 sin(kx) cos(w t). */
export function standingAt(k: number, omega: number, x: number, t: number): number {
  return 2 * Math.sin(k * x) * Math.cos(omega * t);
}

/** Node positions n pi / k for n = 0..count-1 (computed). */
export function nodes(k: number, count: number): number[] {
  requirePositive('k', k);
  requireCount(count);
  return Array.from({ length: count }, (_, n) => (n * Math.PI) / k);
}

/** Antinode positions (n + 1/2) pi / k for n = 0..count-1 (computed). */
export function antinodes(k: number, count: number): number[] {
  requirePositive('k', k);
  requireCount(count);
  return Array.from({ length: count }, (_, n) => ((2 * n + 1) * Math.PI) / (2 * k));
}

/**
 * Node positions n L / m for n = 0..m on a fixed length L from the integer half-wave
 * count m (1..6): the integer product is formed before the division.
 */
export function nodesOnLength(length: number, halfWaves: number): number[] {
  requirePositive('length', length);
  if (!Number.isInteger(halfWaves) || halfWaves < 1 || halfWaves > 6) {
    throw new RangeError(`halfWaves must be an integer from 1 to 6, got ${halfWaves}`);
  }
  return Array.from({ length: halfWaves + 1 }, (_, n) => (n * length) / halfWaves);
}
