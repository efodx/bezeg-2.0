/**
 * Coordinate and object limits of the sweep-algorithm lessons (ADR 0035, spec S0). Input outside the limits is
 * refused with a reason value and never clamped. Pure TypeScript.
 */

/** Sweep input uses a tighter range than the core grid (ADR 0021): |coordinate| <= 2^10. */
export const SWEEP_COORD_LIMIT = 2 ** 10;

export const SWEEP_MAX_SEGMENTS = 12;
export const SWEEP_MAX_INTERVALS = 10;
export const SWEEP_MAX_POLYGON_VERTICES = 20;
export const SWEEP_MAX_SITES = 12;

/** Why an input was refused: not a point object, a non-integer or non-finite coordinate, or |c| > the limit. */
export type SweepInputRefusal = 'not-a-point' | 'not-grid' | 'out-of-range';

export type SweepInputCheck =
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: SweepInputRefusal };

/** Checks one coordinate: a safe integer with |c| <= SWEEP_COORD_LIMIT. */
export function checkSweepCoordinate(value: unknown): SweepInputCheck {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) return {ok: false, reason: 'not-grid'};
    if (Math.abs(value) > SWEEP_COORD_LIMIT) return {ok: false, reason: 'out-of-range'};
    return {ok: true};
}

/** Checks one point; the first offending coordinate (x, then y) decides the reason. */
export function checkSweepPoint(point: unknown): SweepInputCheck {
    if (point === null || typeof point !== 'object') return {ok: false, reason: 'not-a-point'};
    const {x, y} = point as Record<string, unknown>;
    const cx = checkSweepCoordinate(x);
    return cx.ok ? checkSweepCoordinate(y) : cx;
}

/** Checks every point of a list; the first offending point decides (with its index). */
export function checkSweepPoints(
    points: readonly unknown[],
): { readonly ok: true } | { readonly ok: false; readonly reason: SweepInputRefusal; readonly index: number } {
    for (let i = 0; i < points.length; i++) {
        const check = checkSweepPoint(points[i]);
        if (!check.ok) return {ok: false, reason: check.reason, index: i};
    }
    return {ok: true};
}
