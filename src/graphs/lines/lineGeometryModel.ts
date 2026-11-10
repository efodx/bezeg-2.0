import {Circle, intersectLineCircle, Line, LineCircleIntersection, lineThrough, lineValue} from '../../compgeo/circle';
import {GridPoint, isGridCoordinate} from '../../compgeo/grid';
import {
    angleBetweenDirections, DirectionAngle, distance, distanceSquared, explicitForm, ExplicitForm, footOfPerpendicular, InterceptForm,
    interceptForm, intersectLines, LinesIntersection, normalizeLine, parallel, perpendicular, project, sameLine,
} from '../../compgeo/lineForms';
import {Rational, RationalPoint} from '../../compgeo/rational';

/**
 * Stored state and derived numbers of the line graph (docs/adr/0046-line-geometry-graph-and-integer-lines.md, sections 1 and 2).
 * Pure TypeScript: no React, JSXGraph or localization (messages are English developer text, as in the trigonometry model).
 *
 * Only the fields of `LineGeometryState` are stored: the mode, what the intersect mode meets, and the handles on the integer
 * grid [-8, 8]^2. Normal forms, feet, distances, angles and intersections come from `deriveLineGeometry`; a Preset that
 * carries such fields is accepted and they are dropped (unknown properties are ignored). Imported values are never snapped or
 * clamped: an off-grid or out-of-range field rejects the whole state. Input from the UI uses `snapGridInput`.
 */

// ---- Result type (same shape as the trigonometry model) ----

export type LineErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing';
export interface LineError {
    readonly field: string;
    readonly reason: LineErrorReason;
    readonly message: string;
}
export type LineResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: LineError};

const ok = <T>(value: T): LineResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: LineErrorReason, message: string): LineResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

// ---- Ranges and fields ----

/** Handles live on the integer grid [-GRID_LIMIT, GRID_LIMIT]^2. */
export const GRID_LIMIT = 8;
export const LINE_MODES = ['forms', 'normal', 'angle', 'distance', 'intersect'] as const;
export type LineMode = typeof LINE_MODES[number];
/** What the intersect mode meets the first line with. */
export const INTERSECT_TARGETS = ['lines', 'circle'] as const;
export type IntersectTarget = typeof INTERSECT_TARGETS[number];
/** The grid-point fields: the first line P, Q; the second line R, S; the point T; the circle's centre O and boundary point B. */
export const POINT_FIELDS = ['P', 'Q', 'R', 'S', 'T', 'O', 'B'] as const;
export type PointField = typeof POINT_FIELDS[number];

export interface LineGeometryState {
    readonly mode: LineMode;
    readonly target: IntersectTarget;
    readonly P: GridPoint;
    readonly Q: GridPoint;
    readonly R: GridPoint;
    readonly S: GridPoint;
    readonly T: GridPoint;
    readonly O: GridPoint;
    readonly B: GridPoint;
}

/**
 * Spec examples: line through P = (-2, 1) and Q = (4, 4) (x - 2y = -4); the line through T = (3, -2) and (2, 0) (2x + y = 4,
 * perpendicular to it, meeting it in (4/5, 12/5)); the circle with centre (1, 0) through (3, 1) (r^2 = 5, tangent to the first line).
 */
export const DEFAULT_LINE_STATE: LineGeometryState = {
    mode: 'forms', target: 'lines',
    P: {x: -2, y: 1}, Q: {x: 4, y: 4}, R: {x: 3, y: -2}, S: {x: 2, y: 0}, T: {x: 3, y: -2}, O: {x: 1, y: 0}, B: {x: 3, y: 1},
};

// ---- Parsers (strict, no snapping) ----

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): LineResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

function parseCoordinate(value: unknown, field: string): LineResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected an integer.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number (an integer).`);
    if (Math.abs(value) > GRID_LIMIT) return fail(field, 'out-of-range', `${field} is outside [-${GRID_LIMIT}, ${GRID_LIMIT}].`);
    if (!isGridCoordinate(value) || !Number.isInteger(value)) return fail(field, 'off-grid', `${field} must be an integer grid coordinate.`);
    return ok(norm(value));
}

function parsePoint(value: unknown, field: string): LineResult<GridPoint> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {x, y} on the integer grid.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {x, y}.`);
    const x = parseCoordinate(value.x, `${field}.x`);
    if (!x.ok) return x;
    const y = parseCoordinate(value.y, `${field}.y`);
    if (!y.ok) return y;
    return ok({x: x.value, y: y.value});
}

