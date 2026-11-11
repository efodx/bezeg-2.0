import {Rational, RationalPoint} from '../../compgeo/rational';
import {solveLinearProgram, type LpConstraint, type LpDirection, type LpResult} from '../../optimization/lp2';
import type {IntegerRange, LpState} from '../../optimization/lpModel';
import {emptyPoly, rationalText, snapGrid, typedGrid, type Poly} from './contourScene';

/**
 * Pure helpers of the linear-programming graph (no React, JSXGraph or localization): the exact solution of a stored `LpState`, its
 * status, the drawing data (clipped region, clipped lines, view box) and the exact texts. Every status (infeasible, unbounded, unique
 * optimum, edge or ray of optima) is decided from the `Rational` results of `solveLinearProgram` and integer tests, never a double.
 * Only the drawing clips in doubles; it is an illustration of the exact region.
 */

export type LpStatus = 'infeasible' | 'unbounded' | 'flat' | 'unique' | 'segment' | 'ray';

export interface LpSolution {
    readonly result: LpResult;
    readonly status: LpStatus;
    /** Optimal value (exact) and the optimal vertices; null for 'infeasible' and 'unbounded'. */
    readonly value: Rational | null;
    readonly optimal: readonly RationalPoint[];
    /** A recession direction along which the objective grows, for 'unbounded'. */
    readonly improvingRay: LpDirection | null;
    /** Per vertex: the exact objective value and the number of constraints (rows and the two axes) that are tight there. */
    readonly vertexInfo: readonly {readonly point: RationalPoint; readonly value: Rational; readonly tight: number}[];
}

const ofInt = (n: number) => Rational.fromInt(n);

/** The exact value a x + b y at a rational point. */
export function evaluate(p: number, q: number, v: RationalPoint): Rational {
    return v.x.mul(ofInt(p)).add(v.y.mul(ofInt(q)));
}

export function solveState(state: LpState): LpSolution {
    const result = solveLinearProgram(state.constraints, state.objective);
    const {p, q} = state.objective;
    const vertexInfo = result.vertices.map(point => ({
        point,
        value: evaluate(p, q, point),
        tight: result.constraints.filter(k => evaluate(k.a, k.b, point).compare(ofInt(k.c)) === 0).length,
    }));
    if (result.region === 'infeasible') return {result, status: 'infeasible', value: null, optimal: [], improvingRay: null, vertexInfo};
    if (result.unbounded || result.optimum === null) {
        const improvingRay = result.rays.find(r => p * r.x + q * r.y > 0) ?? null;
        return {result, status: 'unbounded', value: null, optimal: [], improvingRay, vertexInfo};
    }
    const {value, vertices} = result.optimum;
    let status: LpStatus = vertices.length > 1 ? 'segment' : 'unique';
    if (p === 0 && q === 0) status = 'flat';
    else if (result.rays.some(r => p * r.x + q * r.y === 0)) status = 'ray';
    return {result, status, value, optimal: vertices, improvingRay: null, vertexInfo};
}

// ---- Texts that are the same in both languages ----

const sign = (n: number) => (n < 0 ? '−' : '+');

/** `a x + b y` with 1 and 0 left out and a true minus: "3x + 2y", "x − y", "−x", "y", "0" for a = b = 0. */
export function linearText(a: number, b: number): string {
    const term = (n: number, name: string) => (Math.abs(n) === 1 ? name : `${Math.abs(n)}${name}`);
    if (a === 0 && b === 0) return '0';
    if (a === 0) return `${b < 0 ? '−' : ''}${term(b, 'y')}`;
    if (b === 0) return `${a < 0 ? '−' : ''}${term(a, 'x')}`;
    return `${a < 0 ? '−' : ''}${term(a, 'x')} ${sign(b)} ${term(b, 'y')}`;
}

/** An integer with a true minus. */
export const integerText = (n: number): string => String(n).replace('-', '−');

export const rowLeft = (k: LpConstraint): string => linearText(k.a, k.b);

// ---- Drawing data ----

export interface Box {
    readonly xMin: number;
    readonly yMin: number;
    readonly xMax: number;
    readonly yMax: number;
}

