/**
 * State model of the isometry graph (docs/tasks/isometries/03-isometry-graph.md; ADR 0047 sections 1 to 3).
 *
 * Stored state: the mode, three mirrors each through two integer grid points (the mirrors mode uses the first two, the classify mode the
 * first `motionLength`), the dilation centre and ratio `k` (a multiple of 1/4 with `0 < |k| <= 4`), the rosette `n`, mirror flag and motif
 * point, the frieze feature set and the period. Everything else (images, classes, readouts) is derived from validated state by
 * `deriveIsometry` and is never read from a Preset: `parseIsometryState` drops unknown fields.
 *
 * Coincident mirror points are a legal stored state (a drag can produce them); the derived value then carries a `coincident` status
 * instead of calling the kernel. Pure TypeScript: no React, JSXGraph or localization.
 */
import {type GridPoint} from '../compgeo/grid';
import {Rational, RationalPoint} from '../compgeo/rational';
import {
    apply, classifyIsometry, compose, dilation, identityMap, reflection, rotationAbout, similarity, type AffineMap2, type IsometryClass,
} from './isometry2';
import {friezeClosure, friezeSignature, friezeType, type FriezeGenerator, type FriezeSignature, type FriezeType} from './frieze';
import {rosette, type RosetteImage} from './rosette';

export const ISOMETRY_MODES = ['mirrors', 'classify', 'similarity', 'rosette', 'frieze'] as const;
export type IsometryMode = typeof ISOMETRY_MODES[number];

export const COORD_LIMIT = 16;
export const K_MIN = 0.25;
export const K_MAX = 4;
export const ROSETTE_N_MIN = 1;
export const ROSETTE_N_MAX = 12;
export const PERIOD_MIN = 4;
export const PERIOD_MAX = 8;
/** Half-width of the board view the graph starts with; drawn points beyond it are counted as off view. */
export const VIEW_HALF = 20;
/** The frieze is drawn for the copies that lie fully inside `[-FRIEZE_WINDOW, FRIEZE_WINDOW]`. */
export const FRIEZE_WINDOW = 19;

export interface MirrorSpec {
    readonly p: GridPoint;
    readonly q: GridPoint;
}

export interface FriezeFeatures {
    readonly vertical: boolean;
    readonly horizontal: boolean;
    readonly halfTurn: boolean;
    readonly glide: boolean;
}

export type MotionLength = 1 | 2 | 3;

/** The turn of the similarity about the dilation centre: 0, 90, 180, 270 degrees, or the angle with cos 3/5, sin 4/5 and its inverse. */
export const DILATION_TURNS = ['r0', 'r90', 'r180', 'r270', 'pythagorean', 'pythagoreanInverse'] as const;
export type DilationTurn = typeof DILATION_TURNS[number];

/** The exact (cos, sin) of each turn. */
export const TURN_COS_SIN: Readonly<Record<DilationTurn, readonly [Rational, Rational]>> = {
    r0: [Rational.of(1), Rational.of(0)],
    r90: [Rational.of(0), Rational.of(1)],
    r180: [Rational.of(-1), Rational.of(0)],
    r270: [Rational.of(0), Rational.of(-1)],
    pythagorean: [Rational.of(3, 5), Rational.of(4, 5)],
    pythagoreanInverse: [Rational.of(3, 5), Rational.of(-4, 5)],
};

export interface IsometryState {
    readonly mode: IsometryMode;
    readonly mirrors: readonly [MirrorSpec, MirrorSpec, MirrorSpec];
    readonly motionLength: MotionLength;
    readonly dilationCentre: GridPoint;
    readonly dilationK: number;
    /** A rotation about the same centre applied after the dilation; its composite has the centre as fixed point. */
    readonly dilationTurn: DilationTurn;
    readonly rosetteN: number;
    readonly rosetteMirrors: boolean;
    readonly rosettePoint: GridPoint;
    readonly friezeFeatures: FriezeFeatures;
    readonly friezePeriod: number;
}

