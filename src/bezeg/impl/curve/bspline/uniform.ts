/**
 * The uniform-limit contract shared with the interpolation and approximation lessons: the unclamped uniform
 * quadratic B-spline segment and Chaikin corner cutting. Rows are coordinate arrays of equal length.
 */

function assertSameLength(rows: readonly (readonly number[])[]): void {
    const dimension = rows[0].length;
    if (dimension < 1 || rows.some(row => row.length !== dimension || !row.every(Number.isFinite))) {
        throw new RangeError('Points must be finite and have the same number of coordinates');
    }
}

/**
 * Segment of the unclamped uniform quadratic B-spline (knots 0, 1, 2, ...) over three consecutive control
 * points: 1/2 [(1-s)^2 P0 + (1 + 2s - 2s^2) P1 + s^2 P2], s in [0, 1].
 */
export function uniformQuadraticSegment(P0: readonly number[], P1: readonly number[], P2: readonly number[], s: number): number[] {
    assertSameLength([P0, P1, P2]);
    if (!Number.isFinite(s)) {
        throw new RangeError('Segment parameter must be finite');
    }
    const w0 = (1 - s) * (1 - s) / 2;
    const w1 = (1 + 2 * s - 2 * s * s) / 2;
    const w2 = s * s / 2;
    return P0.map((value, d) => w0 * value + w1 * P1[d] + w2 * P2[d]);
}

/**
 * One Chaikin corner-cutting step. Every edge P_i P_{i+1} yields 3/4 P_i + 1/4 P_{i+1} followed by
 * 1/4 P_i + 3/4 P_{i+1}. A closed polygon (at least 3 points) wraps around and returns 2n points; an open
 * polygon (at least 2 points) keeps its first and last point and returns 2(n - 1) + 2 points.
 */
export function chaikinStep(polygon: readonly (readonly number[])[], closed: boolean): number[][] {
    if (polygon.length < (closed ? 3 : 2)) {
        throw new RangeError(`Chaikin needs at least ${closed ? 3 : 2} points, got ${polygon.length}`);
    }
    assertSameLength(polygon);
    const result: number[][] = closed ? [] : [[...polygon[0]]];
    const edges = closed ? polygon.length : polygon.length - 1;
    for (let i = 0; i < edges; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        result.push(a.map((value, d) => 0.75 * value + 0.25 * b[d]));
        result.push(a.map((value, d) => 0.25 * value + 0.75 * b[d]));
    }
    if (!closed) {
        result.push([...polygon[polygon.length - 1]]);
    }
    return result;
}
