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

/**
 * Convex hull vertices (Andrew's monotone chain, O(n log n)), counter-clockwise starting at the
 * leftmost point. Points collinear with a hull edge are omitted; coincident points count once.
 * The result contains the given Point objects, never copies.
 */
export function convexHull(points: ReadonlyArray<Point>): Point[] {
    const sorted = [...points].sort((p, q) => p.X() === q.X() ? p.Y() - q.Y() : p.X() - q.X());
    const unique = sorted.filter((p, i) => i === 0 || p.X() !== sorted[i - 1].X() || p.Y() !== sorted[i - 1].Y());
    if (unique.length < 3) {
        return unique;
    }
    const cross = (o: Point, a: Point, b: Point) =>
        (a.X() - o.X()) * (b.Y() - o.Y()) - (a.Y() - o.Y()) * (b.X() - o.X());
    const chain = (ordered: Point[]): Point[] => {
        const result: Point[] = [];
        for (const p of ordered) {
            while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], p) <= 0) {
                result.pop();
            }
            result.push(p);
        }
        result.pop();
        return result;
    };
    return [...chain(unique), ...chain([...unique].reverse())];
}