// ---- Result type (same shape as the circle model) ----

export type IsometryErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing';
export interface IsometryError {
    readonly field: string;
    readonly reason: IsometryErrorReason;
    readonly message: string;
}
export type IsometryResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: IsometryError};

const ok = <T>(value: T): IsometryResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: IsometryErrorReason, message: string): IsometryResult<T> =>
    ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
const clampTo = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---- Defaults and examples ----

const mirror = (px: number, py: number, qx: number, qy: number): MirrorSpec => ({p: {x: px, y: py}, q: {x: qx, y: qy}});

export const DEFAULT_ISOMETRY_STATE: IsometryState = {
    mode: 'mirrors',
    // L1: mirror 1 through (0,0),(1,0) and mirror 2 through (0,0),(2,1); the third mirror is unused until the classify mode asks for it.
    mirrors: [mirror(0, 0, 1, 0), mirror(0, 0, 2, 1), mirror(0, 0, 1, 1)],
    motionLength: 2,
    dilationCentre: {x: 1, y: 1},
    dilationK: 1.5,
    dilationTurn: 'r0',
    rosetteN: 5,
    rosetteMirrors: false,
    rosettePoint: {x: 4, y: 1},
    friezeFeatures: {vertical: false, horizontal: false, halfTurn: true, glide: false},
    friezePeriod: 4,
};

export type ClassifyExampleId = 'rotation' | 'glide' | 'reflection';
export const CLASSIFY_EXAMPLE_IDS: readonly ClassifyExampleId[] = ['rotation', 'glide', 'reflection'];

/**
 * The classify mode's short list of motions (spec L2 checked numbers), each as mirrors that compose to it:
 * rotation by 90 degrees about (1,2) with t = (3,1); the glide (x,y) -> (y+2, x+2) as the translation (2,2) from two parallel mirrors
 * followed by the mirror y = x; the pure reflection in y = x - 1.
 */
export const CLASSIFY_EXAMPLES: Readonly<Record<ClassifyExampleId, Pick<IsometryState, 'mirrors' | 'motionLength'>>> = {
    rotation: {mirrors: [mirror(1, 2, 2, 2), mirror(1, 2, 2, 3), mirror(0, 0, 1, 1)], motionLength: 2},
    glide: {mirrors: [mirror(0, 0, 1, -1), mirror(1, 1, 2, 0), mirror(0, 0, 1, 1)], motionLength: 3},
    reflection: {mirrors: [mirror(1, 0, 2, 1), mirror(0, 0, 1, 0), mirror(0, 0, 1, 1)], motionLength: 1},
};

/** The example the state shows, or `undefined` for the learner's own motion. */
export function matchingClassifyExample(state: IsometryState): ClassifyExampleId | undefined {
    const same = (a: MirrorSpec, b: MirrorSpec) => a.p.x === b.p.x && a.p.y === b.p.y && a.q.x === b.q.x && a.q.y === b.q.y;
    return CLASSIFY_EXAMPLE_IDS.find(id => {
        const e = CLASSIFY_EXAMPLES[id];
        return e.motionLength === state.motionLength && e.mirrors.slice(0, e.motionLength).every((m, i) => same(m, state.mirrors[i]));
    });
}

// ---- Field parsers (strict, no snapping) ----

function parseNumber(value: unknown, field: string, unit: string): IsometryResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected ${unit}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number (${unit}).`);
    return ok(value);
}

function parseInteger(value: unknown, field: string, min: number, max: number): IsometryResult<number> {
    const n = parseNumber(value, field, `an integer from ${min} to ${max}`);
    if (!n.ok) return n;
    if (n.value < min || n.value > max) return fail(field, 'out-of-range', `${field} is outside [${min}, ${max}].`);
    if (!Number.isInteger(n.value)) return fail(field, 'off-grid', `${field} must be an integer from ${min} to ${max}.`);
    return ok(norm(n.value));
}

function parsePoint(value: unknown, field: string): IsometryResult<GridPoint> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {x, y} on the integer grid.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {x, y}.`);
    const x = parseInteger(value.x, `${field}.x`, -COORD_LIMIT, COORD_LIMIT);
    if (!x.ok) return x;
    const y = parseInteger(value.y, `${field}.y`, -COORD_LIMIT, COORD_LIMIT);
    if (!y.ok) return y;
    return ok({x: x.value, y: y.value});
}

