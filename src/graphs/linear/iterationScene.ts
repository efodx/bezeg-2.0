import {classifyEigen} from '../../linear/eigen2';
import {
    collapses, iterationOutcome, type IterationOutcome, orbit, type Orbit, SETTLED_ANGLE_DEGREES, startsOnOtherEigenvector,
} from '../../linear/iterate2';
import {ITERATE_STEP_MAX} from '../../linear/linearMapModel';
import {type Mat2, type Vec2} from '../../linear/matrix2';
import {companion, discreteStability, type DiscreteStability, exactTraceDet, flowStability} from '../../linear/stability2';
import type {Polyline} from './linearMapScene';

/**
 * The pure parts of the iterate and tracedet modes (Batch D, lessons L6 and L7): the numbers and polylines the graph draws, derived
 * from the matrix and the start vector with the `src/linear` kernels and nothing else. Free of React, JSXGraph and localization.
 * Exact statements (outcome, other eigenvector, triangle position, flow stability) come from the kernel's exact tests on snapped
 * entries; the orbit, the angle, the stretch and the Rayleigh quotient are floating point and are labelled computed by the graph.
 */

/** Iterates farther than this from the origin are not drawn (the board is about 24 wide); the readouts still show them. */
export const DRAW_LIMIT = 1000;
/** The normalised iterate is drawn as an arrow of this length. */
export const ARROW_LENGTH = 3;
/** The view of the trace-determinant plane: tau from -10 to 10, delta from -4 to 11 (the example E at (7, 10) is inside). */
export const TRACE_DET_VIEW: readonly [number, number, number, number] = [-10, 11, 10, -4];
/** The inset is dragged on the entry grid, so tau and delta stay in [-4, 4]. */
export const TRACE_DET_DRAG_LIMIT = 4;
/** The vertices of the stability triangle in the (tau, delta) plane. */
export const STABILITY_TRIANGLE: readonly Vec2[] = [[-2, 1], [2, 1], [0, -1]];

export interface IterationView {
    readonly orbit: Orbit;
    /** The exact class of the matrix (L6). */
    readonly outcome: IterationOutcome;
    /** A^2 = 0: the orbit collapses and no direction exists. */
    readonly collapsed: boolean;
    /** Exact: the start lies on the eigenvector that is not the dominant one. */
    readonly otherEigenvector: boolean;
    /** Exact: the start is nonzero and A sends it to 0 (it lies on the eigenvector of eigenvalue 0), so the iterates are 0 from step 1. */
    readonly startToZero: boolean;
    /** Unit directions of the real eigen-lines; `dominant` is the one that attracts when there is one. */
    readonly dominantLine: Vec2 | undefined;
    readonly otherLine: Vec2 | undefined;
}

export function deriveIteration(matrix: Mat2, start: Vec2): IterationView {
    const run = orbit(matrix, start, ITERATE_STEP_MAX);
    const eigen = classifyEigen(matrix);
    const collapsed = collapses(matrix);
    let dominantLine: Vec2 | undefined;
    let otherLine: Vec2 | undefined;
    if (!collapsed && eigen.kind === 'distinct-real') {
        const [first, second] = eigen.eigenvectors;
        if (run.dominantDirection) {
            dominantLine = run.dominantDirection;
            otherLine = dominantLine === first ? second : first;
        } else {
            [dominantLine, otherLine] = [first, second];
        }
    } else if (!collapsed && eigen.kind === 'repeated' && eigen.repeated === 'defective') {
        dominantLine = eigen.eigenvector;
    }
    const startToZero = !collapsed && (start[0] !== 0 || start[1] !== 0)
        && matrix[0][0] * start[0] + matrix[0][1] * start[1] === 0 && matrix[1][0] * start[0] + matrix[1][1] * start[1] === 0;
    return {
        orbit: run, outcome: iterationOutcome(matrix), collapsed, otherEigenvector: startsOnOtherEigenvector(matrix, start), startToZero, dominantLine, otherLine,
    };
}

