/**
 * Model of the power-of-a-point and inversion graph (spec triangle-geometry-lessons T5; task triangle-geometry/08 F2a).
 * Pure TypeScript: no JSXGraph, graph, Presets, locale or route. It turns grid inputs into the numbers and board geometry the
 * graph shows, using the circle kernel (`circle.ts`) and the inversion kernel of `src/analysis/complexMobius.ts`.
 * No NaN or infinity leaves this file; invalid input gives `{kind: 'invalid'}`.
 *
 * Hard rule: every *drawn* image (point or generalized circle) comes from `circleInversion` / `inversionImage`; double
 * inversion is never re-implemented here. Exact readouts (`exact`, the power) are `Rational`: from `invertExact` /
 * `powerOfPoint` for points, and from the integer form of the canonical image for circles and lines.
 *
 * Inputs live on the integer grid: the inversion centre, the point X, the power point P and the source circle centres have
 * integer coordinates in [-10, 10]; radii are integers 1..8 (`INVERSION_RADIUS_MAX`); a source line is two distinct grid points.
 *
 * Drawing cap. The grid keeps images within 64 units, far below `BOARD_COORDINATE_CAP`, so this model has its own, much
 * smaller `INVERSION_DRAW_CAP`: an image whose coordinates (for a circle: centre or radius) exceed it is reported with
 * `board: undefined`, and the graph draws an edge marker (points carry a `direction`) instead of the object.
 *
 * Inexact values (doubles, square roots or trigonometry): the secant points `A`, `B`, the tangent points and length, the
 * angles, and the intersection points of two circles. Never compare them with `===`.
 *
 * Angle convention: the signed angle between *undirected* tangent lines, from the first curve to the second, in degrees in
 * (-90, 90] (counter-clockwise positive); `unsigned = |signed|`. Inversion preserves the size and reverses the sign.
 */
import {GridPoint} from './grid';
import {Rational, RationalPoint} from './rational';
import {Circle, intersectCircles, powerOfPoint, invertExact, lineThrough, lineValue} from './circle';
import {BoardXY, toBoard} from './notablePointsModel';
import type {Complex} from '../analysis/complex';
import {
    circleFromCentreRadius, circleInversion, describeGeneralizedCircle, inversionImage, lineThroughPoints,
    type GeneralizedCircle, type GeneralizedCircleShape,
} from '../analysis/complexMobius';

export const INVERSION_RADIUS_MAX = 8;
export const INVERSION_COORDINATE_MAX = 10;
/** Largest drawn coordinate (and radius) of an image; beyond it `board` is undefined. */
export const INVERSION_DRAW_CAP = 30;

export type InversionPosition = 'inside' | 'on' | 'outside';

export interface CircleSpec {
    readonly centre: GridPoint;
    readonly radius: number;
}

/** The circle of inversion: centre and integer radius 1..8. */
export type Inversion = CircleSpec;

export type InversionSource =
    | {readonly kind: 'circle'; readonly centre: GridPoint; readonly radius: number}
    | {readonly kind: 'line'; readonly p: GridPoint; readonly q: GridPoint};

