import {CATALOGUE, type CatalogueId, type Window2} from '../../levelsets/functions2';
import {contourLength, levelCurve, marchingSquares, type Segment2} from '../../levelsets/contours';
import {classifyValley, descend, iterationsUntil, type DescentResult, type ValleyBehaviour} from '../../levelsets/descent';
import {
    CIRCLE_STEPS, CONSTRAINT_CIRCLE_R2, CONSTRAINT_LINE, LAGRANGE_WINDOW_HALF, circleAngleOf, startOf, type ContourState,
    type IntegerRange,
} from '../../levelsets/contourModel';
import {
    circlePoint, circleTangency, lineTangency, lineTangencyPoints, linePoint, type CircleTangency, type LineTangency, type LineTangencyPoints,
} from '../../levelsets/constrained';
import {Rational, RationalPoint} from '../../compgeo/rational';
import type {SceneMesh, SceneMeshOwner, SurfaceScene, Xyz} from '../patches/surface-view/surfaceScene';

/**
 * Pure helpers of the contour graph (no React, JSXGraph or localization): the numbers, curve data and surface scene that the
 * kernels give for a stored `ContourState`. Contours are marching-squares segments (illustrations); the gradient, the descent path
 * and the tangency come from the kernels; the exact statuses (line tangency, the `valley` rule) are integer or `Rational` tests.
 */

/** Cells per side of the contour grid (ADR 0053 section 2: N = 60 default, measured at 40, 80 and 120). */
export const GRID_N = 60;
/** Cells per side of the surface mesh (1681 vertices, 3200 triangles). */
export const SURFACE_N = 40;
/** Step of the central difference that LS2's `numeric` toggle compares with the analytic gradient (a computed estimate). */
export const NUMERIC_H = 0.01;
/** The convergence threshold of the readout: first step with f below it. */
export const DESCENT_EPS = 1e-6;
/** A point farther than this many window half-widths is not drawn (the descent path of a diverging step). */
export const DRAW_LIMIT_FACTOR = 4;
export const CIRCLE_SAMPLES = 96;

export interface Poly {
    readonly x: number[];
    readonly y: number[];
}
export const emptyPoly = (): Poly => ({x: [], y: []});

export const fieldKey = (value: unknown): string => JSON.stringify(value);

// ---- Grid entry: typed values are refused, a drag snaps ----

/** A typed value: the grid integer, or undefined when it is off the grid, outside the range or not a number (never rounded). */
export function typedGrid(value: number, scale: number, range: IntegerRange): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const scaled = value * scale;
    const rounded = Math.round(scaled);
    if (Math.abs(scaled - rounded) > 1e-6 || rounded < range.min || rounded > range.max) return undefined;
    return rounded === 0 ? 0 : rounded;
}

/** A drag: the nearest grid integer inside the range. */
export function snapGrid(coordinate: number, scale: number, range: IntegerRange): number | undefined {
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) return undefined;
    const snapped = Math.min(range.max, Math.max(range.min, Math.round(coordinate * scale)));
    return snapped === 0 ? 0 : snapped;
}

// ---- Levels and contours ----

/** The distance between neighbouring drawn levels: dyadic, so marching squares sees exact doubles; `hills` has values in [-1, 1]. */
export const levelSpacing = (fn: CatalogueId): number => (fn === 'hills' ? 1 / 8 : 1);

/** The levels c, c + d, c + 2d, ... (count of them); the first is the chosen level. */
export function levelValues(level: number, count: number, fn: CatalogueId): number[] {
    return Array.from({length: count}, (_, k) => level + k * levelSpacing(fn));
}

export const contourSegments = (fn: CatalogueId, window: Window2, c: number): Segment2[] => marchingSquares(CATALOGUE[fn].value, window, GRID_N, c);

export interface LevelDrawing {
    readonly c: number;
    readonly segments: readonly Segment2[];
}