function parseMirror(value: unknown, field: string): IsometryResult<MirrorSpec> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {p, q}, two grid points.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {p, q}.`);
    const p = parsePoint(value.p, `${field}.p`);
    if (!p.ok) return p;
    const q = parsePoint(value.q, `${field}.q`);
    if (!q.ok) return q;
    return ok({p: p.value, q: q.value});
}

function parseRatio(value: unknown, field: string): IsometryResult<number> {
    const n = parseNumber(value, field, 'a multiple of 1/4 with 0 < |k| <= 4');
    if (!n.ok) return n;
    if (n.value === 0) return fail(field, 'out-of-range', `${field} must not be 0; a dilation needs 0 < |k| <= ${K_MAX}.`);
    if (Math.abs(n.value) < K_MIN || Math.abs(n.value) > K_MAX) return fail(field, 'out-of-range', `${field} is outside 1/4 <= |k| <= ${K_MAX}.`);
    if (!Number.isInteger(n.value * 4)) return fail(field, 'off-grid', `${field} is not a multiple of 1/4; k is a multiple of 1/4 with 1/4 <= |k| <= ${K_MAX}.`);
    return ok(n.value);
}

function parseBoolean(value: unknown, field: string): IsometryResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    if (typeof value !== 'boolean') return fail(field, 'unknown-value', `${field} must be true or false.`);
    return ok(value);
}

function parseMode(value: unknown, field: string): IsometryResult<IsometryMode> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${ISOMETRY_MODES.join(', ')}.`);
    const mode = ISOMETRY_MODES.find(candidate => candidate === value);
    return mode ? ok(mode) : fail(field, 'unknown-value', `${field} must be one of: ${ISOMETRY_MODES.join(', ')}.`);
}

function parseTurn(value: unknown, field: string): IsometryResult<DilationTurn> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${DILATION_TURNS.join(', ')}.`);
    const turn = DILATION_TURNS.find(candidate => candidate === value);
    return turn ? ok(turn) : fail(field, 'unknown-value', `${field} must be one of: ${DILATION_TURNS.join(', ')}.`);
}

function parseFeatures(value: unknown, field: string): IsometryResult<FriezeFeatures> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {vertical, horizontal, halfTurn, glide}.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {vertical, horizontal, halfTurn, glide}.`);
    const vertical = parseBoolean(value.vertical, `${field}.vertical`);
    if (!vertical.ok) return vertical;
    const horizontal = parseBoolean(value.horizontal, `${field}.horizontal`);
    if (!horizontal.ok) return horizontal;
    const halfTurn = parseBoolean(value.halfTurn, `${field}.halfTurn`);
    if (!halfTurn.ok) return halfTurn;
    const glide = parseBoolean(value.glide, `${field}.glide`);
    if (!glide.ok) return glide;
    return ok({vertical: vertical.value, horizontal: horizontal.value, halfTurn: halfTurn.value, glide: glide.value});
}

