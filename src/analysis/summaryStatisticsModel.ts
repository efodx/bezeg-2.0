import {
    fiveNumberSummary, mean, median, standardDeviation, sumAbsoluteDeviations, sumSquaredDeviations, toTenths,
} from './descriptiveStatistics';
import type {FiveNumberSummary, QuartileRule, SigmaKind} from './descriptiveStatistics';

/*
 * The model of lesson P4 (mean, median, standard deviation and the box plot, spec probability-statistics-lessons.md): 1-15
 * values on a number line, the quartile rule, the kind of sigma and two visibility flags. This module owns validity (a
 * `SummaryIssue` is data, never text) and the derived readout; the mathematics is the kernel `descriptiveStatistics.ts`
 * (ADR 0027 decision 4: inclusive median-of-halves quartiles and population sigma by default). Nothing here touches React,
 * JSXGraph or localization.
 *
 * Limits (documented): every value is an integer tenth in SUMMARY_VALUE_MIN..SUMMARY_VALUE_MAX; the count is
 * SUMMARY_VALUES_MIN..SUMMARY_VALUES_MAX. Values keep the user's order (a dot keeps its identity while dragged). An edit value
 * is snapped to tenths (half tenths away from zero); a non-finite or out-of-range value is refused, never clamped. A stored
 * (imported) value must already be on the tenth grid, so import refuses instead of repairing. Fewer than 3 values is not an
 * error: the box plot is "too-few" in the view.
 */

export const SUMMARY_VALUE_MIN = 0;
export const SUMMARY_VALUE_MAX = 40;
export const SUMMARY_VALUES_MIN = 1;
export const SUMMARY_VALUES_MAX = 15;

export interface SummaryModel {
    /** Data in the user's order, each an integer tenth in SUMMARY_VALUE_MIN..SUMMARY_VALUE_MAX. */
    readonly values: readonly number[];
    readonly rule: QuartileRule;
    readonly sigma: SigmaKind;
    /** Show the box plot (when there are enough values). */
    readonly boxPlot: boolean;
    /** Show the sigma band around the mean. */
    readonly sigmaBand: boolean;
}

export const DEFAULT_SUMMARY_MODEL: SummaryModel = {
    values: [4, 5, 5, 6, 6, 7, 8], rule: 'inclusive', sigma: 'population', boxPlot: true, sigmaBand: false,
};

export const SUMMARY_EXAMPLE_IDS = ['school', 'outlier', 'even'] as const;
export type SummaryExampleId = typeof SUMMARY_EXAMPLE_IDS[number];
export const isSummaryExampleId = (value: unknown): value is SummaryExampleId =>
    typeof value === 'string' && (SUMMARY_EXAMPLE_IDS as readonly string[]).includes(value);

/** The data of the examples; choosing one sets only the values (rule, sigma and visibility are kept). */
export const SUMMARY_EXAMPLES: Readonly<Record<SummaryExampleId, readonly number[]>> = {
    school: [4, 5, 5, 6, 6, 7, 8],
    outlier: [4, 5, 5, 6, 6, 7, 30],
    even: [2, 3, 5, 9],
};

const sameValues = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/** The example whose values the model has (same order; rule, sigma and flags do not matter), or undefined. */
export function summaryExampleOf(model: SummaryModel): SummaryExampleId | undefined {
    return SUMMARY_EXAMPLE_IDS.find(id => sameValues(SUMMARY_EXAMPLES[id], model.values));
}

export type SummaryIssue =
    /** Not an array of SUMMARY_VALUES_MIN..SUMMARY_VALUES_MAX entries. */
    | { readonly kind: 'values'; readonly min: number; readonly max: number }
    /** A value that is not a finite number in min..max (never clamped). */
    | { readonly kind: 'value'; readonly min: number; readonly max: number }
    /** A stored value off the tenth grid (import only; edits snap). */
    | { readonly kind: 'grid' }
    /** An edit index outside 0..count-1. */
    | { readonly kind: 'index'; readonly count: number }
    /** Adding at SUMMARY_VALUES_MAX values. */
    | { readonly kind: 'full'; readonly max: number }
    /** Removing at SUMMARY_VALUES_MIN values. */
    | { readonly kind: 'last'; readonly min: number }
    | { readonly kind: 'rule'; readonly allowed: readonly string[] }
    | { readonly kind: 'sigma'; readonly allowed: readonly string[] }
    | { readonly kind: 'flag'; readonly field: 'boxPlot' | 'sigmaBand' }
    | { readonly kind: 'example'; readonly allowed: readonly string[] };

export type SummaryCheck =
    | { readonly ok: true; readonly model: SummaryModel }
    | { readonly ok: false; readonly issue: SummaryIssue | undefined };

export type SummaryEdit =
    | { readonly ok: true; readonly model: SummaryModel }
    | { readonly ok: false; readonly issue: SummaryIssue };