/** The lower side of the view: the objective handle (p, q) lies in [-9, 9], so it is always visible. */
export const VIEW_LOW = -10;
export const VIEW_MIN_HIGH = 10;
export const VIEW_MAX_HIGH = 60;

/** The drawn square: depends on the vertices only, so dragging the objective never moves it. */
export function viewBox(solution: LpSolution): Box {
    let largest = 0;
    for (const v of solution.result.vertices) largest = Math.max(largest, v.x.toNumber(), v.y.toNumber());
    const high = Math.min(VIEW_MAX_HIGH, Math.max(VIEW_MIN_HIGH, Math.ceil(largest * 1.15) + 1));
    return {xMin: VIEW_LOW, yMin: VIEW_LOW, xMax: high, yMax: high};
}

/** The box as a counter-clockwise polygon. */
const boxPolygon = (box: Box): [number, number][] => [[box.xMin, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMax], [box.xMin, box.yMax]];

/** Clips a convex polygon to the half-plane a x + b y <= c (Sutherland-Hodgman, doubles). */
function clipHalfPlane(polygon: [number, number][], k: LpConstraint): [number, number][] {
    const out: [number, number][] = [];
    const side = (v: [number, number]) => k.a * v[0] + k.b * v[1] - k.c;
    for (let i = 0; i < polygon.length; i++) {
        const u = polygon[i];
        const v = polygon[(i + 1) % polygon.length];
        const su = side(u);
        const sv = side(v);
        if (su <= 0) out.push(u);
        if ((su < 0 && sv > 0) || (su > 0 && sv < 0)) {
            const t = su / (su - sv);
            out.push([u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1])]);
        }
    }
    return out;
}

/** The feasible region cut off by the box, as a closed outline (first point repeated), or empty. */
export function regionPoly(solution: LpSolution, box: Box): Poly {
    if (solution.status === 'infeasible') return emptyPoly();
    let polygon = boxPolygon(box);
    for (const k of solution.result.constraints) polygon = clipHalfPlane(polygon, k);
    if (polygon.length === 0) return emptyPoly();
    const closed = [...polygon, polygon[0]];
    return {x: closed.map(v => v[0]), y: closed.map(v => v[1])};
}

/** The line a x + b y = c inside the box, as two points, or empty when it misses the box (or a = b = 0). */
export function linePoly(a: number, b: number, c: number, box: Box): Poly {
    if (a === 0 && b === 0) return emptyPoly();
    const found: [number, number][] = [];
    const add = (x: number, y: number) => {
        if (x < box.xMin - 1e-9 || x > box.xMax + 1e-9 || y < box.yMin - 1e-9 || y > box.yMax + 1e-9) return;
        if (!found.some(f => Math.abs(f[0] - x) < 1e-9 && Math.abs(f[1] - y) < 1e-9)) found.push([x, y]);
    };
    if (b !== 0) for (const x of [box.xMin, box.xMax]) add(x, (c - a * x) / b);
    if (a !== 0) for (const y of [box.yMin, box.yMax]) add((c - b * y) / a, y);
    if (found.length < 2) return emptyPoly();
    return {x: [found[0][0], found[1][0]], y: [found[0][1], found[1][1]]};
}

/** The walk (or any vertex sequence) as doubles. */
export function pathPoly(points: readonly RationalPoint[]): Poly {
    return {x: points.map(v => v.x.toNumber()), y: points.map(v => v.y.toNumber())};
}

// ---- Entry of whole numbers: a typed value is refused, a drag snaps ----

/** A typed integer in the range, or undefined (off-grid, out of range, not a number; never rounded). */
export const typedInteger = (value: number, range: IntegerRange): number | undefined => typedGrid(value, 1, range);
/** A drag: the nearest integer inside the range. */
export const snapInteger = (coordinate: number, range: IntegerRange): number | undefined => snapGrid(coordinate, 1, range);

/** The exact text of a rational, with a true minus; `rationalText` of the contour graph. */
export const exactText = (value: Rational): string => rationalText(value);
/** Whether the text of the rational needs a decimal beside it (it is a proper fraction). */
export const isFraction = (value: Rational): boolean => value.den !== 1n;