/** Validates stored state; the first problem is returned and names its field. Unknown (for example derived) fields are dropped. */
export function parseIsometryState(data: unknown): IsometryResult<IsometryState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The isometry state must be an object.');
    const mode = parseMode(data.mode, 'mode');
    if (!mode.ok) return mode;
    if (!Array.isArray(data.mirrors)) {
        return data.mirrors === undefined || data.mirrors === null
            ? fail('mirrors', 'missing', 'mirrors is missing; expected a list of three mirrors {p, q}.')
            : fail('mirrors', 'not-an-object', 'mirrors must be a list of three mirrors {p, q}.');
    }
    if (data.mirrors.length !== 3) return fail('mirrors', 'out-of-range', 'mirrors must hold exactly three mirrors.');
    const m0 = parseMirror(data.mirrors[0], 'mirrors[0]');
    if (!m0.ok) return m0;
    const m1 = parseMirror(data.mirrors[1], 'mirrors[1]');
    if (!m1.ok) return m1;
    const m2 = parseMirror(data.mirrors[2], 'mirrors[2]');
    if (!m2.ok) return m2;
    const length = parseInteger(data.motionLength, 'motionLength', 1, 3);
    if (!length.ok) return length;
    const centre = parsePoint(data.dilationCentre, 'dilationCentre');
    if (!centre.ok) return centre;
    const k = parseRatio(data.dilationK, 'dilationK');
    if (!k.ok) return k;
    const turn = parseTurn(data.dilationTurn, 'dilationTurn');
    if (!turn.ok) return turn;
    const n = parseInteger(data.rosetteN, 'rosetteN', ROSETTE_N_MIN, ROSETTE_N_MAX);
    if (!n.ok) return n;
    const rosetteMirrors = parseBoolean(data.rosetteMirrors, 'rosetteMirrors');
    if (!rosetteMirrors.ok) return rosetteMirrors;
    const rosettePoint = parsePoint(data.rosettePoint, 'rosettePoint');
    if (!rosettePoint.ok) return rosettePoint;
    const features = parseFeatures(data.friezeFeatures, 'friezeFeatures');
    if (!features.ok) return features;
    const period = parseInteger(data.friezePeriod, 'friezePeriod', PERIOD_MIN, PERIOD_MAX);
    if (!period.ok) return period;
    return ok({
        mode: mode.value,
        mirrors: [m0.value, m1.value, m2.value],
        motionLength: length.value === 1 ? 1 : length.value === 2 ? 2 : 3,
        dilationCentre: centre.value,
        dilationK: k.value,
        dilationTurn: turn.value,
        rosetteN: n.value,
        rosetteMirrors: rosetteMirrors.value,
        rosettePoint: rosettePoint.value,
        friezeFeatures: features.value,
        friezePeriod: period.value,
    });
}

const copyMirror = (m: MirrorSpec): MirrorSpec => ({p: {x: m.p.x, y: m.p.y}, q: {x: m.q.x, y: m.q.y}});

/** The state to store in a Preset: only the stored fields, as plain data (no derived value). */
export const serializeIsometryState = (s: IsometryState): IsometryState => ({
    mode: s.mode,
    mirrors: [copyMirror(s.mirrors[0]), copyMirror(s.mirrors[1]), copyMirror(s.mirrors[2])],
    motionLength: s.motionLength,
    dilationCentre: {x: s.dilationCentre.x, y: s.dilationCentre.y},
    dilationK: s.dilationK,
    dilationTurn: s.dilationTurn,
    rosetteN: s.rosetteN,
    rosetteMirrors: s.rosetteMirrors,
    rosettePoint: {x: s.rosettePoint.x, y: s.rosettePoint.y},
    friezeFeatures: {
        vertical: s.friezeFeatures.vertical, horizontal: s.friezeFeatures.horizontal, halfTurn: s.friezeFeatures.halfTurn, glide: s.friezeFeatures.glide,
    },
    friezePeriod: s.friezePeriod,
});

// ---- Snapping: one function per field for every input path (drag, numeric field, keyboard step, scene action) ----

export interface SnappedInput {
    readonly value: number;
    /** True only when a range limit moved the rounded value. */
    readonly clamped: boolean;
    /** True when the stored value differs from the input. */
    readonly adjusted: boolean;
}

function snapTo(input: number, field: string, perUnit: number, min: number, max: number): IsometryResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input * perUnit) / perUnit;
    const value = norm(clampTo(rounded, min, max));
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

