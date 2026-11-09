import {currentLanguage, Language, Message, message, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {checkKnotInsertion, domain, insertKnot, knotJoins, multiplicity, spanSources} from "../../../bezeg/impl/curve/bspline";
import {combAtJoin, curvatureAt, sampleComb} from "../../../bezeg/impl/curve/curvature";
import type {CombTooth, Vec2} from "../../../bezeg/impl/curve/curvature";
import {ControlPoint, DEBOOR_DEFAULT_DEGREE, DEBOOR_DEFAULT_KNOTS, DEBOOR_DEFAULT_POINTS} from "./bsplineDeBoorModel";

/** Pure model of the knot-insertion graph (lesson L3): no React, JSXGraph or graph state. Knots are raw parameter values (ADR 0024). */

export interface InsertionData {
    readonly degree: number;
    readonly knots: readonly number[];
    readonly points: readonly ControlPoint[];
}

export type InsertionExampleId = 'quadratic' | 'cubic';
export const INSERTION_EXAMPLE_IDS: readonly InsertionExampleId[] = ['quadratic', 'cubic'];

/** The L2 quadratic and the L3 continuity cubic, exactly as in the L3 spec section. The cubic already has the double knot u = 2. */
export const insertionExample = (id: InsertionExampleId): InsertionData => id === 'quadratic'
    ? {degree: DEBOOR_DEFAULT_DEGREE, knots: [...DEBOOR_DEFAULT_KNOTS], points: DEBOOR_DEFAULT_POINTS.map(p => [p[0], p[1]] as const)}
    : {degree: 3, knots: [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3], points: [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]]};

/** The first value in the insertion field: the spec's first insertion (u = 1). */
export const INSERTION_DEFAULT_VALUE = 1;
/** The most control points the graph keeps; a further insertion is refused. */
export const INSERTION_MAX_POINTS = 16;
/** Comb teeth per knot span, the tooth length gain (board units per unit of kappa) and the tangent equality tolerance. */
export const COMB_TEETH_PER_SPAN = 40;
export const COMB_GAIN = 0.5;
const TANGENT_TOLERANCE = 1e-9;

export type InsertionRefusalCode = 'not_finite' | 'outside_domain' | 'multiplicity_too_high' | 'too_many_points';
export interface InsertionRefusal {
    readonly reason: InsertionRefusalCode;
    readonly value: number;
}

export type InsertionPlan = { ok: true, knots: number[], points: ControlPoint[] } | { ok: false, reason: InsertionRefusalCode };

/** The kernel's insertion of `x`, or the reason it is refused (checked first, so a refusal never throws). */
export function planInsertion(knots: readonly number[], degree: number, points: readonly ControlPoint[], x: number): InsertionPlan {
    const check = checkKnotInsertion(knots, degree, points.length - 1, x);
    if (!check.ok) return {ok: false, reason: check.reason};
    if (points.length >= INSERTION_MAX_POINTS) return {ok: false, reason: 'too_many_points'};
    const result = insertKnot(knots, degree, points.map(p => [p[0], p[1]]), x);
    return {ok: true, knots: result.knots, points: result.points.map(p => [p[0], p[1]] as const)};
}

/**
 * The refusal as a localizable message, so a language switch re-renders its text. The numbers in it are formatted when the
 * refusal is made (the separator follows the language of that moment).
 */
export function insertionRefusalMessage(refusal: InsertionRefusal, knots: readonly number[], degree: number, pointCount: number): Message {
    const num = (v: number) => formatNumber(v, currentLanguage(), 4);
    switch (refusal.reason) {
        case 'not_finite': return message("bsi_refused_not_finite");
        case 'outside_domain': {
            const [start, end] = domain(knots, degree, pointCount - 1);
            return message("bsi_refused_outside_domain", {value0: num(refusal.value), value1: num(start), value2: num(end)});
        }
        case 'multiplicity_too_high': return message("bsi_refused_multiplicity", {value0: num(refusal.value), value1: degree + 1});
        case 'too_many_points': return message("bsi_refused_too_many", {value0: INSERTION_MAX_POINTS});
    }
}

