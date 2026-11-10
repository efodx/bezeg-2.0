import {GridPoint} from './grid';
import {
    intersectCircles, invertExact, powerOfPoint, type Circle, type CircleCircleIntersection,
} from './circle';
import {
    apolloniusLocus, commonTangents, makeCircle, radicalAxis, radicalCentre, tangentsFrom,
    type ApolloniusResult, type CommonTangentsResult, type RadicalAxisResult, type RadicalCentreResult, type RadiusCircle,
    type TangentsFromResult,
} from './circleConstructions';
import {Rational, RationalPoint} from './rational';

/**
 * Stored state of the circle construction graph (docs/adr/0045-circle-construction-graph-and-exact-tangency.md, sections 1 and 2;
 * spec docs/specs/circle-geometry-lessons.md, CG1 to CG4). Pure TypeScript: no React, JSXGraph or localization (messages are
 * English developer text, as in the trigonometry model).
 *
 * Only the fields of `CircleConstructionState` are stored. Powers, tangents, axes, centres, loci and counts come from
 * `deriveCircleConstruction`, which calls the exact kernel `circleConstructions.ts`; a Preset that carries such fields is
 * accepted and they are dropped (unknown properties are ignored), so a derived value is never read from a Preset. Imported
 * values are never snapped or clamped: an off-grid or out-of-range field rejects the whole state. Input from the UI uses the
 * `snap...Input` functions, which snap and report whether the value moved or was clamped.
 *
 * Coincident or concentric circles, `P = O`, `P = B` and `A = B` are valid states with a status, not errors: a dragged handle
 * crosses them on the grid.
 */

export const CIRCLE_MODES = ['tangents', 'radical', 'apollonius', 'common'] as const;
export type CircleMode = typeof CIRCLE_MODES[number];

/** Grid coordinates of centres and points lie in [-COORD_LIMIT, COORD_LIMIT]; two circles of radius at most 8 can meet only within 16. */
export const COORD_LIMIT = 16;
export const RADIUS_MIN = 0.25;
export const RADIUS_MAX = 8;
export const RATIO_MIN = 0.5;
export const RATIO_MAX = 4;

/** A circle by its centre (grid point) and its radius (a multiple of 1/4). */
export interface CircleSpec {
    readonly x: number;
    readonly y: number;
    readonly r: number;
}

export interface CircleConstructionState {
    readonly mode: CircleMode;
    /** The first, second and third circle (the third is used by the radical centre only; the tangent mode uses the first). */
    readonly c1: CircleSpec;
    readonly c2: CircleSpec;
    readonly c3: CircleSpec;
    /** The point P of the tangent mode and the probe point of the radical and Apollonius modes. */
    readonly p: GridPoint;
    /** The Apollonius points A and B. */
    readonly a: GridPoint;
    readonly b: GridPoint;
    /** The Apollonius ratio `k`, a multiple of 1/2 in [1/2, 4]; the locus is `|PA|^2 = k^2 |PB|^2`. */
    readonly k: number;
}

// ---- Result type (same shape as the trigonometry model) ----

export type CircleErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing';
export interface CircleError {
    readonly field: string;
    readonly reason: CircleErrorReason;
    readonly message: string;
}
export type CircleResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: CircleError};

const ok = <T>(value: T): CircleResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: CircleErrorReason, message: string): CircleResult<T> =>
    ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> =>
    data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
const clampTo = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---- Examples ----

const BASE: CircleConstructionState = {
    mode: 'tangents',
    c1: {x: 0, y: 0, r: 5},
    c2: {x: 6, y: 0, r: 3},
    c3: {x: 3, y: 6, r: 2},
    p: {x: 13, y: 0},
    a: {x: 0, y: 0},
    b: {x: 6, y: 0},
    k: 2,
};

/** The checked default examples of CG1 to CG4 (spec "Default example"), each a complete state. */
export function exampleState(mode: CircleMode): CircleConstructionState {
    switch (mode) {
        case 'tangents': return BASE;
        case 'radical': return {...BASE, mode, p: {x: 4, y: 2}};
        case 'apollonius': return {...BASE, mode, p: {x: 8, y: 4}};
        case 'common': return {...BASE, mode, c1: {x: 0, y: 0, r: 3}, c2: {x: 10, y: 0, r: 1}};
    }
}