export function parseLineGeometryState(data: unknown): LineResult<LineGeometryState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The line state must be an object.');
    const mode = parseChoice(data.mode, 'mode', LINE_MODES);
    if (!mode.ok) return mode;
    const target = parseChoice(data.target, 'target', INTERSECT_TARGETS);
    if (!target.ok) return target;
    const points: Record<string, GridPoint> = {};
    for (const field of POINT_FIELDS) {
        const point = parsePoint(data[field], field);
        if (!point.ok) return point;
        points[field] = point.value;
    }
    return ok({mode: mode.value, target: target.value, P: points.P, Q: points.Q, R: points.R, S: points.S, T: points.T, O: points.O, B: points.B});
}

export const serializeLineGeometryState = (s: LineGeometryState): LineGeometryState => ({
    mode: s.mode, target: s.target,
    P: {x: s.P.x, y: s.P.y}, Q: {x: s.Q.x, y: s.Q.y}, R: {x: s.R.x, y: s.R.y}, S: {x: s.S.x, y: s.S.y},
    T: {x: s.T.x, y: s.T.y}, O: {x: s.O.x, y: s.O.y}, B: {x: s.B.x, y: s.B.y},
});

export interface SnappedCoordinate {
    readonly value: number;
    /** True only when the grid limit moved the rounded value. */
    readonly clamped: boolean;
    /** True when the stored value differs from the input. */
    readonly adjusted: boolean;
}

/** Dragged or typed coordinate to the nearest integer, clamped to [-8, 8]. Non-finite input is an error. */
export function snapGridInput(input: number, field = 'coordinate'): LineResult<SnappedCoordinate> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input);
    const value = norm(Math.min(GRID_LIMIT, Math.max(-GRID_LIMIT, rounded)));
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

// ---- Derived numbers ----

const rat = (point: GridPoint) => RationalPoint.fromGrid(point);

/** A line through two distinct grid points: `raw` as `lineThrough` gives it, `line` normalised, `u` the direction Q - P. */
export interface LineData {
    readonly raw: Line;
    readonly line: Line;
    readonly u: RationalPoint;
}

/** `undefined` when the points coincide (no line). */
export function lineData(p: GridPoint, q: GridPoint): LineData | undefined {
    const raw = lineThrough(rat(p), rat(q));
    if (raw.kind !== 'line') return undefined;
    return {raw, line: normalizeLine(raw), u: rat(q).sub(rat(p))};
}

export type InterceptStatus =
    | {readonly kind: 'form'; readonly form: InterceptForm}
    | {readonly kind: 'origin'}
    | {readonly kind: 'axis-parallel'};

export interface FormsDerived {
    readonly explicit: ExplicitForm;
    readonly intercept: InterceptStatus;
    /** `dx` and `dy` of the dragged points, or `vertical` when the two-point form `y - y1 = dy/dx (x - x1)` has no slope. */
    readonly twoPoint: {readonly vertical: false; readonly dx: number; readonly dy: number} | {readonly vertical: true};
}

export type NormalRelation = 'same' | 'parallel' | 'perpendicular' | 'neither';

export interface NormalDerived {
    /** Normals (a, b) of the two normalised lines. */
    readonly n1: RationalPoint;
    readonly n2: RationalPoint;
    /** `a1 b2 - a2 b1` and `a1 a2 + b1 b2` of the normalised lines, exact. */
    readonly cross: Rational;
    readonly dot: Rational;
    readonly relation: NormalRelation;
    /** The product of the slopes, only when neither line is vertical. */
    readonly slopeProduct: Rational | undefined;
}

export interface AngleDerived extends DirectionAngle {
    readonly u: RationalPoint;
    readonly v: RationalPoint;
    readonly relation: 'parallel' | 'perpendicular' | 'neither';
    /** `|u - v|^2` and `|u|^2 + |v|^2 - 2 u.v`: the cosine rule's two sides, equal. */
    readonly differenceSquared: Rational;
    readonly uSquared: Rational;
    readonly vSquared: Rational;
}

export interface DistanceDerived {
    /** `a Tx + b Ty - c` and `a^2 + b^2` of the normalised line. */
    readonly value: Rational;
    readonly normSquared: Rational;
    readonly n: RationalPoint;
    /** The vector from P to T, its dot product with n and its exact projection on n. */
    readonly pt: RationalPoint;
    readonly ptDotN: Rational;
    readonly projection: RationalPoint;
    readonly foot: RationalPoint;
    readonly distanceSquared: Rational;
    /** Computed double, labelled approximate in the readouts. */
    readonly distance: number;
    readonly onLine: boolean;
}