export interface XY {
    readonly x: number;
    readonly y: number;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------------------------------

export function isInversionRadius(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= INVERSION_RADIUS_MAX;
}

export function isInversionPoint(value: unknown): value is GridPoint {
    if (value === null || typeof value !== 'object') return false;
    const {x, y} = value as Record<string, unknown>;
    const ok = (c: unknown): boolean => typeof c === 'number' && Number.isInteger(c) && Math.abs(c) <= INVERSION_COORDINATE_MAX;
    return ok(x) && ok(y);
}

export function isCircleSpec(value: unknown): value is CircleSpec {
    if (value === null || typeof value !== 'object') return false;
    const {centre, radius} = value as Record<string, unknown>;
    return isInversionPoint(centre) && isInversionRadius(radius);
}

export const isInversion = isCircleSpec;

export function isInversionSource(value: unknown): value is InversionSource {
    if (value === null || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.kind === 'circle') return isCircleSpec(v);
    if (v.kind === 'line') {
        return isInversionPoint(v.p) && isInversionPoint(v.q) && !((v.p as GridPoint).x === (v.q as GridPoint).x && (v.p as GridPoint).y === (v.q as GridPoint).y);
    }
    return false;
}

const complexOf = (p: GridPoint): Complex => ({re: p.x, im: p.y});
const rational = (p: GridPoint): RationalPoint => RationalPoint.fromGrid(p);
const circleOf = (spec: CircleSpec): Circle => ({centre: rational(spec.centre), r2: Rational.of(spec.radius * spec.radius)});

function positionOf(power: Rational): InversionPosition {
    const s = power.sign();
    return s < 0 ? 'inside' : s === 0 ? 'on' : 'outside';
}

const within = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= INVERSION_DRAW_CAP;

const INVALID = Object.freeze({kind: 'invalid'} as const);
export type Invalid = typeof INVALID;

// ---------------------------------------------------------------------------------------------------------------------------
// Point
// ---------------------------------------------------------------------------------------------------------------------------

export type PointAnalysis =
    | {readonly kind: 'centre'}
    | Invalid
    | {
        readonly kind: 'image';
        /** Exact image from `invertExact`. */
        readonly exact: RationalPoint;
        /** Drawn image from `circleInversion`. */
        readonly drawn: XY;
        /** The drawn image, or undefined beyond `INVERSION_DRAW_CAP`. */
        readonly board: BoardXY | undefined;
        /** Unit vector from the centre towards X (and towards the image), for an edge marker. */
        readonly direction: XY;
        /** Exact: the power of X with respect to the circle of inversion. */
        readonly position: InversionPosition;
    };

export function analysePoint(inversion: Inversion, x: GridPoint): PointAnalysis {
    if (!isInversion(inversion) || !isInversionPoint(x)) return INVALID;
    if (x.x === inversion.centre.x && x.y === inversion.centre.y) return {kind: 'centre'};
    const circle = circleOf(inversion);
    const exact = invertExact(rational(x), circle.centre, circle.r2);
    const result = circleInversion(complexOf(x), complexOf(inversion.centre), inversion.radius);
    if (result.kind !== 'point') return INVALID;
    const drawn = {x: result.point.re, y: result.point.im};
    const dx = x.x - inversion.centre.x;
    const dy = x.y - inversion.centre.y;
    const size = Math.hypot(dx, dy);
    return {
        kind: 'image',
        exact,
        drawn,
        board: within(drawn.x) && within(drawn.y) && toBoard(exact) ? {x: drawn.x, y: drawn.y} : undefined,
        direction: {x: dx / size, y: dy / size},
        position: positionOf(powerOfPoint(rational(x), circle)),
    };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Source circle or line
// ---------------------------------------------------------------------------------------------------------------------------

export type ExactImage =
    | {readonly kind: 'circle'; readonly centre: RationalPoint; readonly r2: Rational}
    | {readonly kind: 'line'; readonly a: Rational; readonly b: Rational; readonly c: Rational};

export type SourceAnalysis =
    | Invalid
    | {
        readonly kind: 'image';
        readonly shape: 'circle' | 'line';
        /** Exact: the source passes through the centre of inversion (then the image is a line / the line itself). */
        readonly throughCentre: boolean;
        /** The image from `inversionImage`, as centre and radius, or point and direction. */
        readonly drawn: GeneralizedCircleShape;
        /** The same, or undefined when a coordinate or the radius exceeds `INVERSION_DRAW_CAP`. */
        readonly board: GeneralizedCircleShape | undefined;
        /** Exact image from the integer form of the canonical result. A line is `a x + b y = c` with coprime integers. */
        readonly exact: ExactImage;
    };

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

function sourceForm(source: InversionSource): GeneralizedCircle | undefined {
    return source.kind === 'circle'
        ? circleFromCentreRadius(complexOf(source.centre), source.radius)
        : lineThroughPoints(complexOf(source.p), complexOf(source.q));
}

function throughCentre(inversion: Inversion, source: InversionSource): boolean {
    const c = rational(inversion.centre);
    if (source.kind === 'circle') return powerOfPoint(c, circleOf(source)).isZero();
    const line = lineThrough(rational(source.p), rational(source.q));
    return 'kind' in line && line.kind === 'line' && lineValue(line, c).isZero();
}

function drawable(shape: GeneralizedCircleShape): boolean {
    return shape.kind === 'circle'
        ? within(shape.centre.re) && within(shape.centre.im) && within(shape.radius)
        : within(shape.point.re) && within(shape.point.im);
}

/** The exact image from an integer-form image `A|z|^2 + 2 Re(conj(B) z) + C = 0`, or undefined if it is not an integer form. */
function exactFromForm(g: GeneralizedCircle): ExactImage | undefined {
    const integers = [g.A, g.B.re, g.B.im, g.C];
    if (!integers.every(Number.isSafeInteger)) return undefined;
    if (g.A !== 0) {
        const A = Rational.of(g.A);
        const centre = new RationalPoint(Rational.of(-g.B.re).div(A), Rational.of(-g.B.im).div(A));
        const b2 = Rational.of(g.B.re).mul(Rational.of(g.B.re)).add(Rational.of(g.B.im).mul(Rational.of(g.B.im)));
        const r2 = b2.sub(A.mul(Rational.of(g.C))).div(A.mul(A));
        return {kind: 'circle', centre, r2};
    }
    // 2 Bx x + 2 By y + C = 0, i.e. (2 Bx) x + (2 By) y = -C, reduced by the gcd with the first nonzero coefficient positive.
    let a = 2 * g.B.re;
    let b = 2 * g.B.im;
    let c = -g.C;
    const scale = gcd(gcd(a, b), c) || 1;
    const sign = a !== 0 ? Math.sign(a) : Math.sign(b);
    a = (a * sign) / scale;
    b = (b * sign) / scale;
    c = (c * sign) / scale;
    return {kind: 'line', a: Rational.of(a + 0), b: Rational.of(b + 0), c: Rational.of(c + 0)};
}

export function analyseSource(inversion: Inversion, source: InversionSource): SourceAnalysis {
    if (!isInversion(inversion) || !isInversionSource(source)) return INVALID;
    const form = sourceForm(source);
    if (!form) return INVALID;
    const image = inversionImage(form, complexOf(inversion.centre), inversion.radius);
    if (image.kind !== 'image' || !image.exact) return INVALID;
    const drawn = describeGeneralizedCircle(image.circle);
    const exact = exactFromForm(image.circle);
    if (!drawn || !exact) return INVALID;
    return {
        kind: 'image',
        shape: image.shape,
        throughCentre: throughCentre(inversion, source),
        drawn,
        board: drawable(drawn) ? drawn : undefined,
        exact,
    };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Power of a point
// ---------------------------------------------------------------------------------------------------------------------------

/** Relative tolerance of the tangent decision for a secant at a double angle: a direction is never exactly tangent. */
const SECANT_TANGENT_TOLERANCE = 1e-12;

export type SecantResult =
    | {readonly kind: 'miss'}
    | {readonly kind: 'tangent'; readonly point: XY}
    /** `A`, `B` are inexact; `product = PA * PB` is the signed product of directed distances along the direction (equals the power). */
    | {readonly kind: 'two'; readonly A: XY; readonly B: XY; readonly product: number};

export interface TangentResult {
    /** Inexact: the square root of the power. 0 when P is on the circle. */
    readonly length: number;
    /** The two points of tangency (inexact); both P when P is on the circle. */
    readonly points: readonly [XY, XY];
}

export type PowerAnalysis =
    | Invalid
    | {
        readonly kind: 'power';
        /** Exact power of P with respect to the circle: negative inside, 0 on, positive outside. */
        readonly power: Rational;
        readonly position: InversionPosition;
        /** The direction normalised to [0, 360). */
        readonly thetaDeg: number;
        readonly secant: SecantResult;
        /** Defined for P outside or on the circle. */
        readonly tangent: TangentResult | undefined;
    };

export function normaliseTheta(thetaDeg: number): number {
    const t = ((thetaDeg % 360) + 360) % 360;
    return t >= 360 ? 0 : t;
}

export function analysePower(p: GridPoint, circle: CircleSpec, thetaDeg: number): PowerAnalysis {
    if (!isInversionPoint(p) || !isCircleSpec(circle) || typeof thetaDeg !== 'number' || !Number.isFinite(thetaDeg)) return INVALID;
    const spec = circleOf(circle);
    const power = powerOfPoint(rational(p), spec);
    const theta = normaliseTheta(thetaDeg);
    const rad = (theta * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const wx = p.x - circle.centre.x;
    const wy = p.y - circle.centre.y;
    const half = dx * wx + dy * wy;
    const powerValue = power.toNumber();
    const disc = half * half - powerValue;
    const tolerance = SECANT_TANGENT_TOLERANCE * circle.radius * circle.radius;
    let secant: SecantResult;
    if (disc < -tolerance) secant = {kind: 'miss'};
    else if (disc <= tolerance) secant = {kind: 'tangent', point: {x: p.x - half * dx, y: p.y - half * dy}};
    else {
        const root = Math.sqrt(disc);
        const t1 = -half - root;
        const t2 = -half + root;
        secant = {
            kind: 'two',
            A: {x: p.x + t1 * dx, y: p.y + t1 * dy},
            B: {x: p.x + t2 * dx, y: p.y + t2 * dy},
            product: t1 * t2,
        };
    }
    let tangent: TangentResult | undefined;
    const point: XY = {x: p.x, y: p.y};
    if (power.sign() === 0) tangent = {length: 0, points: [point, point]};
    else if (power.sign() > 0) {
        const d2 = wx * wx + wy * wy;
        const k = (circle.radius * circle.radius) / d2;
        const h = (circle.radius * Math.sqrt(d2 - circle.radius * circle.radius)) / d2;
        const cx = circle.centre.x;
        const cy = circle.centre.y;
        tangent = {
            length: Math.sqrt(powerValue),
            points: [{x: cx + k * wx - h * wy, y: cy + k * wy + h * wx}, {x: cx + k * wx + h * wy, y: cy + k * wy - h * wx}],
        };
    }
    return {kind: 'power', power, position: positionOf(power), thetaDeg: theta, secant, tangent};
}

// ---------------------------------------------------------------------------------------------------------------------------
// Angle between two circles before and after inversion
// ---------------------------------------------------------------------------------------------------------------------------

export interface TangentAngle {
    /** Degrees in (-90, 90], from the first curve to the second, counter-clockwise positive. */
    readonly signed: number;
    readonly unsigned: number;
}

export type AngleAnalysis =
    | Invalid
    | {readonly kind: 'no-intersection'}
    | {readonly kind: 'tangent'}
    | {readonly kind: 'coincident'}
    | {readonly kind: 'point-at-centre'}
    | {
        readonly kind: 'angle';
        /** The chosen intersection point Q (inexact). */
        readonly point: XY;
        /** Its image Q' from `circleInversion` (inexact). */
        readonly image: XY;
        /** Undefined when Q' lies beyond `INVERSION_DRAW_CAP`. */
        readonly imageBoard: BoardXY | undefined;
        readonly before: TangentAngle;
        readonly after: TangentAngle;
    };

/** Wrap an angle in degrees between undirected lines into (-90, 90]. */
function wrapLineAngle(degrees: number): number {
    let a = ((degrees % 180) + 180) % 180; // [0, 180)
    if (a > 90) a -= 180;
    return a === 0 ? 0 : a;
}

function tangentAngle(t1: XY, t2: XY): TangentAngle | undefined {
    const cross = t1.x * t2.y - t1.y * t2.x;
    const dot = t1.x * t2.x + t1.y * t2.y;
    if (cross === 0 && dot === 0) return undefined;
    const signed = wrapLineAngle((Math.atan2(cross, dot) * 180) / Math.PI);
    return Number.isFinite(signed) ? {signed, unsigned: Math.abs(signed)} : undefined;
}

/** Tangent direction at q of a drawn circle (perpendicular to the radius) or line. */
function tangentDirection(shape: GeneralizedCircleShape, q: XY): XY {
    if (shape.kind === 'line') return {x: shape.direction.re, y: shape.direction.im};
    return {x: -(q.y - shape.centre.im), y: q.x - shape.centre.re};
}

export function analyseAngle(inversion: Inversion, first: CircleSpec, second: CircleSpec, which: 0 | 1): AngleAnalysis {
    if (!isInversion(inversion) || !isCircleSpec(first) || !isCircleSpec(second) || (which !== 0 && which !== 1)) return INVALID;
    const c1 = circleOf(first);
    const c2 = circleOf(second);
    const hit = intersectCircles(c1, c2);
    if (hit.kind === 'none') return {kind: 'no-intersection'};
    if (hit.kind === 'coincident') return {kind: 'coincident'};
    if (hit.kind === 'tangent') return {kind: 'tangent'};
    const q = hit.points[which];
    const centre = inversion.centre;
    if (Math.hypot(q.x - centre.x, q.y - centre.y) < 1e-9) return {kind: 'point-at-centre'};
    const point: XY = {x: q.x, y: q.y};
    const before = tangentAngle(
        {x: -(q.y - first.centre.y), y: q.x - first.centre.x},
        {x: -(q.y - second.centre.y), y: q.x - second.centre.x},
    );
    const inverted = circleInversion(complexOf2(q), complexOf(centre), inversion.radius);
    if (inverted.kind !== 'point' || !before) return INVALID;
    const image: XY = {x: inverted.point.re, y: inverted.point.im};
    const forms = [first, second].map(s => circleFromCentreRadius(complexOf(s.centre), s.radius));
    const shapes = forms.map(f => {
        if (!f) return undefined;
        const result = inversionImage(f, complexOf(centre), inversion.radius);
        return result.kind === 'image' ? describeGeneralizedCircle(result.circle) : undefined;
    });
    if (!shapes[0] || !shapes[1]) return INVALID;
    const after = tangentAngle(tangentDirection(shapes[0], image), tangentDirection(shapes[1], image));
    if (!after) return INVALID;
    return {
        kind: 'angle',
        point,
        image,
        imageBoard: within(image.x) && within(image.y) ? {x: image.x, y: image.y} : undefined,
        before,
        after,
    };
}

const complexOf2 = (p: XY): Complex => ({re: p.x, im: p.y});

// ---------------------------------------------------------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------------------------------------------------------

export type InversionExampleId =
    | 'point' | 'through-centre' | 'not-through-centre' | 'power' | 'orthogonal' | 'angle' | 'line-through-centre';

export interface InversionExample {
    readonly id: InversionExampleId;
    readonly inversion: Inversion;
    readonly point?: GridPoint;
    readonly source?: InversionSource;
    readonly power?: {readonly point: GridPoint; readonly circle: CircleSpec; readonly thetaDeg: number};
    readonly angle?: {readonly first: CircleSpec; readonly second: CircleSpec; readonly which: 0 | 1};
}

const ORIGIN: GridPoint = {x: 0, y: 0};

export const INVERSION_EXAMPLES: readonly InversionExample[] = [
    {id: 'point', inversion: {centre: ORIGIN, radius: 2}, point: {x: 3, y: 1}},
    {id: 'through-centre', inversion: {centre: ORIGIN, radius: 2}, source: {kind: 'circle', centre: {x: 1, y: 0}, radius: 1}},
    {id: 'not-through-centre', inversion: {centre: ORIGIN, radius: 2}, source: {kind: 'circle', centre: {x: 3, y: 0}, radius: 1}},
    {
        id: 'power',
        inversion: {centre: ORIGIN, radius: 2},
        power: {point: ORIGIN, circle: {centre: {x: 5, y: 0}, radius: 3}, thetaDeg: 0},
    },
    {id: 'orthogonal', inversion: {centre: ORIGIN, radius: 4}, source: {kind: 'circle', centre: {x: 5, y: 0}, radius: 3}},
    {
        id: 'angle',
        inversion: {centre: ORIGIN, radius: 2},
        angle: {first: {centre: {x: 3, y: 0}, radius: 1}, second: {centre: {x: 3, y: 1}, radius: 1}, which: 1},
    },
    {id: 'line-through-centre', inversion: {centre: ORIGIN, radius: 2}, source: {kind: 'line', p: {x: -3, y: -3}, q: {x: 3, y: 3}}},
];

export function inversionExample(id: InversionExampleId): InversionExample {
    const found = INVERSION_EXAMPLES.find(e => e.id === id);
    if (!found) throw new RangeError(`unknown inversion example ${id}`);
    return found;
}
