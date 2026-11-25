// The view that follows a bisection's state (task 07 slice 4; docs/reviews/ux-picks-app-wide/briefs/notes/07-follow-intent-design.md).
// Pure: the box the board should frame for a history, the marks the view keeps clear of the cards.
import {bisectionExample, type BisectionExample, type BisectionHistory} from '../../analysis/bisection';
import type {ViewBox} from '../base/writes/viewAdapter';
import type {ViewMarks} from '../base/declare/graphDeclaration';

/** The bracket is padded by this share of its width on each side. */
export const FOLLOW_PADDING = 0.25;
/**
 * The padded box is never narrower than this: a bracket of 2^-30 would show a straight line and no sign change. At 0.2 the function
 * is still near-linear through the root and the crossing of the x-axis stays readable.
 */
export const FOLLOW_MIN_WIDTH = 0.2;
/** Share of the function's range over the box that is added above and below it. */
const Y_PADDING = 0.15;
/** The smallest height of the box, so a function that is flat on a narrow box still gets an axis. */
const MIN_HEIGHT = 0.05;
/** The box is at most this many times as high as it is wide (a much taller box makes the equal-unit fit widen it: the cubic's 41-high box became 97 wide). */
export const MAX_HEIGHT_RATIO = 1;
const SAMPLES = 41;

function sampleValues(example: BisectionExample, from: number, to: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        const y = example.value(from + (to - from) * i / (SAMPLES - 1));
        if (Number.isFinite(y)) values.push(y);
    }
    return values;
}

/**
 * The current bracket `[a_n, b_n]` padded by 25 % of its width on each side (never narrower than {@link FOLLOW_MIN_WIDTH}), with y
 * from the function's range over that box, the axis included, plus padding. `[left, top, right, bottom]`.
 */
export function bisectionFollowView(history: BisectionHistory): ViewBox {
    const example = bisectionExample(history.example);
    const centre = (history.currentA + history.currentB) / 2;
    const width = Math.max((history.currentB - history.currentA) * (1 + 2 * FOLLOW_PADDING), FOLLOW_MIN_WIDTH);
    const left = centre - width / 2;
    const right = centre + width / 2;
    const values = [0, ...sampleValues(example, left, right)];
    // A function that climbs steeply over the padded box (the cubic over [-2.4, 2.9] spans 41) would make the fit, which keeps both axes at
    // one scale, widen the box to many times the bracket. Past MAX_HEIGHT_RATIO of the width the range is cut to a window around the axis:
    // the sign change stays framed and the curve leaves the box at the top and bottom.
    const cap = (right - left) * MAX_HEIGHT_RATIO;
    const low = Math.max(Math.min(...values), -cap / 2);
    const high = Math.min(Math.max(...values), cap / 2);
    const pad = Math.max((high - low) * Y_PADDING, (MIN_HEIGHT - (high - low)) / 2, 0);
    return [left, high + pad, right, low - pad];
}

/** What stays visible and clear of the cards: the bracket's ends on the axis and the midpoint just revealed; the curve over the bracket when there is room. */
export function bisectionViewMarks(history: BisectionHistory): ViewMarks {
    const example = bisectionExample(history.example);
    const last = history.steps.at(-1);
    const must: ViewMarks['must'] = [
        {kind: 'point', x: history.currentA, y: 0},
        {kind: 'point', x: history.currentB, y: 0},
        ...(last ? [{kind: 'point' as const, x: last.mid, y: 0}] : []),
    ];
    const points: [number, number][] = [];
    for (let i = 0; i < SAMPLES; i++) {
        const x = history.currentA + (history.currentB - history.currentA) * i / (SAMPLES - 1);
        const y = example.value(x);
        if (Number.isFinite(y)) points.push([x, y]);
    }
    return {must, nice: [{kind: 'polyline', points}]};
}