export interface CircleDerived {
    readonly circle: Circle;
    /** `s = a Ox + b Oy - c`, `n2 = a^2 + b^2` of the normalised line and the discriminant `r^2 n2 - s^2`. */
    readonly s: Rational;
    readonly normSquared: Rational;
    readonly discriminant: Rational;
    readonly result: LineCircleIntersection;
}

export type DegenerateInput = 'first-line' | 'second-line' | 'circle';

export interface LineGeometryDerived {
    readonly first: LineData | undefined;
    readonly second: LineData | undefined;
    /** The first missing input of the mode (coincident points), or `undefined` when everything is defined. */
    readonly degenerate: DegenerateInput | undefined;
    readonly forms: FormsDerived | undefined;
    readonly normal: NormalDerived | undefined;
    readonly angle: AngleDerived | undefined;
    readonly distance: DistanceDerived | undefined;
    readonly lines: LinesIntersection | undefined;
    readonly circle: CircleDerived | undefined;
}

function deriveForms(state: LineGeometryState, first: LineData): FormsDerived {
    const {line} = first;
    const intercept = interceptForm(line);
    const interceptStatus: InterceptStatus = intercept
        ? {kind: 'form', form: intercept}
        : line.c.isZero() ? {kind: 'origin'} : {kind: 'axis-parallel'};
    const dx = state.Q.x - state.P.x;
    return {
        explicit: explicitForm(line),
        intercept: interceptStatus,
        twoPoint: dx === 0 ? {vertical: true} : {vertical: false, dx, dy: state.Q.y - state.P.y},
    };
}

function deriveNormal(first: LineData, second: LineData): NormalDerived {
    const l1 = first.line;
    const l2 = second.line;
    const k = (line: Line) => {
        const form = explicitForm(line);
        return form.vertical ? undefined : form.k;
    };
    const k1 = k(l1);
    const k2 = k(l2);
    let relation: NormalRelation = 'neither';
    if (sameLine(l1, l2)) relation = 'same';
    else if (parallel(l1, l2)) relation = 'parallel';
    else if (perpendicular(l1, l2)) relation = 'perpendicular';
    return {
        n1: new RationalPoint(l1.a, l1.b),
        n2: new RationalPoint(l2.a, l2.b),
        cross: l1.a.mul(l2.b).sub(l2.a.mul(l1.b)),
        dot: l1.a.mul(l2.a).add(l1.b.mul(l2.b)),
        relation,
        slopeProduct: k1 && k2 ? k1.mul(k2) : undefined,
    };
}

function deriveAngle(first: LineData, second: LineData): AngleDerived {
    const {u} = first;
    const {u: v} = second;
    const angle = angleBetweenDirections(u, v);
    const relation = angle.cross.isZero() ? 'parallel' : angle.dot.isZero() ? 'perpendicular' : 'neither';
    const diff = u.sub(v);
    return {...angle, u, v, relation, differenceSquared: diff.dot(diff), uSquared: u.dot(u), vSquared: v.dot(v)};
}

function deriveDistance(state: LineGeometryState, first: LineData): DistanceDerived {
    const {line} = first;
    const t = rat(state.T);
    const n = new RationalPoint(line.a, line.b);
    const pt = t.sub(rat(state.P));
    const d2 = distanceSquared(line, t);
    return {
        value: lineValue(line, t),
        normSquared: n.dot(n),
        n,
        pt,
        ptDotN: pt.dot(n),
        projection: project(pt, n),
        foot: footOfPerpendicular(line, t),
        distanceSquared: d2,
        distance: distance(line, t),
        onLine: lineValue(line, t).isZero(),
    };
}

function deriveCircle(state: LineGeometryState, first: LineData): CircleDerived | undefined {
    const centre = rat(state.O);
    const radius = rat(state.B).sub(centre);
    const r2 = radius.dot(radius);
    if (r2.isZero()) return undefined;
    const circle: Circle = {centre, r2};
    const {line} = first;
    const s = lineValue(line, centre);
    const normSquared = line.a.mul(line.a).add(line.b.mul(line.b));
    return {circle, s, normSquared, discriminant: r2.mul(normSquared).sub(s.mul(s)), result: intersectLineCircle(line, circle)};
}

/** Whether the mode needs the second line. */
const needsSecondLine = (state: LineGeometryState) =>
    state.mode === 'normal' || state.mode === 'angle' || (state.mode === 'intersect' && state.target === 'lines');

