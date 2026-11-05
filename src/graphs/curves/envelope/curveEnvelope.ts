/**
 * Envelope of de Casteljau lines (lesson L6): pure geometry, no JSXGraph. For control points P_0..P_n and a parameter t,
 * the last de Casteljau step runs between two points Q0(t) and Q1(t); the line through them touches the Bezier curve at
 * B(t) and is tangent there, at any degree n >= 1 (B'(t) = n (Q1 - Q0)). So the lines for many t envelop the curve.
 */

export type Point2 = readonly [number, number];
type Rows = ReadonlyArray<ReadonlyArray<number>>;

/** The most lines drawn at once. */
export const ENVELOPE_LINES_MAX = 200;
export const ENVELOPE_LINES_MIN = 1;
export const ENVELOPE_LINES_DEFAULT = 16;
export const ENVELOPE_T_DEFAULT = 0.5;
/** Control points are collinear when every point is within this many curve sizes of the line through the farthest pair. */
export const COLLINEAR_TOLERANCE = 1e-9;

export interface TangentSegment {
    /** The ends of the last de Casteljau step, Q0(t) and Q1(t). */
    readonly q0: Point2;
    readonly q1: Point2;
    /** The touching point: the curve point B(t), a convex combination of q0 and q1. */
    readonly touch: Point2;
}

/** The last de Casteljau level before the point, and the point. Undefined for fewer than two control points or non-finite input. */
export function tangentSegment(rows: Rows, t: number): TangentSegment | undefined {
    if (rows.length < 2 || !Number.isFinite(t)) return undefined;
    let level: Point2[] = rows.map(row => [row[0], row[1]] as Point2);
    if (level.some(point => !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) return undefined;
    while (level.length > 2) {
        const next: Point2[] = [];
        for (let i = 0; i + 1 < level.length; i++) {
            next.push([(1 - t) * level[i][0] + t * level[i + 1][0], (1 - t) * level[i][1] + t * level[i + 1][1]]);
        }
        level = next;
    }
    const [q0, q1] = level;
    return {q0, q1, touch: [(1 - t) * q0[0] + t * q1[0], (1 - t) * q0[1] + t * q1[1]]};
}

/** The parameters of a family of `count` lines: interior and evenly spaced, t_i = (i + 1) / (count + 1). One line is t = 1/2. */
export function envelopeParameters(count: number): number[] {
    if (!Number.isInteger(count) || count < ENVELOPE_LINES_MIN) return [];
    const n = Math.min(count, ENVELOPE_LINES_MAX);
    return Array.from({length: n}, (_, i) => (i + 1) / (n + 1));
}

export interface EnvelopeFamily {
    /** Q0, Q1 of each line, with a NaN after every line but the last, so a single curve draws separate segments. */
    readonly x: number[];
    readonly y: number[];
}

/** The segments of the family as one NaN-separated polyline: 3 * count - 1 entries. Empty without a curve. */
export function envelopeFamily(rows: Rows, count: number): EnvelopeFamily {
    const x: number[] = [], y: number[] = [];
    for (const t of envelopeParameters(count)) {
        const segment = tangentSegment(rows, t);
        if (!segment) continue;
        if (x.length) { x.push(NaN); y.push(NaN); }
        x.push(segment.q0[0], segment.q1[0]);
        y.push(segment.q0[1], segment.q1[1]);
    }
    return {x, y};
}

/**
 * All control points lie on one line (coincident points included), within a tolerance relative to the size of the point set.
 * Then every de Casteljau line lies on that line and the curve is a segment, not an envelope. `slack` widens the test by a
 * distance in the rows' units, for a caller whose points are only as exact as a drag.
 */
export function isCollinear(rows: Rows, slack = 0): boolean {
    if (rows.length < 3) return true;
    const origin = rows[0];
    let far = rows[0], farDistance = 0;
    for (const row of rows) {
        const distance = Math.hypot(row[0] - origin[0], row[1] - origin[1]);
        if (distance > farDistance) { farDistance = distance; far = row; }
    }
    if (farDistance === 0) return true;
    const dx = (far[0] - origin[0]) / farDistance, dy = (far[1] - origin[1]) / farDistance;
    return rows.every(row => Math.abs(dx * (row[1] - origin[1]) - dy * (row[0] - origin[0])) <= COLLINEAR_TOLERANCE * farDistance + slack);
}