/** The contours of the levels, the chosen level first. */
export function levelDrawings(fn: CatalogueId, window: Window2, level: number, count: number): LevelDrawing[] {
    return levelValues(level, count, fn).map(c => ({c, segments: contourSegments(fn, window, c)}));
}

export function joinCurves(drawings: readonly LevelDrawing[]): Poly {
    const out = emptyPoly();
    for (const drawing of drawings) {
        const {x, y} = levelCurve(drawing.segments);
        out.x.push(...x);
        out.y.push(...y);
    }
    return out;
}

export const segmentsPoly = (segments: readonly Segment2[]): Poly => levelCurve(segments);
export const totalLength = (drawings: readonly LevelDrawing[]): number => drawings.reduce((sum, d) => sum + contourLength(d.segments), 0);

// ---- Gradient (LS2) ----

export interface GradientInfo {
    readonly gradient: readonly [number, number];
    readonly norm: number;
    /** Exactly the zero vector (the grid points never meet another critical point of the catalogue): no direction is invented. */
    readonly stationary: boolean;
    /** The unit tangent of the contour through the point (the gradient turned a quarter turn), null when stationary. */
    readonly tangent: readonly [number, number] | null;
    /** The gradient dotted with the unit tangent: 0 in exact arithmetic, a rounding-size number here (computed). */
    readonly dot: number | null;
}

export function gradientAt(fn: CatalogueId, x: number, y: number): GradientInfo {
    const [gx, gy] = CATALOGUE[fn].gradient(x, y);
    const norm = Math.hypot(gx, gy);
    const stationary = gx === 0 && gy === 0;
    if (stationary) return {gradient: [gx, gy], norm: 0, stationary, tangent: null, dot: null};
    const tangent: [number, number] = [-gy / norm, gx / norm];
    return {gradient: [gx, gy], norm, stationary, tangent, dot: gx * tangent[0] + gy * tangent[1]};
}

export interface NumericGradient {
    readonly estimate: readonly [number, number];
    /** The largest component difference from the analytic gradient. */
    readonly error: number;
}

