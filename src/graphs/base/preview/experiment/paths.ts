/**
 * Preview experiment (task 02 slice 5a): the shared shape of a previewed path and the comparison of two of them. Experiment
 * code only; nothing in the app imports it.
 */

/** One drawn polyline. A curve with gaps (a NaN separator) is several paths. */
export type Path = Array<[number, number]>;

/** Splits NaN-separated coordinate arrays into paths. */
export function splitPaths(x: ArrayLike<number>, y: ArrayLike<number>, count = x.length): Path[] {
    const paths: Path[] = [];
    let current: Path = [];
    for (let i = 0; i < count; i++) {
        if (Number.isFinite(x[i]) && Number.isFinite(y[i])) current.push([x[i], y[i]]);
        else if (current.length > 0) { paths.push(current); current = []; }
    }
    if (current.length > 0) paths.push(current);
    return paths;
}

/** The drawn points of a JSXGraph curve or function graph (`points` past `numberPoints` are stale data and never drawn). */
export function curvePaths(element: unknown): Path[] {
    const curve = element as {points?: Array<{usrCoords: number[]}>; numberPoints?: number};
    const points = curve.points ?? [];
    const count = typeof curve.numberPoints === 'number' ? Math.min(curve.numberPoints, points.length) : points.length;
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < count; i++) { x.push(points[i].usrCoords[1]); y.push(points[i].usrCoords[2]); }
    return splitPaths(x, y);
}

const distanceToSegment = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const u = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2));
    return Math.hypot(p[0] - (a[0] + u * dx), p[1] - (a[1] + u * dy));
};

/** The largest distance of a point of `from` to the polylines of `to`; Infinity when `to` is empty. */
export function maxDistanceTo(from: readonly Path[], to: readonly Path[]): number {
    let worst = 0;
    for (const path of from) {
        for (const point of path) {
            let best = Infinity;
            for (const other of to) {
                if (other.length === 1) best = Math.min(best, Math.hypot(point[0] - other[0][0], point[1] - other[0][1]));
                for (let i = 1; i < other.length; i++) best = Math.min(best, distanceToSegment(point, other[i - 1], other[i]));
            }
            worst = Math.max(worst, best);
        }
    }
    return worst;
}

/** The symmetric deviation of two path sets (each one's points against the other's polylines): 0 for the same drawing. */
export const pathDeviation = (a: readonly Path[], b: readonly Path[]): number => Math.max(maxDistanceTo(a, b), maxDistanceTo(b, a));