/** A dragged or typed grid coordinate to the nearest integer, clamped to [-16, 16]. */
export const snapCoordinateInput = (input: number, field = 'coordinate') => snapTo(input, field, 1, -COORD_LIMIT, COORD_LIMIT);
/** A typed rosette order to the nearest integer in [1, 12]. */
export const snapRosetteNInput = (input: number, field = 'n') => snapTo(input, field, 1, ROSETTE_N_MIN, ROSETTE_N_MAX);
/** A typed period to the nearest integer in [4, 8]. */
export const snapPeriodInput = (input: number, field = 'period') => snapTo(input, field, 1, PERIOD_MIN, PERIOD_MAX);

/**
 * A typed ratio to the nearest quarter with `1/4 <= |k| <= 4`. Zero is not a ratio: a value that rounds to zero goes to `+-1/4` on the
 * side it came from, and exactly 0 goes to the other side of `previous` (so a keyboard step down from 1/4 lands on -1/4).
 */
export function snapRatioInput(input: number, previous = 1, field = 'k'): IsometryResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = norm(Math.round(input * 4) / 4);
    let value = clampTo(rounded, -K_MAX, K_MAX);
    if (value === 0) {
        const positive = input !== 0 ? input > 0 : !(previous > 0);
        value = positive ? K_MIN : -K_MIN;
    }
    return ok({value, clamped: Math.abs(rounded) > K_MAX, adjusted: value !== input});
}

// ---- Motifs ----

export const MIRROR_MOTIF: readonly GridPoint[] = [{x: 3, y: 1}, {x: 5, y: 1}, {x: 3, y: 4}];
export const SIMILARITY_MOTIF: readonly GridPoint[] = [{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}];
/** The letter-F outline of the frieze, in tenths: stem and two arms, asymmetric under every mirror and half-turn. */
export const FRIEZE_MOTIF_TENTHS: ReadonlyArray<readonly [number, number]> = [
    [1, 4], [3, 4], [3, 12], [6, 12], [6, 14], [3, 14], [3, 22], [9, 22], [9, 24], [1, 24],
];

const toRational = (p: GridPoint): RationalPoint => RationalPoint.fromGrid(p);
const same = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;

/** Twice the signed area of a polygon (shoelace), exact. */
export function signedArea2(points: readonly RationalPoint[]): Rational {
    let sum = Rational.ZERO;
    points.forEach((p, i) => { sum = sum.add(p.cross(points[(i + 1) % points.length])); });
    return sum;
}

export const orientationOf = (points: readonly RationalPoint[]): 1 | -1 => (signedArea2(points).sign() >= 0 ? 1 : -1);

// ---- Derived values (recomputed from validated state, never stored) ----

export type FixedPoints = 'none' | 'one' | 'line' | 'plane';

export interface MotionStep {
    readonly image: readonly RationalPoint[];
    readonly orientation: 1 | -1;
}

export type MotionDerived =
    | { readonly status: 'coincident'; readonly mirror: 1 | 2 | 3 }
    | {
    readonly status: 'ok';
    readonly composite: AffineMap2;
    readonly cls: IsometryClass;
    readonly motif: readonly RationalPoint[];
    /** The images after the first mirror, after the second, and so on (one per mirror used). */
    readonly steps: readonly MotionStep[];
    readonly fixed: FixedPoints;
    /** Image vertices outside the starting view. */
    readonly offView: number;
};

export interface MirrorsDerived {
    readonly mode: 'mirrors';
    readonly motion: MotionDerived;
}

export interface ClassifyDerived {
    readonly mode: 'classify';
    readonly motion: MotionDerived;
}

export interface SimilarityDerived {
    readonly mode: 'similarity';
    readonly map: AffineMap2;
    readonly motif: readonly RationalPoint[];
    readonly image: readonly RationalPoint[];
    /** Exact ratio of lengths `|k|`. */
    readonly sideRatio: Rational;
    /** Exact ratio of areas `k^2`. */
    readonly areaRatio: Rational;
    readonly area: Rational;
    readonly imageArea: Rational;
    readonly orientation: 1 | -1;
    /** The centre; every point when `k = 1`. */
    readonly fixedPoint: RationalPoint | 'all';
    readonly isometry: boolean;
    readonly cls: IsometryClass;
    readonly offView: number;
}

