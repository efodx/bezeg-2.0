/**
 * Logistic map f(x) = r x (1 - x) with r = R/100, integer R in [250, 400] (phase-portraits spec, Kernel 4).
 * The map is defined here: src/recursion/logistic.ts only accepts R in 5..29 with r = R/10, so it does not fit.
 * Stability of the fixed point and the 2-cycle is decided by integer tests; higher periods are computed.
 */

export const LOGISTIC_R_RANGE = {min: 250, max: 400} as const;
export const PERIOD_START = 0.2;
export const PERIOD_TRANSIENT = 200000;
export const PERIOD_MAX = 64;
export const PERIOD_TOLERANCE = 1e-9;

export const isLogisticR = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= LOGISTIC_R_RANGE.min && (value as number) <= LOGISTIC_R_RANGE.max;

/** The map for a real parameter r (used by the raster columns and by period checks between grid values). */
export const logisticMapAt = (r: number) => (x: number): number => r * x * (1 - x);

export function logisticMap(R: number): (x: number) => number {
    if (!isLogisticR(R)) throw new RangeError('R must be an integer from 250 to 400.');
    return logisticMapAt(R / 100);
}

/** Fixed point 1 - 1/r attracts iff |2 - r| < 1, i.e. 100 < R < 300. */
export const fixedPointAttracts = (R: number): boolean => R > 100 && R < 300;

/** The 2-cycle exists iff r > 3. */
export const twoCycleExists = (R: number): boolean => R > 300;

/** The 2-cycle attracts iff 3 < r < 1 + sqrt 6, i.e. R > 300 and (R - 100)^2 < 60000 (R <= 344). */
export const twoCycleAttracts = (R: number): boolean => R > 300 && (R - 100) * (R - 100) < 60000;

/** f'(1 - 1/r) = 2 - r. */
export const fixedPointMultiplier = (R: number): number => 2 - R / 100;

/** Multiplier of the 2-cycle, f'(x-) f'(x+) = 4 + 2r - r^2. */
export const twoCycleMultiplier = (R: number): number => {
    const r = R / 100;
    return 4 + 2 * r - r * r;
};

export const fixedPoint = (R: number): number => 1 - 100 / R;

/** The 2-cycle ((r+1) -/+ sqrt((r+1)(r-3)))/(2r), smaller value first; null when r <= 3. */
export function twoCycle(R: number): readonly [number, number] | null {
    if (!twoCycleExists(R)) return null;
    const r = R / 100;
    const root = Math.sqrt((r + 1) * (r - 3));
    return [(r + 1 - root) / (2 * r), (r + 1 + root) / (2 * r)];
}

export type PeriodResult =
    | {readonly kind: 'computed'; readonly period: number; readonly tolerance: number}
    | {readonly kind: 'none-found'; readonly maxPeriod: number};

/** Computed, not exact: 200000 steps from x0, then the smallest p <= 64 with |f^p(x) - x| < 1e-9. */
export function detectPeriod(r: number, x0: number = PERIOD_START): PeriodResult {
    const f = logisticMapAt(r);
    let x = x0;
    for (let i = 0; i < PERIOD_TRANSIENT; i++) x = f(x);
    let y = x;
    for (let p = 1; p <= PERIOD_MAX; p++) {
        y = f(y);
        if (Math.abs(y - x) < PERIOD_TOLERANCE) return {kind: 'computed', period: p, tolerance: PERIOD_TOLERANCE};
    }
    return {kind: 'none-found', maxPeriod: PERIOD_MAX};
}

export const detectPeriodAtR = (R: number, x0: number = PERIOD_START): PeriodResult => {
    if (!isLogisticR(R)) throw new RangeError('R must be an integer from 250 to 400.');
    return detectPeriod(R / 100, x0);
};