export const DEFAULT_CIRCLE_CONSTRUCTION_STATE: CircleConstructionState = exampleState('tangents');

// ---- Field parsers (strict, no snapping) ----

function parseNumber(value: unknown, field: string, unit: string): CircleResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected ${unit}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number (${unit}).`);
    return ok(value);
}

function parseCoordinate(value: unknown, field: string): CircleResult<number> {
    const n = parseNumber(value, field, 'an integer');
    if (!n.ok) return n;
    if (Math.abs(n.value) > COORD_LIMIT) return fail(field, 'out-of-range', `${field} is outside [-${COORD_LIMIT}, ${COORD_LIMIT}].`);
    if (!Number.isInteger(n.value)) return fail(field, 'off-grid', `${field} must be an integer grid coordinate.`);
    return ok(norm(n.value));
}

function parsePoint(value: unknown, field: string): CircleResult<GridPoint> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {x, y} on the integer grid.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {x, y}.`);
    const x = parseCoordinate(value.x, `${field}.x`);
    if (!x.ok) return x;
    const y = parseCoordinate(value.y, `${field}.y`);
    if (!y.ok) return y;
    return ok({x: x.value, y: y.value});
}

function parseRadius(value: unknown, field: string): CircleResult<number> {
    const n = parseNumber(value, field, 'a multiple of 1/4');
    if (!n.ok) return n;
    if (n.value < RADIUS_MIN || n.value > RADIUS_MAX) return fail(field, 'out-of-range', `${field} is outside [${RADIUS_MIN}, ${RADIUS_MAX}]; radii are multiples of 1/4.`);
    if (!Number.isInteger(n.value * 4)) return fail(field, 'off-grid', `${field} is not a multiple of 1/4; radii are multiples of 1/4 in [${RADIUS_MIN}, ${RADIUS_MAX}].`);
    return ok(n.value);
}

function parseCircle(value: unknown, field: string): CircleResult<CircleSpec> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {x, y, r}.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {x, y, r}.`);
    const x = parseCoordinate(value.x, `${field}.x`);
    if (!x.ok) return x;
    const y = parseCoordinate(value.y, `${field}.y`);
    if (!y.ok) return y;
    const r = parseRadius(value.r, `${field}.r`);
    if (!r.ok) return r;
    return ok({x: x.value, y: y.value, r: r.value});
}

function parseRatio(value: unknown, field: string): CircleResult<number> {
    const n = parseNumber(value, field, 'a multiple of 1/2');
    if (!n.ok) return n;
    if (n.value < RATIO_MIN || n.value > RATIO_MAX) return fail(field, 'out-of-range', `${field} is outside [${RATIO_MIN}, ${RATIO_MAX}]; the ratio is a multiple of 1/2.`);
    if (!Number.isInteger(n.value * 2)) return fail(field, 'off-grid', `${field} is not a multiple of 1/2; the ratio is a multiple of 1/2 in [${RATIO_MIN}, ${RATIO_MAX}].`);
    return ok(n.value);
}

function parseMode(value: unknown, field: string): CircleResult<CircleMode> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${CIRCLE_MODES.join(', ')}.`);
    const mode = CIRCLE_MODES.find(candidate => candidate === value);
    return mode ? ok(mode) : fail(field, 'unknown-value', `${field} must be one of: ${CIRCLE_MODES.join(', ')}.`);
}

/** Validates stored state; the first problem is returned and names its field. Unknown (for example derived) fields are dropped. */
export function parseCircleConstructionState(data: unknown): CircleResult<CircleConstructionState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The circle construction state must be an object.');
    const mode = parseMode(data.mode, 'mode');
    if (!mode.ok) return mode;
    const c1 = parseCircle(data.c1, 'c1');
    if (!c1.ok) return c1;
    const c2 = parseCircle(data.c2, 'c2');
    if (!c2.ok) return c2;
    const c3 = parseCircle(data.c3, 'c3');
    if (!c3.ok) return c3;
    const p = parsePoint(data.p, 'p');
    if (!p.ok) return p;
    const a = parsePoint(data.a, 'a');
    if (!a.ok) return a;
    const b = parsePoint(data.b, 'b');
    if (!b.ok) return b;
    const k = parseRatio(data.k, 'k');
    if (!k.ok) return k;
    return ok({mode: mode.value, c1: c1.value, c2: c2.value, c3: c3.value, p: p.value, a: a.value, b: b.value, k: k.value});
}

