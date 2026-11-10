/**
 * Exact two-variable linear programming (level-sets task 03, ADR 0053 section 4).
 * Constraints a*x + b*y <= c with integer coefficients; x >= 0 and y >= 0 are always added. The objective is
 * max p*x + q*y with integers. Every decision (vertex feasibility, ties, unbounded, order) is exact `Rational`
 * arithmetic, never a double. Pure TypeScript: no React, JSXGraph or localization.
 */
import {Rational, RationalPoint} from '../compgeo/rational';

export interface LpConstraint {
    readonly a: number;
    readonly b: number;
    readonly c: number;
}

export interface LpDirection {
    readonly x: number;
    readonly y: number;
}

export type LpRegionKind = 'infeasible' | 'point' | 'segment' | 'polygon' | 'unbounded';

export interface LpResult {
    /** The user constraints followed by `-x <= 0` and `-y <= 0` (appended unless already present). */
    readonly constraints: readonly LpConstraint[];
    /** 'unbounded' for any feasible region with a recession ray, whatever its vertex count. */
    readonly region: LpRegionKind;
    /** Distinct vertices; counter-clockwise for a bounded polygon, otherwise in lexicographic order. */
    readonly vertices: readonly RationalPoint[];
    /** False for an infeasible region and for a region with an unbounded direction. */
    readonly bounded: boolean;
    /** Extreme ray directions of the recession cone (primitive integer vectors, distinct), empty when bounded. */
    readonly rays: readonly LpDirection[];
    /** Feasible and some recession direction improves the objective: no optimum exists. */
    readonly unbounded: boolean;
    /** Maximum objective value and every vertex attaining it; null when infeasible or unbounded. */
    readonly optimum: { readonly value: Rational; readonly vertices: readonly RationalPoint[] } | null;
    /** Simplex walk on a bounded polygon from the origin (if feasible, else the first vertex); else empty. */
    readonly walk: readonly RationalPoint[];
    /** The walk stopped beside an equal neighbour: a whole optimal edge. */
    readonly optimalEdge: boolean;
}

const X_NONNEG: LpConstraint = {a: -1, b: 0, c: 0};
const Y_NONNEG: LpConstraint = {a: 0, b: -1, c: 0};