/** The central difference (f(x + h) - f(x - h)) / 2h of each partial derivative, beside the analytic gradient (computed, both). */
export function numericGradient(fn: CatalogueId, x: number, y: number, h = NUMERIC_H): NumericGradient {
    const f = CATALOGUE[fn].value;
    const estimate: [number, number] = [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
    const [gx, gy] = CATALOGUE[fn].gradient(x, y);
    return {estimate, error: Math.max(Math.abs(estimate[0] - gx), Math.abs(estimate[1] - gy))};
}

/** The factor that draws the vectors so the longest is at most `fraction` of the window half-width (1 when it already fits). */
export function arrowScale(half: number, lengths: readonly number[], fraction = 0.4): number {
    const longest = Math.max(0, ...lengths);
    return longest <= fraction * half ? 1 : (fraction * half) / longest;
}

// ---- Descent (LS3) ----

export interface DescentInfo {
    readonly result: DescentResult;
    /** The path with the exact `valley` classification, undefined for the other functions (no convergence claim). */
    readonly behaviour: ValleyBehaviour | undefined;
    /** First step whose f is below DESCENT_EPS (computed), null when the path does not get there. */
    readonly settledAt: number | null;
}

export function descentInfo(state: Pick<ContourState, 'fn' | 'start' | 'step'>): DescentInfo {
    const start = {x: startOf(state.start[0]), y: startOf(state.start[1])};
    const result = descend(state.fn, start, state.step);
    return {
        result,
        behaviour: state.fn === 'valley' ? classifyValley(start, state.step) : undefined,
        settledAt: iterationsUntil(state.fn, result.path, DESCENT_EPS),
    };
}

/** The path points up to step k, cut before the first point beyond DRAW_LIMIT_FACTOR window half-widths. */
export function pathPoly(info: DescentInfo, upTo: number, half: number): Poly {
    const out = emptyPoly();
    const limit = DRAW_LIMIT_FACTOR * half;
    for (let i = 0; i <= Math.min(upTo, info.result.path.length - 1); i++) {
        const p = info.result.path[i];
        if (Math.abs(p.x) > limit || Math.abs(p.y) > limit) break;
        out.x.push(p.x);
        out.y.push(p.y);
    }
    return out;
}

/** The first step whose point is beyond the drawing limit (the picture stops there), or null. */
export function firstOutsideDrawing(info: DescentInfo, half: number): number | null {
    const limit = DRAW_LIMIT_FACTOR * half;
    const index = info.result.path.findIndex(p => Math.abs(p.x) > limit || Math.abs(p.y) > limit);
    return index < 0 ? null : index;
}

// ---- Constrained point (LS4) ----

export type LagrangeTangency =
    | {readonly kind: 'exact'; readonly tangency: LineTangency; readonly points: LineTangencyPoints}
    | {readonly kind: 'approximate'; readonly tangency: CircleTangency};

export interface LagrangeInfo {
    readonly x: number;
    readonly y: number;
    /** The exact point on the line constraint, undefined on the circle. */
    readonly exact: RationalPoint | undefined;
    readonly f: number;
    readonly gradF: readonly [number, number];
    readonly gradG: readonly [number, number];
    readonly tangency: LagrangeTangency;
}

export function lagrangeInfo(state: Pick<ContourState, 'fn' | 'constraint' | 'lineParam' | 'circleParam'>): LagrangeInfo {
    const {fn} = state;
    if (state.constraint === 'line') {
        const exact = linePoint(CONSTRAINT_LINE, Rational.of(state.lineParam, 4));
        const x = exact.x.toNumber();
        const y = exact.y.toNumber();
        return {
            x, y, exact, f: CATALOGUE[fn].value(x, y), gradF: CATALOGUE[fn].gradient(x, y), gradG: [CONSTRAINT_LINE.a, CONSTRAINT_LINE.b],
            tangency: {kind: 'exact', tangency: lineTangency(fn, CONSTRAINT_LINE, exact), points: lineTangencyPoints(fn, CONSTRAINT_LINE)},
        };
    }
    const theta = circleAngleOf(state.circleParam);
    const p = circlePoint(CONSTRAINT_CIRCLE_R2, theta);
    return {
        x: p.x, y: p.y, exact: undefined, f: CATALOGUE[fn].value(p.x, p.y), gradF: CATALOGUE[fn].gradient(p.x, p.y), gradG: [2 * p.x, 2 * p.y],
        tangency: {kind: 'approximate', tangency: circleTangency(fn, CONSTRAINT_CIRCLE_R2, theta)},
    };
}

/** The constraint curve as a polyline over the LS4 window (the line is cut at the window's x range, the circle is sampled). */
export function constraintPoly(constraint: ContourState['constraint']): Poly {
    const out = emptyPoly();
    if (constraint === 'line') {
        for (const x of [-LAGRANGE_WINDOW_HALF, LAGRANGE_WINDOW_HALF]) {
            out.x.push(x);
            out.y.push((CONSTRAINT_LINE.c - CONSTRAINT_LINE.a * x) / CONSTRAINT_LINE.b);
        }
        return out;
    }
    for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
        const p = circlePoint(CONSTRAINT_CIRCLE_R2, (2 * Math.PI * i) / CIRCLE_SAMPLES);
        out.x.push(p.x);
        out.y.push(p.y);
    }
    return out;
}

/** The parameter index that is nearest to a dragged point of the circle (the angle in steps of 2 pi / 48). */
export function circleParamNear(x: number, y: number, steps: number): number | undefined {
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return undefined;
    const angle = Math.atan2(y, x);
    const k = Math.round(((angle < 0 ? angle + 2 * Math.PI : angle) / (2 * Math.PI)) * steps) % steps;
    return k === 0 ? 0 : k;
}

/** How many of the CIRCLE_STEPS points of the circle are approximately tangent (named tolerance), e.g. 4 for `product`. */
export function circleTangentCount(fn: CatalogueId): number {
    let count = 0;
    for (let k = 0; k < CIRCLE_STEPS; k++) {
        if (circleTangency(fn, CONSTRAINT_CIRCLE_R2, circleAngleOf(k)).status === 'approximately-tangent') count++;
    }
    return count;
}