/**
 * Everything the mode reads, recomputed from the validated state. A coincident pair of points leaves its line and everything
 * that depends on it `undefined` and names the first missing input in `degenerate`; nothing here divides by zero.
 */
export function deriveLineGeometry(state: LineGeometryState): LineGeometryDerived {
    const first = lineData(state.P, state.Q);
    const second = needsSecondLine(state) ? lineData(state.R, state.S) : undefined;
    const circleWanted = state.mode === 'intersect' && state.target === 'circle';
    const circle = first && circleWanted ? deriveCircle(state, first) : undefined;
    let degenerate: DegenerateInput | undefined;
    if (!first) degenerate = 'first-line';
    else if (needsSecondLine(state) && !second) degenerate = 'second-line';
    else if (circleWanted && !circle) degenerate = 'circle';
    const empty = {forms: undefined, normal: undefined, angle: undefined, distance: undefined, lines: undefined, circle: undefined};
    if (degenerate || !first) return {first, second, degenerate, ...empty};
    switch (state.mode) {
        case 'forms': return {first, second, degenerate, ...empty, forms: deriveForms(state, first)};
        case 'normal': return {first, second, degenerate, ...empty, normal: second ? deriveNormal(first, second) : undefined};
        case 'angle':
            // the lines' common point anchors the angle arc
            return {
                first, second, degenerate, ...empty,
                angle: second ? deriveAngle(first, second) : undefined,
                lines: second ? intersectLines(first.line, second.line) : undefined,
            };
        case 'distance': return {first, second, degenerate, ...empty, distance: deriveDistance(state, first)};
        default:
            return {
                first, second, degenerate, ...empty,
                lines: second ? intersectLines(first.line, second.line) : undefined,
                circle,
            };
    }
}

// ---- Text of equations (no localization: symbols and numbers only) ----

const MINUS = '−';
const signed = (value: Rational) => value.format().replace('-', MINUS);

/** `a x + b y`-style sum: zero terms are skipped, a unit coefficient is dropped, an empty `symbol` is the constant term. */
export function formatLinearCombination(terms: ReadonlyArray<{readonly coefficient: Rational; readonly symbol: string}>): string {
    let text = '';
    for (const {coefficient, symbol} of terms) {
        if (coefficient.isZero()) continue;
        const negative = coefficient.sign() < 0;
        const magnitude = negative ? coefficient.neg() : coefficient;
        let body: string;
        if (symbol === '') body = magnitude.format();
        else if (magnitude.equals(Rational.ONE)) body = symbol;
        else body = `${magnitude.den === 1n ? magnitude.format() : `(${magnitude.format()})`}${symbol}`;
        if (text === '') text = `${negative ? MINUS : ''}${body}`;
        else text += ` ${negative ? MINUS : '+'} ${body}`;
    }
    return text === '' ? '0' : text;
}

/** The implicit form `a x + b y = c`. */
export function formatImplicit(line: Line): string {
    return `${formatLinearCombination([{coefficient: line.a, symbol: 'x'}, {coefficient: line.b, symbol: 'y'}])} = ${signed(line.c)}`;
}

/** The explicit form `y = k x + n`, or `x = x0` for a vertical line. */
export function formatExplicit(form: ExplicitForm): string {
    if (form.vertical) return `x = ${signed(form.x0)}`;
    return `y = ${formatLinearCombination([{coefficient: form.k, symbol: 'x'}, {coefficient: form.n, symbol: ''}])}`;
}

const asDenominator = (value: Rational) => (value.sign() < 0 || value.den !== 1n ? `(${signed(value)})` : signed(value));

/** The intercept form `x/m + y/n = 1`. */
export function formatIntercept(form: InterceptForm): string {
    return `x/${asDenominator(form.m)} + y/${asDenominator(form.n)} = 1`;
}

/** The two-point form `y - y1 = dy/dx (x - x1)` of the dragged points (undefined for a vertical line). */
export function formatTwoPoint(p: GridPoint, dx: number, dy: number): string {
    const left = formatLinearCombination([{coefficient: Rational.of(1), symbol: 'y'}, {coefficient: Rational.of(-p.y), symbol: ''}]);
    const xPart = formatLinearCombination([{coefficient: Rational.of(1), symbol: 'x'}, {coefficient: Rational.of(-p.x), symbol: ''}]);
    const factor = p.x === 0 ? xPart : `(${xPart})`;
    const run = dx < 0 ? `(${MINUS}${-dx})` : `${dx}`;
    return `${left} = ${dy < 0 ? MINUS : ''}${Math.abs(dy)}/${run} · ${factor}`;
}
