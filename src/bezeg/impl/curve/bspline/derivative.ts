/**
 * Derivative sources of a planar B-spline for the curvature kernel (`../curvature.ts`), from the hodograph
 * Q_i = p (P_{i+1} - P_i) / (v_{i+p+1} - v_{i+1}), a degree p-1 B-spline on the knots v with the first and last
 * knot dropped. A zero-length knot interval gives a zero row; such a Q_i is never active in a non-empty span
 * (its basis function has empty support), so it is skipped. The curvature at a knot is one-sided per span:
 * every span has its own polynomial source and {@link knotJoins} pairs the two sides for `combAtJoin`.
 */
import type {DerivativeSource, JoinSide, Vec2} from '../curvature';
import {assertValidKnotVector, findSpan} from './knot-vector';

export interface SplineSpanSource {
    /** The non-empty knot span [start, end] this polynomial piece belongs to. */
    start: number;
    end: number;
    /** The span's own polynomial (extended by its formula outside [start, end], so `at(end)` is the left side). */
    source: DerivativeSource;
}

export interface KnotJoin {
    /** The interior knot value. */
    t: number;
    /** Left span's end and right span's start, ready for `combAtJoin`. */
    left: JoinSide;
    right: JoinSide;
}

type Rows = readonly (readonly number[])[];

function planar(P: Rows, count: number): number[][] {
    if (P.length !== count) {
        throw new RangeError(`Expected ${count} control points, got ${P.length}`);
    }
    return P.map(row => {
        if (!row.every(Number.isFinite)) {
            throw new RangeError('Control point coordinates must be finite');
        }
        if (row.length === 2 || (row.length === 3 && row[2] === 0)) {
            return [row[0], row[1]];
        }
        throw new RangeError('Curvature only supports planar control points [x, y]');
    });
}

function extent(rows: Rows): number {
    const xs = rows.map(r => r[0]);
    const ys = rows.map(r => r[1]);
    const size = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return size > 0 ? size : 1;
}

/** The hodograph control rows and knots of a degree p spline (p >= 1). */
function hodograph(v: readonly number[], p: number, rows: number[][]): { knots: number[], rows: number[][] } {
    const result: number[][] = [];
    for (let i = 0; i + 1 < rows.length; i++) {
        const span = v[i + p + 1] - v[i + 1];
        result.push(span > 0 ? rows[i + 1].map((value, d) => p * (value - rows[i][d]) / span) : rows[i].map(() => 0));
    }
    return {knots: v.slice(1, v.length - 1), rows: result};
}

/** de Boor on the polynomial of knot span `span` (u_span < u_{span+1}) at any `t`; no span search. */
function evalOnSpan(v: readonly number[], p: number, rows: Rows, span: number, t: number): number[] {
    let current = rows.slice(span - p, span + 1).map(row => [...row]);
    for (let r = 1; r <= p; r++) {
        const next: number[][] = [];
        for (let j = span - p + r; j <= span; j++) {
            const alpha = (t - v[j]) / (v[j + p + 1 - r] - v[j]);
            const before = current[j - 1 - (span - p + r - 1)];
            const after = current[j - (span - p + r - 1)];
            next.push(before.map((value, d) => (1 - alpha) * value + alpha * after[d]));
        }
        current = next;
    }
    return current[0];
}

function spanSource(u: readonly number[], k: number, P: number[][], span: number, scale: number): DerivativeSource {
    const zero = [0, 0];
    const first = k >= 1 ? hodograph(u, k, P) : null;
    const second = first && k >= 2 ? hodograph(first.knots, k - 1, first.rows) : null;
    return {
        scale,
        at(t) {
            const p = evalOnSpan(u, k, P, span, t);
            // The span index shifts by one per hodograph (one knot dropped at the front).
            const d1 = first ? evalOnSpan(first.knots, k - 1, first.rows, span - 1, t) : zero;
            const d2 = second ? evalOnSpan(second.knots, k - 2, second.rows, span - 2, t) : zero;
            return {point: [p[0], p[1]] as Vec2, d1: [d1[0], d1[1]] as Vec2, d2: [d2[0], d2[1]] as Vec2};
        },
    };
}

/** Per non-empty span of the domain, in order: its interval and its own polynomial source. */
export function spanSources(u: readonly number[], k: number, P: Rows): SplineSpanSource[] {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    const rows = planar(P, n + 1);
    const scale = extent(rows);
    const result: SplineSpanSource[] = [];
    for (let span = k; span <= n; span++) {
        if (u[span] < u[span + 1]) {
            result.push({start: u[span], end: u[span + 1], source: spanSource(u, k, rows, span, scale)});
        }
    }
    return result;
}

/**
 * r, r' and r'' of the whole curve over the domain. At an interior knot it returns the right-hand span
 * (right-continuous); at the right end the last non-empty span. For one-sided values at a knot use
 * {@link spanSources} or {@link knotJoins}, never sampling across it.
 */
export function derivativeSource(u: readonly number[], k: number, P: Rows): DerivativeSource {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    const rows = planar(P, n + 1);
    const scale = extent(rows);
    const spans = new Map<number, DerivativeSource>();
    return {
        scale,
        at(t) {
            const span = findSpan(u, k, n, t);
            let source = spans.get(span);
            if (!source) {
                source = spanSource(u, k, rows, span, scale);
                spans.set(span, source);
            }
            return source.at(t);
        },
    };
}

/** One entry per distinct interior knot: the two one-sided sources to hand to `combAtJoin`. */
export function knotJoins(u: readonly number[], k: number, P: Rows): KnotJoin[] {
    const spans = spanSources(u, k, P);
    const joins: KnotJoin[] = [];
    for (let i = 0; i + 1 < spans.length; i++) {
        const t = spans[i].end;
        joins.push({t, left: {source: spans[i].source, t}, right: {source: spans[i + 1].source, t}});
    }
    return joins;
}
