import {Language, Message, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {
    basisAll, basisValues, clampedUniformKnots, domain, uniformKnots, validateKnotVector,
} from "../../../bezeg/impl/curve/bspline";
import {knotRejectionMessage} from "./bsplineKnotMessages";
import type {BSplinePresetData} from "./bsplinePresetCollection";

/** Pure model of the B-spline basis plot (lesson L1): no React, JSXGraph or graph state. Knots are raw parameter values (ADR 0024). */

export const BASIS_MIN_DEGREE = 1;
export const BASIS_MAX_DEGREE = 3;
/** Dragging snaps a knot to this grid, so equal values (a repeated knot) are exactly equal. */
export const KNOT_SNAP = 0.01;
/** Knots stay within +-KNOT_LIMIT so a drag or a typed value cannot leave every sensible view. */
export const KNOT_LIMIT = 100;
/** Intervals per plotted function over the domain (the drawing samples; the readout is exact). */
export const BASIS_SAMPLES = 400;
/** Relative offset of the left-limit sample before each interior knot. */
export const KNOT_LEFT_LIMIT = 1e-9;

export const DEFAULT_BASIS_DEGREE = 2;
export const DEFAULT_BASIS_KNOTS: readonly number[] = Object.freeze([0, 0, 0, 1, 2, 2, 2]);
export const DEFAULT_BASIS_T = 0.5;

/** The index n of the last basis function (n + 1 functions) of a vector of this length. */
export const lastIndexOf = (knots: readonly number[], degree: number): number => knots.length - degree - 2;

/** Whether both ends repeat k + 1 times (the first and last k + 1 knots are equal). */
export function isClamped(knots: readonly number[], degree: number): boolean {
    if (knots.length < 2 * (degree + 1)) return false;
    const head = knots.slice(0, degree + 1);
    const tail = knots.slice(knots.length - degree - 1);
    return head.every(knot => knot === head[0]) && tail.every(knot => knot === tail[0]);
}

/** A valid vector for the degree and `n + 1` functions: clamped uniform or uniform. `n` is raised to `degree` when it is smaller. */
export function rebuiltKnots(degree: number, n: number, clamped: boolean): number[] {
    const count = Math.max(n, degree);
    return clamped ? clampedUniformKnots(degree, count) : uniformKnots(degree, count);
}

/** Placeholder control points for the Preset DTO, which the basis plot does not use: one per basis function. */
export const placeholderPoints = (count: number): [number, number][] => Array.from({length: count}, (_, i) => [i, 0] as [number, number]);

export function basisPresetData(degree: number, knots: readonly number[]): BSplinePresetData {
    return {degree, knots: [...knots], points: placeholderPoints(lastIndexOf(knots, degree) + 1)};
}

export const snapKnot = (value: number): number => {
    const snapped = Math.round(value / KNOT_SNAP) / Math.round(1 / KNOT_SNAP);
    return snapped === 0 ? 0 : snapped;
};

const isValid = (knots: readonly number[], degree: number): boolean => {
    const n = lastIndexOf(knots, degree);
    return n >= degree && validateKnotVector(knots, degree, n).ok;
};

/**
 * The vector after dragging knot `index` towards `value`: snapped to the grid, kept within the limit and clamped between its
 * neighbours (it can reach but never pass them, so the order is never changed). The clamp and "nothing changes" are silent
 * (undefined); a result that is not a valid vector (for example a multiplicity above k + 1 or an empty domain) carries the reason.
 */
export function dragKnotEdit(knots: readonly number[], degree: number, index: number, value: number): KnotEdit | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= knots.length || !Number.isFinite(value)) return undefined;
    const low = index > 0 ? knots[index - 1] : -KNOT_LIMIT;
    const high = index < knots.length - 1 ? knots[index + 1] : KNOT_LIMIT;
    const next = Math.min(high, Math.max(low, snapKnot(value)));
    if (next === knots[index]) return undefined;
    const candidate = knots.map((knot, i) => i === index ? next : knot);
    const n = lastIndexOf(candidate, degree);
    if (n < degree) return {rejection: knotRejectionMessage("wrong_length", candidate, degree, degree)};
    const check = validateKnotVector(candidate, degree, n);
    return check.ok ? {knots: candidate} : {rejection: knotRejectionMessage(check.reason, candidate, degree, n)};
}

/** The dragged vector, or undefined when nothing changes or the result is not valid (`dragKnotEdit` gives the reason). */
export function draggedKnots(knots: readonly number[], degree: number, index: number, value: number): number[] | undefined {
    const edit = dragKnotEdit(knots, degree, index, value);
    return edit !== undefined && 'knots' in edit ? edit.knots : undefined;
}

export type KnotEdit = {knots: number[]} | {rejection: Message};

/** A typed knot value: not snapped or clamped, only checked by the kernel for the vector's own `n` (the first refusal wins). */
export function editedKnots(knots: readonly number[], degree: number, index: number, value: number): KnotEdit {
    const candidate = knots.map((knot, i) => i === index ? value : knot);
    const n = lastIndexOf(knots, degree);
    const check = validateKnotVector(candidate, degree, n);
    if (!check.ok) return {rejection: knotRejectionMessage(check.reason, candidate, degree, n)};
    if (Math.abs(value) > KNOT_LIMIT) return {rejection: knotRejectionMessage("not_finite", candidate, degree, n)};
    return {knots: candidate};
}

/** Maps between raw parameter values and display coordinates; with `normalized` the domain [u_k, u_{n+1}] is shown as [0, 1]. */
export interface ParameterView {
    readonly start: number;
    readonly end: number;
    toDisplay(raw: number): number;
    toRaw(display: number): number;
}

