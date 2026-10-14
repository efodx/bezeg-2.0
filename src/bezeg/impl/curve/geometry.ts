import {Point} from "../../api/point/point";

export function distance(p: Point, q: Point): number {
    return Math.sqrt((p.X() - q.X()) ** 2 + (p.Y() - q.Y()) ** 2);
}

/** Returns [minX, maxX, minY, maxY]. */
export function boundingBoxOf(points: ReadonlyArray<Point>): number[] {
    let maxX = -Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let minY = Infinity;
    for (const point of points) {
        const x = point.X();
        const y = point.Y();
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
    }
    return [minX, maxX, minY, maxY];
}

/**
 * Knot vector on [0, 1] from consecutive span lengths: each span has length
 * `distance(start, end) ** alpha` (alpha = 0 uniform, 0.5 centripetal, 1 chordal).
 * If every span has length 0 the knots fall back to uniform spacing instead of NaN.
 */
export function chordKnots(spans: ReadonlyArray<readonly [Point, Point]>, alpha: number): number[] {
    const u = [0];
    for (const [start, end] of spans) {
        u.push(u[u.length - 1] + distance(start, end) ** alpha);
    }
    const total = u[u.length - 1];
    if (!(total > 0)) {
        return u.map((_, i) => i / Math.max(1, spans.length));
    }
    return u.map(t => t / total);
}