/** The state to store in a Preset: only the stored fields, as plain data. */
export const serializeCircleConstructionState = (s: CircleConstructionState): CircleConstructionState => ({
    mode: s.mode,
    c1: {x: s.c1.x, y: s.c1.y, r: s.c1.r},
    c2: {x: s.c2.x, y: s.c2.y, r: s.c2.r},
    c3: {x: s.c3.x, y: s.c3.y, r: s.c3.r},
    p: {x: s.p.x, y: s.p.y},
    a: {x: s.a.x, y: s.a.y},
    b: {x: s.b.x, y: s.b.y},
    k: s.k,
});

// ---- Snapping (ADR 0045 section 2) ----

export interface SnappedInput {
    readonly value: number;
    /** True only when the range limit moved the rounded value (rounding alone is `adjusted`). */
    readonly clamped: boolean;
    /** True when the stored value differs from the input. */
    readonly adjusted: boolean;
}

function snapTo(input: number, field: string, perUnit: number, min: number, max: number): CircleResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input * perUnit) / perUnit;
    const value = norm(clampTo(rounded, min, max));
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

/** A dragged or typed centre or point coordinate to the nearest integer, clamped to [-16, 16]. */
export const snapCoordinateInput = (input: number, field = 'coordinate') => snapTo(input, field, 1, -COORD_LIMIT, COORD_LIMIT);
/** A dragged or typed radius to the nearest quarter, clamped to [1/4, 8]. */
export const snapRadiusInput = (input: number, field = 'radius') => snapTo(input, field, 4, RADIUS_MIN, RADIUS_MAX);
/** A typed ratio `k` to the nearest half, clamped to [1/2, 4]. */
export const snapRatioInput = (input: number, field = 'k') => snapTo(input, field, 2, RATIO_MIN, RATIO_MAX);

// ---- Derived values (recomputed from validated state, never stored) ----

export const circleOf = (spec: CircleSpec): RadiusCircle => makeCircle({x: spec.x, y: spec.y}, Rational.of(spec.r * 4, 4));
const pointOf = (p: GridPoint) => RationalPoint.fromGrid(p);
const squaredDistance = (u: RationalPoint, v: RationalPoint): Rational => {
    const d = u.sub(v);
    return d.dot(d);
};

export interface TangentsDerived {
    readonly mode: 'tangents';
    readonly circle: RadiusCircle;
    /** `P = O`: no tangent from the centre. */
    readonly atCentre: boolean;
    readonly result: TangentsFromResult;
    /** The circle on `OP` as a diameter, for an outside `P` only. */
    readonly thales: Circle | null;
    readonly distanceSquared: Rational;
}

export interface RadicalPair {
    readonly pair: '12' | '13' | '23';
    readonly axis: RadicalAxisResult;
}

export interface RadicalDerived {
    readonly mode: 'radical';
    readonly circles: readonly [RadiusCircle, RadiusCircle, RadiusCircle];
    readonly axes: readonly [RadicalPair, RadicalPair, RadicalPair];
    /** How the first two circles meet, from the exact discriminant (touching is exact). */
    readonly firstPairMeet: CircleCircleIntersection;
    readonly centre: RadicalCentreResult;
    /** The circle about the radical centre cutting the three circles at right angles; present when the common power is positive. */
    readonly orthogonal: Circle | null;
    /** The probe's exact powers with respect to the three circles. */
    readonly powers: readonly [Rational, Rational, Rational];
    /** Equal powers with respect to the first two circles, that is the probe is on their radical axis. */
    readonly onFirstAxis: boolean;
}

export interface ApolloniusDerived {
    readonly mode: 'apollonius';
    readonly m: Rational;
    readonly locus: ApolloniusResult;
    readonly pa2: Rational;
    readonly pb2: Rational;
    /** `P = B`: the ratio is undefined. */
    readonly atB: boolean;
    /** `PA / PB` in doubles, `null` at `P = B`. */
    readonly ratio: number | null;
    /** The exact test `|PA|^2 = m |PB|^2`; false at `P = B` unless also `P = A`, which needs `A = B` (degenerate). */
    readonly onLocus: boolean;
    /** The exact inverse of A in the Apollonius circle, which is B (circle case only). */
    readonly inverseOfA: RationalPoint | null;
}