export interface RosetteDerived {
    readonly mode: 'rosette';
    /** Exact group order: `n` or `2n`. */
    readonly order: number;
    /** Computed images (doubles). */
    readonly images: readonly RosetteImage[];
    /** Number of distinct images, computed with a tolerance of 1e-9. */
    readonly distinct: number;
    readonly offView: number;
}

export interface FriezePolygon {
    /** Index of the closure element (0 is the identity). */
    readonly element: number;
    readonly period: number;
    readonly xs: readonly number[];
    readonly ys: readonly number[];
}

export type FriezeDerived =
    | { readonly mode: 'frieze'; readonly status: 'reducesPeriod'; readonly polygons: readonly FriezePolygon[]; readonly generators: readonly FriezeGenerator[] }
    | {
    readonly mode: 'frieze';
    readonly status: 'closed';
    readonly type: FriezeType;
    readonly signature: FriezeSignature;
    /** Images of the motif per period: the size of the closed set. */
    readonly copiesPerPeriod: number;
    readonly elements: readonly AffineMap2[];
    readonly polygons: readonly FriezePolygon[];
    readonly generators: readonly FriezeGenerator[];
};

export type IsometryDerived = MirrorsDerived | ClassifyDerived | SimilarityDerived | RosetteDerived | FriezeDerived;

const outside = (x: number, y: number) => Math.abs(x) > VIEW_HALF || Math.abs(y) > VIEW_HALF;
const countOffView = (points: readonly RationalPoint[]) =>
    points.filter(p => outside(p.x.toNumber(), p.y.toNumber())).length;

function fixedPointsOf(cls: IsometryClass): FixedPoints {
    switch (cls.kind) {
        case 'identity': return 'plane';
        case 'rotation': return 'one';
        case 'reflection': return 'line';
        default: return 'none'; // translation, glide
    }
}

/** The composite of the first `count` mirrors (the first mirror acts first). */
export function deriveMotion(mirrors: readonly MirrorSpec[], count: number, motifPoints: readonly GridPoint[] = MIRROR_MOTIF): MotionDerived {
    const used = mirrors.slice(0, count);
    const bad = used.findIndex(m => same(m.p, m.q));
    if (bad >= 0) return {status: 'coincident', mirror: (bad + 1) as 1 | 2 | 3};
    const motif = motifPoints.map(toRational);
    let composite = identityMap;
    const steps: MotionStep[] = [];
    for (const m of used) {
        composite = compose(reflection(m.p, m.q), composite);
        const image = motif.map(p => apply(composite, p));
        steps.push({image, orientation: orientationOf(image)});
    }
    const cls = classifyIsometry(composite);
    return {status: 'ok', composite, cls, motif, steps, fixed: fixedPointsOf(cls), offView: countOffView(steps.flatMap(s => s.image))};
}

function deriveSimilarity(s: IsometryState): SimilarityDerived {
    const k = Rational.of(Math.round(s.dilationK * 4), 4);
    const [cos, sin] = TURN_COS_SIN[s.dilationTurn];
    const map = compose(rotationAbout(s.dilationCentre, cos, sin), dilation(s.dilationCentre, k));
    const motif = SIMILARITY_MOTIF.map(toRational);
    const image = motif.map(p => apply(map, p));
    const sim = similarity(map);
    if (sim.kind !== 'similarity') throw new Error('a dilation is always a similarity');
    const area = signedArea2(motif).div(Rational.of(2));
    const imageArea = signedArea2(image).div(Rational.of(2));
    const cls = classifyIsometry(map);
    return {
        mode: 'similarity',
        map,
        motif,
        image,
        sideRatio: sim.lambda ?? Rational.ZERO,
        areaRatio: sim.lambda2,
        area,
        imageArea,
        orientation: sim.orientation,
        fixedPoint: sim.fixedPoint === 'none' ? 'all' : sim.fixedPoint,
        isometry: cls.kind !== 'notIsometry',
        cls,
        offView: countOffView(image),
    };
}

