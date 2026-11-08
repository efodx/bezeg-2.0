export type Point2 = readonly [number, number];

export interface PlacementOptions {
    /** An explicit position (a click, a typed value). Wins exactly. */
    at?: Point2;
    /** The graph's own rule for the next point, used when `at` is absent. */
    rule?: (points: readonly Point2[]) => Point2;
    /** The largest x a default-placed point may take; past it the point goes one unit left of the last. */
    limit?: {max: number};
}

/**
 * Where a new point goes: `at`, else `rule(points)`, else one unit right of the last point
 * (one unit left when that passes `limit.max`), else the origin. Pure; it does not validate the graph's mathematics.
 */
export function placeNewPoint(points: readonly Point2[], options: PlacementOptions = {}): Point2 {
    const {at, rule, limit} = options;
    if (at) return [at[0], at[1]];
    if (rule) return rule(points);
    const last = points[points.length - 1];
    if (!last) return [0, 0];
    const right = last[0] + 1;
    return limit && right > limit.max ? [last[0] - 1, last[1]] : [right, last[1]];
}