function assertInt(value: number, name: string): void {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be a safe integer`);
}

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

function big(n: number): bigint {
    return BigInt(n);
}

/** Exact value a*x + b*y of integer coefficients at a rational point. */
function lhs(a: number, b: number, v: RationalPoint): Rational {
    return v.x.mul(Rational.fromInt(a)).add(v.y.mul(Rational.fromInt(b)));
}

function holds(k: LpConstraint, v: RationalPoint): boolean {
    return lhs(k.a, k.b, v).compare(Rational.fromInt(k.c)) <= 0;
}

function objectiveAt(p: number, q: number, v: RationalPoint): Rational {
    return lhs(p, q, v);
}

function lexCompare(u: RationalPoint, v: RationalPoint): number {
    return u.x.compare(v.x) || u.y.compare(v.y);
}

/** Intersection of two constraint lines by Cramer's rule, or null when parallel. */
function intersect(k1: LpConstraint, k2: LpConstraint): RationalPoint | null {
    const d = big(k1.a) * big(k2.b) - big(k2.a) * big(k1.b);
    if (d === 0n) return null;
    const nx = big(k1.c) * big(k2.b) - big(k2.c) * big(k1.b);
    const ny = big(k1.a) * big(k2.c) - big(k2.a) * big(k1.c);
    return new RationalPoint(Rational.fromBigInt(nx, d), Rational.fromBigInt(ny, d));
}

/** Exact doubled signed area (shoelace) of rational vertices, positive counter-clockwise. */
export function doubledRationalArea(vertices: readonly RationalPoint[]): Rational {
    let sum = Rational.ZERO;
    for (let i = 0; i < vertices.length; i++) {
        const u = vertices[i];
        const v = vertices[(i + 1) % vertices.length];
        sum = sum.add(u.cross(v));
    }
    return sum;
}

/** Counter-clockwise order about the vertex mean: a half-plane split, then the sign of the cross product. */
function orderCcw(vertices: readonly RationalPoint[]): RationalPoint[] {
    const n = Rational.fromInt(vertices.length);
    const sum = vertices.reduce((s, v) => s.add(v), new RationalPoint(Rational.ZERO, Rational.ZERO));
    const centre = new RationalPoint(sum.x.div(n), sum.y.div(n));
    const half = (r: RationalPoint): number => (r.y.sign() > 0 || (r.y.sign() === 0 && r.x.sign() > 0) ? 0 : 1);
    return vertices
        .map(v => ({v, r: v.sub(centre)}))
        .sort((s, t) => half(s.r) - half(t.r) || -s.r.cross(t.r).sign())
        .map(s => s.v);
}

export function solveLinearProgram(
    userConstraints: readonly LpConstraint[],
    objective: { readonly p: number; readonly q: number },
): LpResult {
    userConstraints.forEach((k, i) => {
        assertInt(k.a, `constraint ${i} a`);
        assertInt(k.b, `constraint ${i} b`);
        assertInt(k.c, `constraint ${i} c`);
        if (k.a === 0 && k.b === 0) throw new RangeError(`constraint ${i} has a = b = 0`);
    });
    assertInt(objective.p, 'objective p');
    assertInt(objective.q, 'objective q');
    const {p, q} = objective;
    const constraints = [...userConstraints];
    for (const axis of [X_NONNEG, Y_NONNEG]) {
        if (!constraints.some(k => k.a === axis.a && k.b === axis.b && k.c === axis.c)) constraints.push(axis);
    }

    const vertices: RationalPoint[] = [];
    for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
            const v = intersect(constraints[i], constraints[j]);
            if (v === null || !constraints.every(k => holds(k, v))) continue;
            if (!vertices.some(u => u.equals(v))) vertices.push(v);
        }
    }
    vertices.sort(lexCompare);

    if (vertices.length === 0) {
        return {
            constraints, region: 'infeasible', vertices, bounded: false, rays: [], unbounded: false,
            optimum: null, walk: [], optimalEdge: false,
        };
    }

    const candidates: LpDirection[] = [];
    for (const k of constraints) {
        for (const s of [1, -1]) {
            const g = gcd(k.a, k.b);
            const d = {x: (s * k.b) / g, y: (-s * k.a) / g};
            if (!candidates.some(e => e.x === d.x && e.y === d.y)) candidates.push(d);
        }
    }
    const rays = candidates.filter(d => constraints.every(k => k.a * d.x + k.b * d.y <= 0));
    const bounded = rays.length === 0;
    const unbounded = rays.some(d => p * d.x + q * d.y > 0);
    const region: LpRegionKind = !bounded ? 'unbounded' : vertices.length === 1 ? 'point' : vertices.length === 2 ? 'segment' : 'polygon';

    let optimum: LpResult['optimum'] = null;
    if (!unbounded) {
        const values = vertices.map(v => objectiveAt(p, q, v));
        const best = values.reduce((m, v) => (v.compare(m) > 0 ? v : m));
        optimum = {value: best, vertices: vertices.filter((_, i) => values[i].equals(best))};
    }

    let ordered: readonly RationalPoint[] = vertices;
    let walk: RationalPoint[] = [];
    let optimalEdge = false;
    if (region === 'polygon') {
        ordered = orderCcw(vertices);
        const origin = new RationalPoint(Rational.ZERO, Rational.ZERO);
        let at = Math.max(0, ordered.findIndex(v => v.equals(origin)));
        walk = [ordered[at]];
        const n = ordered.length;
        for (;;) {
            const here = objectiveAt(p, q, ordered[at]);
            const next = (at + 1) % n;
            const prev = (at + n - 1) % n;
            const vn = objectiveAt(p, q, ordered[next]);
            const vp = objectiveAt(p, q, ordered[prev]);
            const cn = vn.compare(here);
            const cp = vp.compare(here);
            if (cn <= 0 && cp <= 0) {
                optimalEdge = cn === 0 || cp === 0;
                break;
            }
            at = cn > 0 && (cp <= 0 || vn.compare(vp) >= 0) ? next : prev;
            walk.push(ordered[at]);
        }
    }

    return {constraints, region, vertices: ordered, bounded, rays, unbounded, optimum, walk, optimalEdge};
}