/** The quartile rules and sigma kinds a user or lesson may pick (also the lesson choice values `summary-rule`, `summary-sigma`). */
export const SUMMARY_RULES = ['inclusive', 'exclusive'] as const satisfies readonly QuartileRule[];
export const SUMMARY_SIGMAS = ['population', 'sample'] as const satisfies readonly SigmaKind[];
const RULES: readonly QuartileRule[] = SUMMARY_RULES;
const SIGMAS: readonly SigmaKind[] = SUMMARY_SIGMAS;

const isRule = (v: unknown): v is QuartileRule => typeof v === 'string' && (RULES as readonly string[]).includes(v);
const isSigma = (v: unknown): v is SigmaKind => typeof v === 'string' && (SIGMAS as readonly string[]).includes(v);
const inRange = (v: number): boolean => v >= SUMMARY_VALUE_MIN && v <= SUMMARY_VALUE_MAX;
const onGrid = (v: number): boolean => Math.abs(10 * v - Math.round(10 * v)) <= 1e-9;

const valuesIssue = (): SummaryIssue => ({kind: 'values', min: SUMMARY_VALUES_MIN, max: SUMMARY_VALUES_MAX});
const valueIssue = (): SummaryIssue => ({kind: 'value', min: SUMMARY_VALUE_MIN, max: SUMMARY_VALUE_MAX});

/**
 * The validity rule of a stored model, checked in the order values, rule, sigma, boxPlot, sigmaBand. A non-object gives
 * `issue: undefined` (the generic message). Unknown properties are dropped; nothing is clamped (a value off the tenth grid is
 * refused); the values are copied.
 */
export function checkSummaryModel(data: unknown): SummaryCheck {
    const reject = (issue: SummaryIssue | undefined): SummaryCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {values, rule, sigma, boxPlot, sigmaBand} = data as Record<string, unknown>;
    if (!Array.isArray(values) || values.length < SUMMARY_VALUES_MIN || values.length > SUMMARY_VALUES_MAX) return reject(valuesIssue());
    if (!values.every(v => typeof v === 'number' && Number.isFinite(v) && inRange(v))) return reject(valueIssue());
    if (!values.every(onGrid)) return reject({kind: 'grid'});
    if (!isRule(rule)) return reject({kind: 'rule', allowed: RULES});
    if (!isSigma(sigma)) return reject({kind: 'sigma', allowed: SIGMAS});
    if (typeof boxPlot !== 'boolean') return reject({kind: 'flag', field: 'boxPlot'});
    if (typeof sigmaBand !== 'boolean') return reject({kind: 'flag', field: 'sigmaBand'});
    return {ok: true, model: {values: values.map(v => toTenths(v) / 10), rule, sigma, boxPlot, sigmaBand}};
}

export function parseSummaryModel(data: unknown): SummaryModel | undefined {
    const check = checkSummaryModel(data);
    return check.ok ? check.model : undefined;
}

/** Snaps an edit value to tenths; undefined when it is not a finite number or the snapped value is outside the range. */
const snapValue = (value: unknown): number | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const snapped = toTenths(value) / 10;
    return inRange(snapped) ? snapped : undefined;
};

const badIndex = (model: SummaryModel, index: unknown): boolean =>
    typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= model.values.length;

/** Moves value `index` (snapped to tenths). A non-finite or out-of-range value, or a bad index, is refused. */
export function moveSummaryValue(model: SummaryModel, index: unknown, value: unknown): SummaryEdit {
    if (badIndex(model, index)) return {ok: false, issue: {kind: 'index', count: model.values.length}};
    const snapped = snapValue(value);
    if (snapped === undefined) return {ok: false, issue: valueIssue()};
    if (snapped === model.values[index as number]) return {ok: true, model};
    return {ok: true, model: {...model, values: model.values.map((v, i) => (i === index ? snapped : v))}};
}

/**
 * Appends a value (it becomes the last dot). Without `value` it is placed at the current median snapped to tenths, a spot
 * inside the data that adds no new extreme (the median stays unless it lay on a half tenth); a given value is snapped and
 * checked like a move.
 * Refused at SUMMARY_VALUES_MAX values.
 */
export function addSummaryValue(model: SummaryModel, value?: unknown): SummaryEdit {
    if (model.values.length >= SUMMARY_VALUES_MAX) return {ok: false, issue: {kind: 'full', max: SUMMARY_VALUES_MAX}};
    const placed = value === undefined ? toTenths(median(model.values)) / 10 : snapValue(value);
    if (placed === undefined) return {ok: false, issue: valueIssue()};
    return {ok: true, model: {...model, values: [...model.values, placed]}};
}

/** Removes value `index`. Refused at SUMMARY_VALUES_MIN values or for a bad index. */
export function removeSummaryValue(model: SummaryModel, index: unknown): SummaryEdit {
    if (badIndex(model, index)) return {ok: false, issue: {kind: 'index', count: model.values.length}};
    if (model.values.length <= SUMMARY_VALUES_MIN) return {ok: false, issue: {kind: 'last', min: SUMMARY_VALUES_MIN}};
    return {ok: true, model: {...model, values: model.values.filter((_, i) => i !== index)}};
}

export function setSummaryRule(model: SummaryModel, value: unknown): SummaryEdit {
    if (!isRule(value)) return {ok: false, issue: {kind: 'rule', allowed: RULES}};
    return {ok: true, model: value === model.rule ? model : {...model, rule: value}};
}