const FRIEZE_FEATURE_GENERATORS: ReadonlyArray<readonly [keyof FriezeFeatures, FriezeGenerator]> = [
    ['vertical', 'V'], ['horizontal', 'H'], ['halfTurn', 'R'], ['glide', 'G'],
];

/** The generators the feature set chooses, in the order V, H, R, G. */
export const friezeGeneratorsOf = (features: FriezeFeatures): FriezeGenerator[] =>
    FRIEZE_FEATURE_GENERATORS.filter(([feature]) => features[feature]).map(([, generator]) => generator);

/**
 * The F outline under every element, shifted by whole periods; only copies that lie fully inside the window `[-window, window]` are kept.
 * Exact rational arithmetic is converted to doubles at the end, for drawing only.
 */
export function friezePolygons(
    elements: readonly AffineMap2[], period: number, window = FRIEZE_WINDOW, kFrom?: number, kTo?: number,
): FriezePolygon[] {
    const motif = FRIEZE_MOTIF_TENTHS.map(([x, y]) => new RationalPoint(Rational.of(x, 10), Rational.of(y, 10)));
    const from = kFrom ?? Math.floor(-window / period) - 2;
    const to = kTo ?? Math.ceil(window / period) + 2;
    const polygons: FriezePolygon[] = [];
    elements.forEach((m, element) => {
        const base = motif.map(p => apply(m, p));
        for (let k = from; k < to; k++) {
            const shift = (k * period);
            const xs = base.map(p => p.x.toNumber() + shift);
            if (xs.some(x => Math.abs(x) > window)) continue;
            polygons.push({element, period: k, xs, ys: base.map(p => p.y.toNumber())});
        }
    });
    return polygons;
}

function deriveFrieze(s: IsometryState): FriezeDerived {
    const generators = friezeGeneratorsOf(s.friezeFeatures);
    const L = Rational.fromInt(s.friezePeriod);
    const closure = friezeClosure(generators, L);
    if (closure.kind === 'reducesPeriod') {
        // Only the translates of the motif are certain: the closure is not a frieze group of this period.
        return {mode: 'frieze', status: 'reducesPeriod', generators, polygons: friezePolygons([identityMap], s.friezePeriod)};
    }
    return {
        mode: 'frieze',
        status: 'closed',
        type: friezeType(closure.elements),
        signature: friezeSignature(closure.elements),
        copiesPerPeriod: closure.elements.length,
        elements: closure.elements,
        generators,
        polygons: friezePolygons(closure.elements, s.friezePeriod),
    };
}

function deriveRosette(s: IsometryState): RosetteDerived {
    const result = rosette(s.rosetteN, s.rosetteMirrors, s.rosettePoint);
    const distinct: RosetteImage[] = [];
    for (const image of result.images) {
        if (!distinct.some(d => Math.hypot(d.x - image.x, d.y - image.y) < 1e-9)) distinct.push(image);
    }
    return {
        mode: 'rosette',
        order: result.order,
        images: result.images,
        distinct: distinct.length,
        offView: result.images.filter(i => outside(i.x, i.y)).length,
    };
}

/** Everything drawn or read for the state's mode, from validated state only. */
export function deriveIsometry(state: IsometryState): IsometryDerived {
    switch (state.mode) {
        case 'mirrors': return {mode: 'mirrors', motion: deriveMotion(state.mirrors, 2)};
        case 'classify': return {mode: 'classify', motion: deriveMotion(state.mirrors, state.motionLength)};
        case 'similarity': return deriveSimilarity(state);
        case 'rosette': return deriveRosette(state);
        case 'frieze': return deriveFrieze(state);
    }
}
