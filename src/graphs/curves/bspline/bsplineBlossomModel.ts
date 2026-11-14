import {formatNumber} from "../../../analysis/format";
import {currentLanguage, LocalizedError, message, Message} from "../../../localization";
import {blossom, domain, evaluate} from "../../../bezeg/impl/curve/bspline";
import type {BSplinePresetData} from "./bsplinePresetCollection";
import {DEFAULT_BASIS_DEGREE, DEFAULT_BASIS_KNOTS} from "./bsplineBasisModel";
import {drawableRejection, ControlPoint, DEBOOR_DEFAULT_POINTS, DEBOOR_MAX_POINTS} from "./bsplineDeBoorModel";

/** The degrees the blossom lesson offers (L6 scope); the kernel refuses others. */
export const BLOSSOM_DEGREES: readonly number[] = Object.freeze([2, 3]);
export const BLOSSOM_MAX_POINTS = DEBOOR_MAX_POINTS;
/** The spec's L2 example: degree 2, knots (0,0,0,1,2,2,2), segment [0,1) (index 2) and the arguments a = 0, b = 1/2 (c = 1 once the degree is 3). */
export const BLOSSOM_DEFAULT_SEGMENT = 2;
export const BLOSSOM_DEFAULT_ARGS: readonly number[] = Object.freeze([0, 0.5, 1]);
/** The slider step of an argument; arguments are rounded so a step lands exactly on a knot. */
export const BLOSSOM_ARG_STEP = 0.01;
/** The arguments of f as text. Slovenian writes a decimal comma, so its arguments are separated like its coordinates, by a semicolon. */
export function blossomArgumentText(args: readonly number[]): string {
    const language = currentLanguage();
    return args.map(a => formatNumber(a, language, 3)).join(language === 'sl' ? '; ' : ', ');
}

/** The arguments of f as TeX: the decimal comma is `{,}` (no space after it) and the separator is followed by a visible space. */
export function blossomArgumentMath(args: readonly number[]): string {
    const language = currentLanguage();
    return args.map(a => formatNumber(a, language, 3).replace(',', '{,}')).join(language === 'sl' ? ';\\ ' : ',\\ ');
}

/** Largest distance for which f(t, ..., t) counts as equal to the curve point. */
const EQUAL_TOLERANCE = 1e-9;

export interface BlossomData {
    readonly degree: number;
    readonly knots: readonly number[];
    readonly points: readonly ControlPoint[];
}

export const defaultBlossomData = (): BlossomData => ({
    degree: DEFAULT_BASIS_DEGREE, knots: [...DEFAULT_BASIS_KNOTS], points: DEBOOR_DEFAULT_POINTS.map(p => [p[0], p[1]] as const),
});

export const blossomPresetData = (data: BlossomData): BSplinePresetData =>
    ({degree: data.degree, knots: [...data.knots], points: data.points.map(p => [p[0], p[1]] as const)});

/** Rejects a Preset the blossom graph cannot show: a degree other than 2 or 3, or curve data the graphs cannot draw. */
export function blossomRejection(data: BSplinePresetData): Message | undefined {
    if (!BLOSSOM_DEGREES.includes(data.degree)) return message("bsl_degree_unsupported", {value0: data.degree});
    return drawableRejection(data, BLOSSOM_MAX_POINTS);
}

export function assertBlossomCurve(data: BSplinePresetData): void {
    const rejection = blossomRejection(data);
    if (rejection) throw new LocalizedError(rejection);
}

/** The indices j of the nonempty spans [u_j, u_{j+1}) with k <= j <= n. */
export function blossomSegments(knots: readonly number[], degree: number): number[] {
    const n = knots.length - degree - 2;
    const result: number[] = [];
    for (let j = degree; j <= n; j++) if (knots[j] < knots[j + 1]) result.push(j);
    return result;
}

/** The domain [u_k, u_{n+1}] arguments range over. */
export const blossomDomain = (knots: readonly number[], degree: number): [number, number] => domain(knots, degree, knots.length - degree - 2);