export interface MultiplicityRow {
    readonly knot: number;
    readonly multiplicity: number;
    /** The parametric continuity order k - m of the curve at this knot; -1 means a break. */
    readonly continuity: number;
}

/** One row per distinct interior knot (strictly inside the domain), in order. */
export function multiplicityRows(knots: readonly number[], degree: number): MultiplicityRow[] {
    const [start, end] = domain(knots, degree, knots.length - degree - 2);
    const rows: MultiplicityRow[] = [];
    for (const knot of knots) {
        if (knot > start && knot < end && !rows.some(row => row.knot === knot)) {
            const m = multiplicity(knots, knot);
            rows.push({knot, multiplicity: m, continuity: degree - m});
        }
    }
    return rows;
}

export interface JoinReport {
    readonly t: number;
    readonly kappaLeft: number | undefined;
    readonly kappaRight: number | undefined;
    readonly jump: number | undefined;
    readonly tangentLeft: Vec2 | undefined;
    readonly tangentRight: Vec2 | undefined;
    /** Both unit tangents exist and agree. */
    readonly tangentContinuous: boolean;
}

/** One-sided curvature and tangent at every interior knot, from the per-span sources (never sampled across the knot). */
export function joinReports(knots: readonly number[], degree: number, points: readonly ControlPoint[]): JoinReport[] {
    return knotJoins(knots, degree, points.map(p => [p[0], p[1]])).map(join => {
        const {kappaLeft, kappaRight, jump} = combAtJoin(join.left, join.right);
        const tangent = (side: typeof join.left): Vec2 | undefined => {
            const {d1, d2} = side.source.at(side.t);
            const c = curvatureAt(d1, d2, side.source.scale);
            return c.kind === 'regular' ? c.tangent : undefined;
        };
        const tangentLeft = tangent(join.left);
        const tangentRight = tangent(join.right);
        const tangentContinuous = !!tangentLeft && !!tangentRight
            && Math.hypot(tangentLeft[0] - tangentRight[0], tangentLeft[1] - tangentRight[1]) < TANGENT_TOLERANCE;
        return {t: join.t, kappaLeft, kappaRight, jump, tangentLeft, tangentRight, tangentContinuous};
    });
}

/** The comb of each non-empty span separately (teeth never cross a knot). */
export function combBySpan(knots: readonly number[], degree: number, points: readonly ControlPoint[]): CombTooth[][] {
    return spanSources(knots, degree, points.map(p => [p[0], p[1]]))
        .map(span => sampleComb(span.source, span.start, span.end, COMB_TEETH_PER_SPAN, COMB_GAIN));
}

/** Teeth as drawn lines (base, tip, gap) and the tooth-tip envelope with a gap between spans. NaN breaks the line. */
export function combPolylines(spans: readonly CombTooth[][]): { teeth: [number[], number[]], envelope: [number[], number[]] } {
    const teeth: [number[], number[]] = [[], []];
    const envelope: [number[], number[]] = [[], []];
    spans.forEach((span, index) => {
        if (index > 0) {
            envelope[0].push(NaN);
            envelope[1].push(NaN);
        }
        for (const tooth of span) {
            teeth[0].push(tooth.base[0], tooth.tip[0], NaN);
            teeth[1].push(tooth.base[1], tooth.tip[1], NaN);
            envelope[0].push(tooth.tip[0]);
            envelope[1].push(tooth.tip[1]);
        }
    });
    return {teeth, envelope};
}

/** The jump readout, one line per interior knot. */
export function jumpReadoutLines(reports: readonly JoinReport[], language: Language): string[] {
    const num = (v: number) => formatNumber(v, language, 4);
    return reports.map(r => {
        if (r.kappaLeft === undefined || r.kappaRight === undefined || r.jump === undefined) {
            return t("bsi_join_singular", {value0: num(r.t)});
        }
        const args = {value0: num(r.t), value1: num(r.kappaLeft), value2: num(r.kappaRight), value3: num(r.jump)};
        return r.tangentContinuous ? t("bsi_join_row_same", args) : t("bsi_join_row_differs", args);
    });
}
