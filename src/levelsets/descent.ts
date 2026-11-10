/**
 * Gradient descent p_{k+1} = p_k - h grad f(p_k) with h = H/100 (ADR 0053 section 4, spec Kernels item 3).
 *
 * H is an integer in [1, 30] and the start lies on the 1/4 grid, so the quadratic `valley` classification is an
 * integer test on H and on y0 === 0, with no tolerance. For the other functions the path is returned with no
 * convergence claim.
 */
import { CATALOGUE, type CatalogueId } from './functions2';

export const DESCENT_MAX_STEPS = 200;
export const DESCENT_ESCAPE_RADIUS = 1e6;
export const DESCENT_H_MIN = 1;
export const DESCENT_H_MAX = 30;

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

/** Why the path ended: the step cap, or a non-finite value or |p| > 10^6 (the offending point is not in the path). */
export type DescentStop = 'cap' | 'escaped';

export interface DescentResult {
  /** The start followed by every accepted iterate (finite, |p| <= 10^6). */
  readonly path: readonly Point2[];
  readonly stop: DescentStop;
}

export type ValleyBehaviour = 'converges' | 'oscillates' | 'diverges';

function isQuarterGrid(v: number): boolean {
  return Number.isFinite(v) && Number.isInteger(v * 4);
}

function checkStart(start: Point2): void {
  if (!isQuarterGrid(start.x) || !isQuarterGrid(start.y)) {
    throw new RangeError('descent start must lie on the 1/4 grid');
  }
}

function checkStepNumber(H: number): void {
  if (!Number.isInteger(H) || H < DESCENT_H_MIN || H > DESCENT_H_MAX) {
    throw new RangeError(`step number H must be an integer in [${DESCENT_H_MIN}, ${DESCENT_H_MAX}]`);
  }
}

/** The descent path of the catalogue function `id` from `start` with step h = H/100. */
export function descend(id: CatalogueId, start: Point2, H: number): DescentResult {
  checkStart(start);
  checkStepNumber(H);
  const h = H / 100;
  const { gradient } = CATALOGUE[id];
  const path: Point2[] = [{ x: start.x, y: start.y }];
  let { x, y } = start;
  for (let k = 0; k < DESCENT_MAX_STEPS; k += 1) {
    const [gx, gy] = gradient(x, y);
    x -= h * gx;
    y -= h * gy;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > DESCENT_ESCAPE_RADIUS) {
      return { path, stop: 'escaped' };
    }
    path.push({ x, y });
  }
  return { path, stop: 'cap' };
}

/**
 * Exact classification for `valley` (x^2 + 10 y^2): the factors are 1 - 2h and 1 - 20h. With y0 !== 0 it
 * converges iff H <= 9, oscillates at H = 10 (factor -1) and diverges for H >= 11; with y0 === 0 only the
 * factor 1 - 2h acts and it converges for every H in range.
 */
export function classifyValley(start: Point2, H: number): ValleyBehaviour {
  checkStart(start);
  checkStepNumber(H);
  if (start.y === 0 || H <= 9) return 'converges';
  return H === 10 ? 'oscillates' : 'diverges';
}

/** First iterate index k with f(p_k) < eps, or null when the path never gets there. */
export function iterationsUntil(id: CatalogueId, path: readonly Point2[], eps: number): number | null {
  const { value } = CATALOGUE[id];
  for (let k = 0; k < path.length; k += 1) {
    if (value(path[k].x, path[k].y) < eps) return k;
  }
  return null;
}