/** True when the Rayleigh quotient estimates the dominant eigenvalue: the class is `dominant` and the start is not on the other eigenvector. */
export const estimatesDominant = (view: IterationView): boolean => view.outcome === 'dominant' && !view.otherEigenvector && !view.collapsed;

export interface IterateAt {
    readonly step: number;
    readonly point: Vec2;
    readonly norm: number;
    /** The iterate divided by its length; undefined for the zero vector. */
    readonly unit: Vec2 | undefined;
    /** Degrees between the iterate's line and the dominant direction; undefined where there is none. */
    readonly angleError: number | undefined;
    /** |A^k v| / |A^(k-1) v| for the step just made; undefined at step 0 or after a zero iterate. */
    readonly stretch: number | undefined;
    /** (x . Ax) / (x . x) for x = A^k v: an estimate of the dominant eigenvalue, signed; undefined for the zero vector. */
    readonly rayleigh: number | undefined;
    readonly zero: boolean;
}

/** The numbers of step k (clamped to the stored orbit, which stops before an overflow). */
export function iterateAt(view: IterationView, matrix: Mat2, step: number): IterateAt {
    const run = view.orbit;
    const k = Math.min(step, run.steps);
    const point = run.points[k];
    const norm = Math.hypot(point[0], point[1]);
    const zero = norm === 0;
    const image: Vec2 = [matrix[0][0] * point[0] + matrix[0][1] * point[1], matrix[1][0] * point[0] + matrix[1][1] * point[1]];
    return {
        step: k,
        point,
        norm,
        unit: zero ? undefined : [point[0] / norm, point[1] / norm],
        angleError: run.angleErrors[k],
        stretch: k > 0 ? run.stretches[k - 1] : undefined,
        rayleigh: zero ? undefined : (point[0] * image[0] + point[1] * image[1]) / (norm * norm),
        zero,
    };
}

export {SETTLED_ANGLE_DEGREES};

/** The iterates 0..step as a polyline; it breaks at an iterate that is too far to draw. */
export function orbitPolyline(view: IterationView, step: number): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    let broken = false;
    for (let k = 0; k <= Math.min(step, view.orbit.steps); k++) {
        const [px, py] = view.orbit.points[k];
        if (Math.max(Math.abs(px), Math.abs(py)) > DRAW_LIMIT) {
            if (!broken && x.length > 0) { x.push(Number.NaN); y.push(Number.NaN); }
            broken = true;
            continue;
        }
        broken = false;
        x.push(px);
        y.push(py);
    }
    return {x, y};
}

/** The line through the origin in direction d, long enough to cross the board. */
export function lineThroughOrigin(d: Vec2 | undefined, half = 40): Polyline {
    return d ? {x: [-half * d[0], half * d[0]], y: [-half * d[1], half * d[1]]} : {x: [], y: []};
}

export interface TraceDetView {
    readonly tau: number;
    readonly delta: number;
    /** tau^2 - 4 delta, a multiple of 1/16: its sign is the parabola side. */
    readonly discriminant: number;
    readonly stability: DiscreteStability;
    /** The flow x' = Ax is stable: tau < 0 and delta > 0. */
    readonly flowStable: boolean;
}

export function deriveTraceDet(matrix: Mat2): TraceDetView {
    const {tau, delta} = exactTraceDet(matrix);
    return {tau, delta, discriminant: tau * tau - 4 * delta, stability: discreteStability(matrix), flowStable: flowStability(matrix)};
}

/** The matrix a drag of the inset gives: the companion matrix of the snapped (tau, delta); entries are quarters and never -0. */
export function companionOfDrag(tau: number, delta: number): Mat2 {
    const m = companion(tau, delta);
    return [[m[0][0] + 0, m[0][1] + 0], [m[1][0] + 0, m[1][1] + 0]];
}

/** The parabola delta = tau^2 / 4 over the plotted tau range, cut where it leaves the view. */
export function parabolaPolyline(): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= 200; i++) {
        const tau = -10 + i / 10;
        const delta = tau * tau / 4;
        if (delta > TRACE_DET_VIEW[1]) continue;
        x.push(tau);
        y.push(delta);
    }
    return {x, y};
}
