/** The closed reference triangle (0, 0), (1, 0), (0, 1) of the barycentric parameters (u, v); w = 1 - u - v. */

/** The point of the segment from `a` to `b` nearest to `(u, v)`, and its squared distance. */
function nearestOnSegment(u: number, v: number, a: readonly [number, number], b: readonly [number, number]): {point: [number, number]; distance: number} {
    const du = b[0] - a[0], dv = b[1] - a[1];
    const t = Math.min(1, Math.max(0, ((u - a[0]) * du + (v - a[1]) * dv) / (du * du + dv * dv)));
    const point: [number, number] = [a[0] + t * du, a[1] + t * dv];
    return {point, distance: (u - point[0]) ** 2 + (v - point[1]) ** 2};
}

/** Whether `(u, v)` lies in the closed triangle `u, v >= 0`, `u + v <= 1`. */
export const isInTriangle = (u: number, v: number): boolean => u >= 0 && v >= 0 && u + v <= 1;

/**
 * The point of the closed triangle nearest to `(u, v)`: the point itself inside, otherwise the orthogonal projection
 * onto the nearest edge, clamped to that edge (so a vertex region maps to its vertex). Non-finite input is the caller's concern.
 */
export function clampToTriangle(u: number, v: number): [number, number] {
    if (isInTriangle(u, v)) return [u, v];
    const edges: ReadonlyArray<readonly [readonly [number, number], readonly [number, number]]> = [
        [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[1, 0], [0, 1]],
    ];
    let best = nearestOnSegment(u, v, edges[0][0], edges[0][1]);
    for (const [a, b] of edges.slice(1)) {
        const candidate = nearestOnSegment(u, v, a, b);
        if (candidate.distance < best.distance) best = candidate;
    }
    // Normalise -0 and keep rounding of the hypotenuse projection from pushing u + v above 1.
    const x = best.point[0] + 0, y = best.point[1] + 0;
    return [x, Math.min(y, 1 - x)];
}
