import type {DerivativeSource, Vec2} from "../../../bezeg/impl/curve/curvature";
import {curvatureAt} from "../../../bezeg/impl/curve/curvature";
import {archimedeanSpiralSource, cardioidSource, cycloidSource, roseSource} from "../../../bezeg/impl/curve/parametric-sources";

/**
 * Id of the roll animation of the cycloid lesson step. The lesson animation id list (`LESSON_ANIMATION_IDS` in
 * `src/learning/model.ts`) is extended with this entry by the registration slice (F2b/F3), not here.
 */
export const PARAMETRIC_ROLL_ANIMATION_ID = 'parametric-roll';

export const PARAMETRIC_CURVE_IDS = ['cycloid', 'cardioid', 'rose', 'spiral'] as const;
export type ParametricCurveId = typeof PARAMETRIC_CURVE_IDS[number];

export const isParametricCurveId = (value: unknown): value is ParametricCurveId =>
    typeof value === 'string' && (PARAMETRIC_CURVE_IDS as readonly string[]).includes(value);

/** Radius of the rolling circle of the cycloid: allowed range and default. */
export const CYCLOID_RADIUS_MIN = 0.25;
export const CYCLOID_RADIUS_MAX = 3;
export const CYCLOID_RADIUS_DEFAULT = 1;

/** The rose has a fixed number of petals: rho = cos(3 theta). */
export const ROSE_PETALS = 3;

export interface CatalogueEntry {
    readonly id: ParametricCurveId;
    /** Polar curves are given as rho(theta) and have a radius ray; the cycloid is parametric in t. */
    readonly kind: 'parametric' | 'polar';
    /** The parameter interval of one arch (cycloid) or of one full trace (polar curves). */
    readonly domain: readonly [number, number];
    source(radius: number): DerivativeSource;
}

const TWO_PI = 2 * Math.PI;

export const PARAMETRIC_CATALOGUE: Readonly<Record<ParametricCurveId, CatalogueEntry>> = {
    cycloid: {id: 'cycloid', kind: 'parametric', domain: [0, TWO_PI], source: radius => cycloidSource(radius)},
    cardioid: {id: 'cardioid', kind: 'polar', domain: [0, TWO_PI], source: () => cardioidSource()},
    // rho = cos(3 theta) closes after theta = pi (odd number of petals).
    rose: {id: 'rose', kind: 'polar', domain: [0, Math.PI], source: () => roseSource(ROSE_PETALS)},
    // rho = theta, one turn.
    spiral: {id: 'spiral', kind: 'polar', domain: [0, TWO_PI], source: () => archimedeanSpiralSource(1, TWO_PI)},
};

export interface CatalogueSelection {
    curve: ParametricCurveId;
    radius: number;
}

export function sourceOf(selection: CatalogueSelection): DerivativeSource {
    return PARAMETRIC_CATALOGUE[selection.curve].source(selection.radius);
}

export function clampParameter(selection: CatalogueSelection, parameter: number): number {
    const [t0, t1] = PARAMETRIC_CATALOGUE[selection.curve].domain;
    if (!Number.isFinite(parameter)) return t0;
    return Math.min(t1, Math.max(t0, parameter));
}

export type Velocity =
    | { status: 'moving', point: Vec2, vector: Vec2, speed: number }
    | { status: 'stopped', point: Vec2, speed: number };

/** r(t) and the velocity r'(t); a stopped point (speed 0 within tolerance of the curve extent) has no direction and no vector. */
export function velocityAt(selection: CatalogueSelection, parameter: number): Velocity {
    const source = sourceOf(selection);
    const {point, d1, d2} = source.at(parameter);
    const curvature = curvatureAt(d1, d2, source.scale);
    if (curvature.kind === 'singular') return {status: 'stopped', point, speed: 0};
    return {status: 'moving', point, vector: d1, speed: curvature.speed};
}

const INTEGRATION_INTERVALS = 4000;

function simpson(f: (t: number) => number, a: number, b: number): number {
    const n = INTEGRATION_INTERVALS;
    const h = (b - a) / n;
    let sum = f(a) + f(b);
    for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return sum * h / 3;
}

/** Arc length from the start of the domain to the parameter, by composite Simpson on the speed |r'|. */
export function arcLength(selection: CatalogueSelection, to?: number): number {
    const source = sourceOf(selection);
    const [t0, t1] = PARAMETRIC_CATALOGUE[selection.curve].domain;
    const end = to === undefined ? t1 : clampParameter(selection, to);
    if (end <= t0) return 0;
    return simpson(t => { const {d1} = source.at(t); return Math.hypot(d1[0], d1[1]); }, t0, end);
}

/**
 * Area of the curve over the whole domain: for the cycloid the area between one arch and the x axis, the integral of y dx;
 * for polar curves the area swept by the radius ray, half the integral of rho^2 dtheta (the cross product of r and r').
 */
export function enclosedArea(selection: CatalogueSelection): number {
    const source = sourceOf(selection);
    const entry = PARAMETRIC_CATALOGUE[selection.curve];
    const [t0, t1] = entry.domain;
    if (entry.kind === 'parametric') {
        return simpson(t => { const s = source.at(t); return s.point[1] * s.d1[0]; }, t0, t1);
    }
    return 0.5 * simpson(t => { const s = source.at(t); return s.point[0] * s.d1[1] - s.point[1] * s.d1[0]; }, t0, t1);
}

/** Bounding box [left, top, right, bottom] of the sampled curve with a margin, for fitting the view. */
export function curveViewBox(selection: CatalogueSelection): [number, number, number, number] {
    const source = sourceOf(selection);
    const [t0, t1] = PARAMETRIC_CATALOGUE[selection.curve].domain;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
        const [x, y] = source.at(t0 + (t1 - t0) * i / steps).point;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    // A velocity arrow of true length r' reaches beyond the trace, so leave room for it as well as a margin.
    const margin = 0.2 * Math.max(maxX - minX, maxY - minY);
    return [minX - margin, maxY + margin, maxX + margin, minY - margin];
}

/** Signed polar radius rho(theta) of a polar curve: r projected on the unit direction (cos theta, sin theta). */
export function polarRadius(selection: CatalogueSelection, theta: number): number {
    const [x, y] = sourceOf(selection).at(theta).point;
    return x * Math.cos(theta) + y * Math.sin(theta);
}