/** A slider value rounded to 10 decimals (so 0.01 steps land exactly on decimal knots) and held in the domain; non-finite values give undefined. */
export function snapArgument(knots: readonly number[], degree: number, value: number): number | undefined {
    if (!Number.isFinite(value)) return undefined;
    const [start, end] = blossomDomain(knots, degree);
    const rounded = Math.round(value * 1e10) / 1e10;
    return Math.min(end, Math.max(start, rounded === 0 ? 0 : rounded));
}

const permutations = (items: readonly number[]): number[][] =>
    items.length <= 1 ? [[...items]] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest]));

export interface BlossomSnapshot {
    /** f(args) */
    value: ControlPoint;
    /** The interpolation points of the kernel's triangle; levels[0] are the segment's k + 1 control points. */
    levels: ControlPoint[][];
    /** The k + 1 Bezier points f(u_j^(k-i), u_{j+1}^i), i = 0..k. */
    bezier: ControlPoint[];
    /** f with the arguments in reverse order. */
    reversed: ControlPoint;
    /** The largest distance between f(args) and f over every ordering of the arguments. */
    deviation: number;
}

const toPoint = (row: readonly number[]): ControlPoint => [row[0], row[1]];

/** f on one segment, or undefined when the kernel refuses (bad segment, degree or arguments) or the data cannot be evaluated. */
export function blossomValue(knots: readonly number[], degree: number, points: readonly ControlPoint[], segment: number, args: readonly number[]): ControlPoint | undefined {
    try {
        const result = blossom(knots, degree, points, segment, args);
        return result.ok ? toPoint(result.point) : undefined;
    } catch {
        return undefined;
    }
}

/** Everything the board and readouts show for `args` (the first `degree` entries are used), or undefined when it cannot be computed. */
export function blossomSnapshot(knots: readonly number[], degree: number, points: readonly ControlPoint[], segment: number, args: readonly number[]): BlossomSnapshot | undefined {
    const used = args.slice(0, degree);
    try {
        const result = blossom(knots, degree, points, segment, used);
        if (!result.ok) return undefined;
        const value = toPoint(result.point);
        const at = (a: readonly number[]) => blossomValue(knots, degree, points, segment, a);
        const bezier: ControlPoint[] = [];
        for (let i = 0; i <= degree; i++) {
            const p = at([...Array(degree - i).fill(knots[segment]), ...Array(i).fill(knots[segment + 1])]);
            if (!p) return undefined;
            bezier.push(p);
        }
        const reversed = at([...used].reverse());
        if (!reversed) return undefined;
        let deviation = 0;
        for (const order of permutations(used)) {
            const p = at(order);
            if (!p) return undefined;
            deviation = Math.max(deviation, Math.hypot(p[0] - value[0], p[1] - value[1]));
        }
        return {value, levels: result.triangle.levels.map(level => level.map(toPoint)), bezier, reversed, deviation};
    } catch {
        return undefined;
    }
}

export type CurveRelation = 'equal' | 'break' | 'extended' | 'coincides';

export interface CurveCheck {
    t: number;
    /** The curve point C(t) (de Boor). */
    curve: ControlPoint;
    /** equal: t lies in the closed segment and f(t, ..., t) = C(t); break: t is in the segment but the curve is discontinuous there; extended: t is outside the segment and the segment's polynomial, extended there, differs from C(t); coincides: t is outside the segment but the extended polynomial still gives C(t) (the neighbouring pieces lie on one polynomial there). */
    relation: CurveRelation;
}

/** When every argument equals one t: the curve point and how f(t, ..., t) relates to it; otherwise undefined. */
export function curveCheck(knots: readonly number[], degree: number, points: readonly ControlPoint[], segment: number, args: readonly number[]): CurveCheck | undefined {
    const used = args.slice(0, degree);
    const t = used[0];
    if (used.length !== degree || !used.every(a => a === t)) return undefined;
    const value = blossomValue(knots, degree, points, segment, used);
    if (!value) return undefined;
    try {
        const curve = toPoint(evaluate(knots, degree, points, t));
        const inSegment = t >= knots[segment] && t <= knots[segment + 1];
        const close = Math.hypot(curve[0] - value[0], curve[1] - value[1]) <= EQUAL_TOLERANCE * (1 + Math.hypot(curve[0], curve[1]));
        return {t, curve, relation: !inSegment ? (close ? 'coincides' : 'extended') : close ? 'equal' : 'break'};
    } catch {
        return undefined;
    }
}
