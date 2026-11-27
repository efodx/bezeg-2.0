import type {CobwebMap} from '../../recursion/recursionModel';
import {VIEW_BOXES} from './cobwebScene';

/** The least width (and height) of the focus frame per map: the cobweb of a map near its fixed point is shown at about this scale. */
const FOCUS_MIN_SPAN: Readonly<Record<CobwebMap, number>> = {affine: 10, cosine: 2.4, logistic: 0.75};
const FOCUS_MARGIN = 0.4;

/** The start and the fixed point of the opening state of each map, which the opening frame is built around. */
const OPENING_POINTS: Readonly<Record<CobwebMap, readonly (readonly [number, number])[]>> = {
    affine: [[0, 0], [2, 2]],
    cosine: [[0, 0], [0.74, 0.74]],
    logistic: [[0.1, 0.1], [0.2, 0.2]],
};

/**
 * The view intent of a map: the focus frame of its opening state, a tight window (not the whole window of the map, which the director would have to shrink to fit
 * under the cards of a lesson). It is the same box every time, so a lesson scene that restates it is no new say over the followed frame.
 */
export function openingFrame(map: CobwebMap): [number, number, number, number] {
    return focusFrame(map, OPENING_POINTS[map]);
}

/**
 * The box the board frames while the learner watches the cobweb, `[left, top, right, bottom]`: it holds the origin (the axes and their numbers stand there) and the
 * `points` (the start, the fixed point, the first iterates), with a margin, at least `FOCUS_MIN_SPAN` wide and high, and stays inside the window of the map (the whole
 * window when it would be larger). Pure.
 */
export function focusFrame(map: CobwebMap, points: readonly (readonly [number, number])[]): [number, number, number, number] {
    const [wl, wt, wr, wb] = VIEW_BOXES[map];
    const xs = [0, ...points.map(p => p[0])];
    const ys = [0, ...points.map(p => p[1])];
    const fit = (values: number[], lo: number, hi: number): [number, number] => {
        const min = Math.min(...values), max = Math.max(...values);
        const span = Math.min(hi - lo, Math.max((max - min) * (1 + 2 * FOCUS_MARGIN), FOCUS_MIN_SPAN[map]));
        const start = Math.min(Math.max((min + max) / 2 - span / 2, lo), hi - span);
        return [start, start + span];
    };
    const [left, right] = fit(xs, wl, wr);
    const [bottom, top] = fit(ys, wb, wt);
    return [left, top, right, bottom];
}
