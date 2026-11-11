import type {Polyline} from './cobwebScene';

/** Pure geometry of the growth board: windows, bars, samples of the interest curves, caption places. No JSXGraph, React or localization. */

/** JSXGraph bounding box [xmin, ymax, xmax, ymin]. */
export type Box = readonly [number, number, number, number];

/** Half the width of a bar in the sequence panel, in units of k. */
export const BAR_HALF_WIDTH = 0.36;
/** Points per interest curve. */
export const INTEREST_SAMPLES = 80;

/** The point at the fractions (fx, fy) of the window, fy from the bottom: captions follow the window of the panel. */
export function at(box: Box, fx: number, fy: number): {x: number; y: number} {
    return {x: box[0] + fx * (box[2] - box[0]), y: box[3] + fy * (box[1] - box[3])};
}

/** Value range of a panel with the room a caption block needs at the top and the axis caption at the bottom. */
function verticalRange(values: readonly number[]): {low: number; high: number} {
    const finite = values.filter(Number.isFinite);
    const lo = Math.min(0, ...finite);
    const hi = Math.max(0, ...finite);
    const range = hi > lo ? hi - lo : 1;
    return {low: lo < 0 ? lo - 0.12 * range : lo - 0.1 * range, high: hi + 0.35 * range};
}

/** The sequence panel: terms k = 1, ..., N as bars from 0, and the limit line when there is one. */
export function sequenceBox(values: readonly number[], limit: number | null): Box {
    const {low, high} = verticalRange(limit === null ? values : [...values, limit]);
    const count = values.length;
    return [-0.1 * (count + 1), high, count + 1.2, low];
}

/** The outline of one bar per value (k = 1, 2, ...), bars separated by a NaN pair so that the renderer lifts the pen. */
export function barsPath(values: readonly number[], half = BAR_HALF_WIDTH): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    values.forEach((value, index) => {
        const k = index + 1;
        if (index > 0) { x.push(NaN); y.push(NaN); }
        x.push(k - half, k - half, k + half, k + half, k - half);
        y.push(0, value, value, 0, 0);
    });
    return {x, y};
}

/** The interest panel: years on the horizontal axis; the largest of the four values sets the height and leaves room for the legend. */
export function interestBox(values: readonly number[], years: number): Box {
    const top = Math.max(...values.filter(Number.isFinite), 1);
    return [-0.12 * years, 1.6 * top, 1.05 * years, -0.08 * top];
}

export function sampleCurve(f: (t: number) => number, from: number, to: number, count = INTEREST_SAMPLES): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < count; i++) {
        const t = from + (to - from) * i / (count - 1);
        x.push(t);
        y.push(f(t));
    }
    return {x, y};
}

/** The logarithm panel: n on the horizontal axis (from the first to the last point), ln y on the vertical axis. */
export function logBox(ns: readonly number[], lnY: readonly number[]): Box {
    const {low, high} = verticalRange(lnY);
    const last = ns[ns.length - 1];
    return [-0.1 * (last + 1), high, last + 1.2, low];
}

/** The straight line through the first and the last point (an exact chord, not a fit). */
export function chord(ns: readonly number[], lnY: readonly number[]): Polyline {
    const last = ns.length - 1;
    return {x: [ns[0], ns[last]], y: [lnY[0], lnY[last]]};
}

export const sameBox = (a: Box | undefined, b: Box): boolean => a !== undefined && a.every((value, index) => value === b[index]);
