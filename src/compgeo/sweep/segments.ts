/**
 * Exact segment primitives for the Bentley-Ottmann lessons (spec C2, ADR 0035). Segments are closed and have grid
 * endpoints. Every decision (none/point/overlap, order at the sweep line, ties) is an `orient` sign or a Rational
 * comparison; no tolerance and no floating point appears. Pure TypeScript.
 */
import type {GridPoint} from '../grid';
import {onSegment, orient} from '../predicates';
import {Rational, RationalPoint} from '../rational';
import {compareEventPositions} from './eventOrder';

/** A closed segment between two grid endpoints (a zero-length segment is the single point). */
export interface Segment {
    readonly a: GridPoint;
    readonly b: GridPoint;
}

/** Outcome of intersecting two closed segments; `point` carries the exact coordinates. */
export type SegmentContact =
    | { readonly kind: 'none' }
    | { readonly kind: 'point'; readonly point: RationalPoint }
    | { readonly kind: 'overlap' };

/** The endpoint processed first by a downward sweep: highest y, ties by smallest x (a horizontal one: the left). */
export function upperEndpoint(s: Segment): GridPoint {
    return compareEventPositions(RationalPoint.fromGrid(s.b), RationalPoint.fromGrid(s.a)) < 0 ? s.b : s.a;
}

/** The endpoint processed last: the other one (equal to `upperEndpoint` for a zero-length segment). */
export function lowerEndpoint(s: Segment): GridPoint {
    return upperEndpoint(s) === s.a ? s.b : s.a;
}

function sameGrid(p: GridPoint, q: GridPoint): boolean {
    return p.x === q.x && p.y === q.y;
}

/** Lexicographic order; along a common line it is the order along the line. */
function compareLex(p: GridPoint, q: GridPoint): number {
    return p.x !== q.x ? p.x - q.x : p.y - q.y;
}

const NONE: SegmentContact = {kind: 'none'};
const OVERLAP: SegmentContact = {kind: 'overlap'};

function pointContact(p: GridPoint): SegmentContact {
    return {kind: 'point', point: RationalPoint.fromGrid(p)};
}

/**
 * Intersection of the closed segments s and t: `none`, a single `point`, or `overlap` (collinear with a common
 * sub-segment of positive length). Touching at an endpoint is a `point`. The case is decided by four `orient` signs
 * (plus `onSegment` for endpoint contacts); only the coordinates of a proper crossing are computed, in rationals.
 */
export function segmentIntersection(s: Segment, t: Segment): SegmentContact {
    const {a, b} = s;
    const {a: c, b: d} = t;
    const sPoint = sameGrid(a, b);
    const tPoint = sameGrid(c, d);
    if (sPoint && tPoint) return sameGrid(a, c) ? pointContact(a) : NONE;
    if (sPoint) return onSegment(a, c, d) ? pointContact(a) : NONE;
    if (tPoint) return onSegment(c, a, b) ? pointContact(c) : NONE;

    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);
    if (o1 * o2 < 0 && o3 * o4 < 0) {
        // Proper crossing: a + u (b - a) with u = cross(c - a, d - c) / cross(b - a, d - c).
        const ab = RationalPoint.fromGrid(b).sub(RationalPoint.fromGrid(a));
        const cd = RationalPoint.fromGrid(d).sub(RationalPoint.fromGrid(c));
        const ac = RationalPoint.fromGrid(c).sub(RationalPoint.fromGrid(a));
        const u = ac.cross(cd).div(ab.cross(cd));
        return {kind: 'point', point: RationalPoint.fromGrid(a).add(ab.scale(u))};
    }
    if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
        // Collinear: intersect the two lexicographic intervals along the common line.
        const [lo1, hi1] = compareLex(a, b) <= 0 ? [a, b] : [b, a];
        const [lo2, hi2] = compareLex(c, d) <= 0 ? [c, d] : [d, c];
        const lo = compareLex(lo1, lo2) >= 0 ? lo1 : lo2;
        const hi = compareLex(hi1, hi2) <= 0 ? hi1 : hi2;
        const order = compareLex(lo, hi);
        return order > 0 ? NONE : order === 0 ? pointContact(lo) : OVERLAP;
    }
    // Not collinear and not a proper crossing: they meet only if an endpoint of one lies on the other (a single point).
    if (onSegment(c, a, b)) return pointContact(c);
    if (onSegment(d, a, b)) return pointContact(d);
    if (onSegment(a, c, d)) return pointContact(a);
    if (onSegment(b, c, d)) return pointContact(b);
    return NONE;
}

function isHorizontal(s: Segment): boolean {
    return s.a.y === s.b.y;
}