export type CommonRelation =
    'coincident' | 'concentric' | 'separate' | 'touching-outside' | 'crossing' | 'touching-inside' | 'nested';

export interface CommonDerived {
    readonly mode: 'common';
    readonly circles: readonly [RadiusCircle, RadiusCircle];
    readonly result: CommonTangentsResult;
    readonly distanceSquared: Rational;
    readonly relation: CommonRelation;
}

export type CircleConstructionDerived = TangentsDerived | RadicalDerived | ApolloniusDerived | CommonDerived;

function deriveTangents(state: CircleConstructionState): TangentsDerived {
    const circle = circleOf(state.c1);
    const p = pointOf(state.p);
    const result = tangentsFrom(state.p, circle);
    const thales = result.status === 'outside'
        ? {centre: circle.centre.add(p).scale(Rational.of(1, 2)), r2: squaredDistance(p, circle.centre).mul(Rational.of(1, 4))}
        : null;
    return {
        mode: 'tangents', circle, atCentre: p.equals(circle.centre), result, thales, distanceSquared: squaredDistance(p, circle.centre),
    };
}

function deriveRadical(state: CircleConstructionState): RadicalDerived {
    const circles = [circleOf(state.c1), circleOf(state.c2), circleOf(state.c3)] as const;
    const [c1, c2, c3] = circles;
    const p = pointOf(state.p);
    const centre = radicalCentre(c1, c2, c3);
    const orthogonal = centre.status === 'centre' && centre.power.sign() > 0 ? {centre: centre.point, r2: centre.power} : null;
    const powers = [powerOfPoint(p, c1), powerOfPoint(p, c2), powerOfPoint(p, c3)] as const;
    return {
        mode: 'radical',
        circles,
        axes: [
            {pair: '12', axis: radicalAxis(c1, c2)},
            {pair: '13', axis: radicalAxis(c1, c3)},
            {pair: '23', axis: radicalAxis(c2, c3)},
        ],
        firstPairMeet: intersectCircles(c1, c2),
        centre,
        orthogonal,
        powers,
        onFirstAxis: powers[0].equals(powers[1]),
    };
}

function deriveApollonius(state: CircleConstructionState): ApolloniusDerived {
    const j = Math.round(state.k * 2);
    const m = Rational.of(j * j, 4);
    const locus = apolloniusLocus(state.a, state.b, m);
    const p = pointOf(state.p);
    const pa2 = squaredDistance(p, pointOf(state.a));
    const pb2 = squaredDistance(p, pointOf(state.b));
    const atB = pb2.isZero();
    const inverseOfA = locus.status === 'circle' ? invertExact(pointOf(state.a), locus.circle.centre, locus.circle.r2) : null;
    return {
        mode: 'apollonius', m, locus, pa2, pb2, atB,
        ratio: atB ? null : Math.sqrt(pa2.div(pb2).toNumber()),
        onLocus: pa2.equals(m.mul(pb2)),
        inverseOfA,
    };
}

function relationOf(result: CommonTangentsResult, distanceSquared: Rational): CommonRelation {
    if (result.status === 'coincident') return 'coincident';
    if (distanceSquared.isZero()) return 'concentric';
    switch (result.count) {
        case 4: return 'separate';
        case 3: return 'touching-outside';
        case 2: return 'crossing';
        case 1: return 'touching-inside';
        case 0: return 'nested';
    }
}

function deriveCommon(state: CircleConstructionState): CommonDerived {
    const c1 = circleOf(state.c1);
    const c2 = circleOf(state.c2);
    const result = commonTangents(c1, c2);
    const distanceSquared = squaredDistance(c2.centre, c1.centre);
    return {mode: 'common', circles: [c1, c2], result, distanceSquared, relation: relationOf(result, distanceSquared)};
}

/** Everything drawn or read for the state's mode, from the exact kernel. Throws only for state that was not validated. */
export function deriveCircleConstruction(state: CircleConstructionState): CircleConstructionDerived {
    switch (state.mode) {
        case 'tangents': return deriveTangents(state);
        case 'radical': return deriveRadical(state);
        case 'apollonius': return deriveApollonius(state);
        case 'common': return deriveCommon(state);
    }
}