export function setSummarySigma(model: SummaryModel, value: unknown): SummaryEdit {
    if (!isSigma(value)) return {ok: false, issue: {kind: 'sigma', allowed: SIGMAS}};
    return {ok: true, model: value === model.sigma ? model : {...model, sigma: value}};
}

export function setSummaryBoxPlot(model: SummaryModel, value: unknown): SummaryEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field: 'boxPlot'}};
    return {ok: true, model: value === model.boxPlot ? model : {...model, boxPlot: value}};
}

export function setSummarySigmaBand(model: SummaryModel, value: unknown): SummaryEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field: 'sigmaBand'}};
    return {ok: true, model: value === model.sigmaBand ? model : {...model, sigmaBand: value}};
}

/** Chooses a named example: its values (rule, sigma and visibility are kept); anything else is refused. */
export function chooseSummaryExample(model: SummaryModel, id: unknown): SummaryEdit {
    if (!isSummaryExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: SUMMARY_EXAMPLE_IDS}};
    const values = SUMMARY_EXAMPLES[id];
    if (sameValues(values, model.values)) return {ok: true, model};
    return {ok: true, model: {...model, values: [...values]}};
}

// ---- Derived readout --------------------------------------------------------------------------------------------------------

/** Sums of squared and of absolute deviations about one centre. */
export interface DeviationSums {
    readonly squared: number;
    readonly absolute: number;
}

export type SummaryBounds = readonly [left: number, top: number, right: number, bottom: number];

export interface SummaryView {
    readonly n: number;
    readonly mean: number;
    readonly median: number;
    /** The chosen kind; undefined for the sample kind at n = 1 (shown as a dash). */
    readonly sigma: number | undefined;
    readonly sigmaPopulation: number;
    readonly sigmaSample: number | undefined;
    /** The summary under the model's rule, and under the other rule (the convention panel shows both). */
    readonly summary: FiveNumberSummary;
    readonly otherSummary: FiveNumberSummary;
    /** Deviation sums about the mean (minimal squared) and about the median (minimal absolute). */
    readonly atMean: DeviationSums;
    readonly atMedian: DeviationSums;
    readonly bounds: SummaryBounds;
}

const sumsAt = (values: readonly number[], c: number): DeviationSums =>
    ({squared: sumSquaredDeviations(values, c), absolute: sumAbsoluteDeviations(values, c)});

/** Top and bottom of the fitted view: dots sit on y = 0, the box plot occupies about 1..2.5, markers and the band need room below. */
export const SUMMARY_VIEW_TOP = 4;
export const SUMMARY_VIEW_BOTTOM = -2;
/** Narrowest fitted view and the horizontal margin around the values. */
export const SUMMARY_VIEW_MIN_WIDTH = 10;
export const SUMMARY_VIEW_MARGIN = 1;

/**
 * A deterministic view [left, top, right, bottom] covering all values with a margin of SUMMARY_VIEW_MARGIN, at least
 * SUMMARY_VIEW_MIN_WIDTH wide (centred on the data), shifted and then clamped into [-1, 41]. It widens to any fence past
 * that fit. Both quartile rules count, so switching the rule or the box plot never needs a refit.
 */
export function fitSummaryView(values: readonly number[]): SummaryBounds {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const width = Math.max(SUMMARY_VIEW_MIN_WIDTH, hi - lo + 2 * SUMMARY_VIEW_MARGIN);
    const centre = (lo + hi) / 2;
    let left = centre - width / 2;
    let right = centre + width / 2;
    if (left < -1) {
        right += -1 - left;
        left = -1;
    }
    if (right > 41) {
        left -= right - 41;
        right = 41;
    }
    for (const rule of ['inclusive', 'exclusive'] as const) {
        const summary = fiveNumberSummary(values, rule);
        if (summary.status !== 'ok') continue;
        left = Math.min(left, summary.lowerFence - SUMMARY_VIEW_MARGIN);
        right = Math.max(right, summary.upperFence + SUMMARY_VIEW_MARGIN);
    }
    return [Math.max(-1, left), SUMMARY_VIEW_TOP, Math.min(41, right), SUMMARY_VIEW_BOTTOM];
}

export function summaryStatisticsView(model: SummaryModel): SummaryView {
    const {values} = model;
    const m = mean(values);
    const med = median(values);
    const sigmaPopulation = standardDeviation(values, 'population') as number;
    const sigmaSample = standardDeviation(values, 'sample');
    const other: QuartileRule = model.rule === 'inclusive' ? 'exclusive' : 'inclusive';
    return {
        n: values.length, mean: m, median: med,
        sigma: model.sigma === 'population' ? sigmaPopulation : sigmaSample,
        sigmaPopulation, sigmaSample,
        summary: fiveNumberSummary(values, model.rule),
        otherSummary: fiveNumberSummary(values, other),
        atMean: sumsAt(values, m),
        atMedian: sumsAt(values, med),
        bounds: fitSummaryView(values),
    };
}