/** True when the closed segment contains the sweep height y (and, for a horizontal one, the abscissa x0). */
function containsSweepPosition(s: Segment, y: Rational, x0: Rational): boolean {
    const up = upperEndpoint(s);
    const low = lowerEndpoint(s);
    if (y.compare(Rational.fromInt(low.y)) < 0 || y.compare(Rational.fromInt(up.y)) > 0) return false;
    if (!isHorizontal(s)) return true;
    const left = Rational.fromInt(Math.min(s.a.x, s.b.x));
    const right = Rational.fromInt(Math.max(s.a.x, s.b.x));
    return left.compare(x0) <= 0 && x0.compare(right) <= 0;
}

/** Exact abscissa of a non-horizontal segment at height y (y within its extent). */
function xAt(s: Segment, y: Rational): Rational {
    const up = upperEndpoint(s);
    const low = lowerEndpoint(s);
    const dy = Rational.fromInt(up.y - low.y);
    const dx = Rational.fromInt(up.x - low.x);
    return Rational.fromInt(low.x).add(dx.mul(y.sub(Rational.fromInt(low.y))).div(dy));
}

/** dx/dy of a non-horizontal segment, upper minus lower; just below the line x decreases at this rate. */
function slope(s: Segment): Rational {
    const up = upperEndpoint(s);
    const low = lowerEndpoint(s);
    return Rational.fromInt(up.x - low.x).div(Rational.fromInt(up.y - low.y));
}

/**
 * Order of two segments on the sweep line at height y while the event point is (x0, y): -1 when s lies left of t,
 * 1 when right, 0 when they are indistinguishable (collinear overlap, or two horizontals through the event point).
 * Segments are ordered by their exact x at y. A horizontal segment (or a point) has x = x0, the abscissa of the
 * event. When both pass through the same point of the line, the tie is broken by the order just below the line: the
 * segment with the larger dx/dy is further left; a horizontal segment goes last (rightmost). Both segments must
 * contain height y, and a horizontal one must contain (x0, y); otherwise a RangeError is thrown.
 */
export function compareAtSweep(s: Segment, t: Segment, y: Rational, x0: Rational): -1 | 0 | 1 {
    if (!containsSweepPosition(s, y, x0) || !containsSweepPosition(t, y, x0)) {
        throw new RangeError('compareAtSweep: both segments must contain the sweep position');
    }
    const sHorizontal = isHorizontal(s);
    const tHorizontal = isHorizontal(t);
    const byX = (sHorizontal ? x0 : xAt(s, y)).compare(tHorizontal ? x0 : xAt(t, y));
    if (byX !== 0) return byX;
    if (sHorizontal || tHorizontal) return sHorizontal === tHorizontal ? 0 : sHorizontal ? 1 : -1;
    return slope(t).compare(slope(s));
}

/** One intersection point with the indices (ascending) of every segment passing through it. */
export interface IntersectionPoint {
    readonly point: RationalPoint;
    readonly segments: readonly number[];
}

export interface BruteForceResult {
    /** Isolated intersection points, in event processing order (decreasing y, ties by increasing x). */
    readonly points: readonly IntersectionPoint[];
    /** Pairs [i, j], i < j, of collinear segments sharing a sub-segment of positive length, in lexicographic order. */
    readonly overlaps: readonly (readonly [number, number])[];
}

function inClosedRange(v: Rational, u: Rational, w: Rational): boolean {
    const [lo, hi] = u.compare(w) <= 0 ? [u, w] : [w, u];
    return lo.compare(v) <= 0 && v.compare(hi) <= 0;
}

/** Exact membership of a rational point in a closed segment, by orientation sign and bounding box. */
function containsPoint(s: Segment, p: RationalPoint): boolean {
    const a = RationalPoint.fromGrid(s.a);
    const b = RationalPoint.fromGrid(s.b);
    if (b.sub(a).cross(p.sub(a)).sign() !== 0) return false;
    return inClosedRange(p.x, a.x, b.x) && inClosedRange(p.y, a.y, b.y);
}

/**
 * All O(n^2) pairwise results: every distinct intersection point with the set of segments through it (including
 * segments that only overlap one another there), and the overlapping pairs. The oracle for Bentley-Ottmann.
 */
export function bruteForceIntersections(segments: readonly Segment[]): BruteForceResult {
    const points: RationalPoint[] = [];
    const overlaps: [number, number][] = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const contact = segmentIntersection(segments[i], segments[j]);
            if (contact.kind === 'overlap') overlaps.push([i, j]);
            else if (contact.kind === 'point' && !points.some((p) => p.equals(contact.point))) points.push(contact.point);
        }
    }
    points.sort(compareEventPositions);
    return {
        points: points.map((point) => ({
            point,
            segments: segments.flatMap((s, index) => (containsPoint(s, point) ? [index] : [])),
        })),
        overlaps,
    };
}