/** The circle parameters that are approximately tangent, in increasing order. */
export function circleTangentParams(fn: CatalogueId): number[] {
    const out: number[] = [];
    for (let k = 0; k < CIRCLE_STEPS; k++) {
        if (circleTangency(fn, CONSTRAINT_CIRCLE_R2, circleAngleOf(k)).status === 'approximately-tangent') out.push(k);
    }
    return out;
}

/** An exact rational as `a/b` or a whole number, with a true minus (the text is the same in both languages). */
export function rationalText(value: Rational): string {
    const text = value.den === 1n ? value.num.toString() : `${value.num}/${value.den}`;
    return text.replace('-', '−');
}

// ---- The surface (ADR 0053 section 3) ----

export interface SurfaceMeshData {
    readonly mesh: SceneMesh;
    readonly owners: SceneMeshOwner[];
    /** The factor that draws f as height: the largest power of two that keeps the highest point within the window half-width. */
    readonly zScale: number;
}

export function zScaleFor(fn: CatalogueId, window: Window2): number {
    const f = CATALOGUE[fn].value;
    let top = 0;
    for (let j = 0; j <= SURFACE_N; j++) {
        for (let i = 0; i <= SURFACE_N; i++) {
            top = Math.max(top, Math.abs(f(window.xMin + ((window.xMax - window.xMin) * i) / SURFACE_N, window.yMin + ((window.yMax - window.yMin) * j) / SURFACE_N)));
        }
    }
    return top === 0 ? 1 : 2 ** Math.floor(Math.log2(window.xMax / top));
}

/** The mesh of f over the window: (N + 1)^2 vertices, 2 N^2 triangles, all owned by one `function` owner. */
export function surfaceMesh(fn: CatalogueId, window: Window2): SurfaceMeshData {
    const f = CATALOGUE[fn].value;
    const zScale = zScaleFor(fn, window);
    const n = SURFACE_N;
    const positions: number[] = [];
    for (let j = 0; j <= n; j++) {
        for (let i = 0; i <= n; i++) {
            const x = window.xMin + ((window.xMax - window.xMin) * i) / n;
            const y = window.yMin + ((window.yMax - window.yMin) * j) / n;
            positions.push(x, y, f(x, y) * zScale);
        }
    }
    const faces: number[] = [];
    const at = (i: number, j: number) => j * (n + 1) + i;
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) faces.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
    return {mesh: {positions, faces, visible: true}, owners: [{id: 'function-surface', kind: 'function', faceStart: 0, faceCount: faces.length / 3}], zScale};
}

export interface SurfaceInput {
    readonly data: SurfaceMeshData;
    readonly camera: SurfaceScene['camera'];
    /** The chosen level's contour lifted to z = c * zScale. */
    readonly contour: readonly Segment2[];
    readonly level: number;
    /** The probe or constrained point on the surface, with its value. */
    readonly marker: {readonly x: number; readonly y: number; readonly f: number} | undefined;
}

export function buildSurfaceScene(input: SurfaceInput, revision: number): SurfaceScene {
    const {data, camera, contour, level, marker} = input;
    const z = level * data.zScale;
    return {
        revision, points: [],
        polylines: contour.map((segment, index) => ({
            id: `contour-${index}`, role: 'highlight' as const,
            points: [[segment.a.x, segment.a.y, z], [segment.b.x, segment.b.y, z]] as Xyz[],
        })),
        mesh: data.mesh, meshOwners: data.owners, markers: marker === undefined ? [] : [{id: 'point', role: 'evaluated', xyz: [marker.x, marker.y, marker.f * data.zScale] as Xyz}],
        labels: [], camera: {...camera, target: [camera.target[0], camera.target[1], camera.target[2]]}, interaction: {zMode: false, editable: false},
    };
}