export function parameterView(knots: readonly number[], degree: number, normalized: boolean): ParameterView {
    const [start, end] = domain(knots, degree, lastIndexOf(knots, degree));
    const length = end - start;
    return normalized && length > 0
        ? {start, end, toDisplay: raw => (raw - start) / length, toRaw: shown => start + shown * length}
        : {start, end, toDisplay: raw => raw, toRaw: shown => shown};
}

/** The raw parameter held inside the domain (the slider position survives a knot edit that moves the domain). */
export const clampToDomain = (knots: readonly number[], degree: number, t: number): number => {
    const [start, end] = domain(knots, degree, lastIndexOf(knots, degree));
    return Math.min(end, Math.max(start, t));
};

export interface BasisReadout {
    /** Index of the first active function. */
    first: number;
    /** The k + 1 values N_{first,k}..N_{first+k,k} at t. */
    values: number[];
    sum: number;
}

/** The k + 1 possibly nonzero values at `t` and their sum, from the kernel; undefined for an invalid vector. */
export function readoutAt(knots: readonly number[], degree: number, t: number): BasisReadout | undefined {
    if (!isValid(knots, degree)) return undefined;
    const {span, values} = basisValues(knots, degree, clampToDomain(knots, degree, t));
    return {first: span - degree, values, sum: values.reduce((a, b) => a + b, 0)};
}

/** All n + 1 functions at `t` (kernel `basisAll`), or undefined for an invalid vector. */
export function allValuesAt(knots: readonly number[], degree: number, t: number): number[] | undefined {
    return isValid(knots, degree) ? basisAll(knots, degree, clampToDomain(knots, degree, t)) : undefined;
}

export interface BasisSamples {
    /** Raw parameter values, increasing: BASIS_SAMPLES + 1 uniform ones from the domain start to its end, plus each distinct interior knot and its left-limit sample. */
    t: number[];
    /** columns[i][j] = N_{i,k}(t[j]). */
    columns: number[][];
}

/** The plotted samples of every function over the domain; empty for an invalid vector. Computed once per vector, not per curve. */
export function sampleBasis(knots: readonly number[], degree: number): BasisSamples {
    const n = lastIndexOf(knots, degree);
    if (!isValid(knots, degree)) return {t: [], columns: Array.from({length: Math.max(0, n + 1)}, () => [])};
    const [start, end] = domain(knots, degree, n);
    const grid = Array.from({length: BASIS_SAMPLES + 1}, (_, j) => j === BASIS_SAMPLES ? end : start + (end - start) * j / BASIS_SAMPLES);
    // Every distinct interior knot is sampled exactly, and just before it (its left limit within KNOT_LEFT_LIMIT of the domain
    // length), so a jump at a knot of multiplicity k + 1 draws as a vertical step rather than a slanted segment.
    const interior = knots.filter(u => u > start && u < end);
    const delta = (end - start) * KNOT_LEFT_LIMIT;
    const t = [...new Set([...grid, ...interior, ...interior.map(u => u - delta)])].sort((a, b) => a - b);
    const columns: number[][] = Array.from({length: n + 1}, () => []);
    for (const at of t) basisAll(knots, degree, at).forEach((value, i) => columns[i].push(value));
    return {t, columns};
}

/** The localized readout: a heading, the k + 1 active values and their sum (as one line each); empty for an invalid vector. */
export function readoutLines(knots: readonly number[], degree: number, t0: number, normalized: boolean, language: Language): string[] {
    const reading = readoutAt(knots, degree, t0);
    if (!reading) return [];
    const view = parameterView(knots, degree, normalized);
    const shownT = formatNumber(view.toDisplay(clampToDomain(knots, degree, t0)), language, 3);
    return [
        t("bsb_readout_head", {value0: shownT, value1: degree}),
        reading.values.map((value, j) => `N${reading.first + j},${degree} = ${formatNumber(value, language, 4)}`).join("   "),
        t("bsb_readout_sum", {value0: formatNumber(reading.sum, language, 4)}),
    ];
}

/** The localized domain note, or '' for an invalid vector. */
export function domainNote(knots: readonly number[], degree: number, normalized: boolean, language: Language): string {
    if (!isValid(knots, degree)) return '';
    const view = parameterView(knots, degree, normalized);
    const [a, b] = [formatNumber(view.start, language, 2), formatNumber(view.end, language, 2)];
    return normalized ? t("bsb_domain_text_normalized", {value0: a, value1: b}) : t("bsb_domain_text", {value0: a, value1: b});
}

/** The localized reason a vector is not valid, or undefined when it is. */
export function knotProblem(knots: readonly number[], degree: number): Message | undefined {
    const n = lastIndexOf(knots, degree);
    if (n < degree) return knotRejectionMessage("wrong_length", knots, degree, degree);
    const check = validateKnotVector(knots, degree, n);
    return check.ok ? undefined : knotRejectionMessage(check.reason, knots, degree, n);
}

/** The view box [left, top, right, bottom] that shows all knots, their markers and the functions. */
export function basisViewBox(knots: readonly number[], degree: number, normalized: boolean): [number, number, number, number] {
    const finite = knots.every(Number.isFinite) && knots.length > 0;
    const view = finite && isValid(knots, degree) ? parameterView(knots, degree, normalized) : undefined;
    const shown = finite ? knots.map(knot => view ? view.toDisplay(knot) : knot) : [0, 1];
    const low = Math.min(...shown);
    const high = Math.max(...shown);
    const pad = 0.12 * ((high - low) || 1);
    return [low - pad, 1.65, high + pad, -0.55];
}
