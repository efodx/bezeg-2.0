export type Point2 = readonly [number, number];

export interface PlacementOptions {
    /** An explicit position (a click, a typed value). Wins exactly. */
    at?: Point2;
    /** The graph's own rule for the next point, used when `at` is absent. */
    rule?: (points: readonly Point2[]) => Point2;
    /** The largest x a default-placed point may take; past it the point goes one unit left of the last. */
    limit?: {max: number};
    /**
     * Decision 31: a graph that accepts a repeated position asks for a distinct default. When the default spot already holds a point, the
     * next free whole position along the last point's row is taken (rightwards within `limit.max`, then leftwards); a full row
     * leaves the plain default, which the graph's own rules then accept or refuse.
     */
    distinct?: boolean;
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
    const plain: Point2 = limit && right > limit.max ? [last[0] - 1, last[1]] : [right, last[1]];
    if (!options.distinct || !points.some(p => p[0] === plain[0] && p[1] === plain[1])) return plain;
    const free = (x: number) => !points.some(p => p[0] === x && p[1] === last[1]);
    const upper = limit ? limit.max : last[0] + points.length + 1;
    for (let x = right; x <= upper; x += 1) if (free(x)) return [x, last[1]];
    for (let x = last[0] - 1; limit ? x >= -limit.max : x > last[0] - points.length - 2; x -= 1) if (free(x)) return [x, last[1]];
    return plain;
}
