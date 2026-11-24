export type HullPoint = readonly [number, number];

function cross(o: HullPoint, a: HullPoint, b: HullPoint): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Convex hull by Andrew's monotone chain, counter-clockwise (y up), without collinear or duplicate vertices.
 * Non-finite points are dropped. Returns 0, 1 or 2 points for empty, single or collinear input.
 */
export function convexHull(points: readonly HullPoint[]): HullPoint[] {
    const sorted = points
        .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .slice()
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const unique: HullPoint[] = [];
    for (const p of sorted) {
        const last = unique[unique.length - 1];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) unique.push(p);
    }
    if (unique.length <= 2) return unique;
    const lower: HullPoint[] = [];
    for (const p of unique) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper: HullPoint[] = [];
    for (let i = unique.length - 1; i >= 0; i--) {
        const p = unique[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}
