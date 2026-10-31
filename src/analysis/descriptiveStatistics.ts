/**
 * Descriptive statistics for the mean/median/box-plot lesson (P4). Pure mathematics: no React, JSXGraph or localization.
 *
 * Inputs are snapped to integer tenths (value = tenths / 10). Order, equality, median, quartiles and the fence
 * comparison are done EXACTLY in integers: quartiles can fall on half tenths and 1.5 IQR on quarter tenths, so the
 * outlier test compares in quarter tenths. Mean and standard deviation are floating point.
 *
 * Conventions (ADR 0027, decision 4): quartiles by the inclusive median-of-halves rule (odd n: the median belongs to
 * both halves; even n: the sample splits without it) by default; the exclusive rule (the median is left out of both
 * halves) is the comparison rule. sigma is the population one (divide by N) by default; the sample one (n - 1) is
 * available and undefined for one value. Invalid input (empty, non-finite) throws a RangeError.
 */

export type QuartileRule = 'inclusive' | 'exclusive';
export type SigmaKind = 'population' | 'sample';

/** Smallest sample for which the box plot is shown. */
export const BOX_PLOT_MIN_VALUES = 3;
/** Tukey fence multiplier, a convention and not a mathematical property. */
export const FENCE_MULTIPLIER = 1.5;

/**
 * Snaps a value to integer tenths, rounding half tenths away from zero so negating the data negates the snap;
 * never returns -0. Throws on non-finite input.
 */
export const toTenths = (value: number): number => {
    if (!Number.isFinite(value)) throw new RangeError('Data values must be finite.');
    const tenths = Math.sign(value) * Math.round(Math.abs(value) * 10);
    return tenths === 0 ? 0 : tenths;
};

/** Validated, snapped and ascending-sorted integer tenths. */
export const sortedTenths = (values: readonly number[]): number[] => {
    if (values.length === 0) throw new RangeError('At least one value is needed.');
    return values.map(toTenths).sort((a, b) => a - b);
};

/** Twice the median of an ascending integer array (an integer, in half units of the array's unit). */
const doubleMedian = (sorted: readonly number[]): number => {
    const n = sorted.length;
    const m = n >> 1;
    return n % 2 === 1 ? 2 * sorted[m] : sorted[m - 1] + sorted[m];
};

/** Lower and upper half of an ascending array under the chosen rule. */
const halves = (sorted: readonly number[], rule: QuartileRule): [number[], number[]] => {
    const n = sorted.length;
    const m = n >> 1;
    if (n % 2 === 0) return [sorted.slice(0, m), sorted.slice(m)];
    return rule === 'inclusive' ? [sorted.slice(0, m + 1), sorted.slice(m)] : [sorted.slice(0, m), sorted.slice(m + 1)];
};

export const mean = (values: readonly number[]): number => {
    const t = sortedTenths(values);
    return t.reduce((s, v) => s + v, 0) / t.length / 10;
};

export const median = (values: readonly number[]): number => doubleMedian(sortedTenths(values)) / 20;

/**
 * Standard deviation from the exact integer numerator n*sum(x^2) - (sum x)^2 (tenths squared):
 * variance = numerator / n^2 (population) or numerator / (n (n - 1)) (sample). Returns undefined for the sample
 * version of one value; the population sigma of one value is 0.
 */
export const standardDeviation = (values: readonly number[], kind: SigmaKind = 'population'): number | undefined => {
    const t = sortedTenths(values);
    const n = t.length;
    const sum = t.reduce((s, v) => s + v, 0);
    const numerator = n * t.reduce((s, v) => s + v * v, 0) - sum * sum;
    if (kind === 'population') return Math.sqrt(numerator) / (n * 10);
    if (n < 2) return undefined;
    return Math.sqrt(numerator / (n * (n - 1))) / 10;
};

/** Sum of (x - c)^2: minimal at the mean. */
export const sumSquaredDeviations = (values: readonly number[], c: number): number =>
    values.reduce((s, v) => s + (v - c) ** 2, 0);

/** Sum of |x - c|: minimal at the median. */
export const sumAbsoluteDeviations = (values: readonly number[], c: number): number =>
    values.reduce((s, v) => s + Math.abs(v - c), 0);

export interface BoxPlotAvailable {
    status: 'ok';
    rule: QuartileRule;
    /** Ascending values in integer tenths. */
    sortedTenths: number[];
    /** Quartiles in half tenths (exact integers). */
    q1Half: number;
    medianHalf: number;
    q3Half: number;
    /** Fences in quarter tenths (exact integers). */
    lowerFenceQuarter: number;
    upperFenceQuarter: number;
    q1: number;
    median: number;
    q3: number;
    iqr: number;
    lowerFence: number;
    upperFence: number;
    /** Whiskers reach the extreme values that are not flagged. */
    whiskerLow: number;
    whiskerHigh: number;
    /** Flagged values (ascending): below the lower or above the upper fence. */
    outliers: number[];
    min: number;
    max: number;
}

export interface BoxPlotUnavailable {
    status: 'too-few';
    rule: QuartileRule;
    n: number;
}

export type FiveNumberSummary = BoxPlotAvailable | BoxPlotUnavailable;

/** Five-number summary, fences and outliers; "too-few" (not an error) for fewer than 3 values. */
export const fiveNumberSummary = (values: readonly number[], rule: QuartileRule = 'inclusive'): FiveNumberSummary => {
    const t = sortedTenths(values);
    if (t.length < BOX_PLOT_MIN_VALUES) return {status: 'too-few', rule, n: t.length};
    const [lower, upper] = halves(t, rule);
    const q1Half = doubleMedian(lower);
    const q3Half = doubleMedian(upper);
    const medianHalf = doubleMedian(t);
    const iqrHalf = q3Half - q1Half;
    // Quarter tenths: value_q = 4 * tenths = 2 * half tenths; 1.5 * IQR = 3 * iqrHalf quarter tenths.
    const lowerFenceQuarter = 2 * q1Half - 3 * iqrHalf;
    const upperFenceQuarter = 2 * q3Half + 3 * iqrHalf;
    const flagged = (v: number) => 4 * v < lowerFenceQuarter || 4 * v > upperFenceQuarter;
    const kept = t.filter(v => !flagged(v));
    return {
        status: 'ok', rule, sortedTenths: t,
        q1Half, medianHalf, q3Half, lowerFenceQuarter, upperFenceQuarter,
        q1: q1Half / 20, median: medianHalf / 20, q3: q3Half / 20, iqr: iqrHalf / 20,
        lowerFence: lowerFenceQuarter / 40, upperFence: upperFenceQuarter / 40,
        whiskerLow: kept[0] / 10, whiskerHigh: kept[kept.length - 1] / 10,
        outliers: t.filter(flagged).map(v => v / 10),
        min: t[0] / 10, max: t[t.length - 1] / 10,
    };
};
