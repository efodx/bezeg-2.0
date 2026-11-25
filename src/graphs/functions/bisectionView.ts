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
const SAMPLES = 41;

function sampleValues(example: BisectionExample, from: number, to: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        const y = example.value(from + (to - from) * i / (SAMPLES - 1));
        if (Number.isFinite(y)) values.push(y);
    }
    return values;
}

/** The bracket the board shows: the one the last revealed step bisected (its ends and midpoint are drawn), the initial one at step 0. */
function shownBracket(history: BisectionHistory): [number, number] {
    const last = history.steps.at(-1);
    return last ? [last.a, last.b] : [history.a, history.b];
}

/**
 * The shown bracket (the one the last step bisected, which holds the new bracket) `[a_n, b_n]` padded by 25 % of its width on each side (never narrower than {@link FOLLOW_MIN_WIDTH}), with y
 * from the function's range over that box, the axis and f(a), f(b), f(m) included, plus padding. `[left, top, right, bottom]`.
 */
export function bisectionFollowView(history: BisectionHistory): ViewBox {
    const example = bisectionExample(history.example);
    const [shownA, shownB] = shownBracket(history);
    const centre = (shownA + shownB) / 2;
    const width = Math.max((shownB - shownA) * (1 + 2 * FOLLOW_PADDING), FOLLOW_MIN_WIDTH);
    const left = centre - width / 2;
    const right = centre + width / 2;
    // The bracket's function values f(a), f(b), f(m) are the lesson's point (the signs), so the range always covers them, the axis and
    // the curve over the padded box. The graph has no equal axis units, so a tall range does not widen the box.
    const last = history.steps.at(-1);
    const marked = [shownA, shownB, ...(last ? [last.mid] : [])].map(x => example.value(x)).filter(Number.isFinite);
    const values = [0, ...marked, ...sampleValues(example, left, right)];
    const low = Math.min(...values);
    const high = Math.max(...values);
    const pad = Math.max((high - low) * Y_PADDING, (MIN_HEIGHT - (high - low)) / 2, 0);
    return [left, high + pad, right, low - pad];
}

/** What stays visible and clear of the cards: the bracket's ends and the midpoint just revealed, on the axis and on the curve; the curve over the bracket when there is room. */
export function bisectionViewMarks(history: BisectionHistory): ViewMarks {
    const example = bisectionExample(history.example);
    const last = history.steps.at(-1);
    const [shownA, shownB] = shownBracket(history);
    const must: ViewMarks['must'] = [
        ...[shownA, shownB, ...(last ? [last.mid] : [])].flatMap(x => {
            const fx = example.value(x);
            return [{kind: 'point' as const, x, y: 0}, ...(Number.isFinite(fx) ? [{kind: 'point' as const, x, y: fx}] : [])];
        }),
    ];
    const points: [number, number][] = [];
    for (let i = 0; i < SAMPLES; i++) {
        const x = shownA + (shownB - shownA) * i / (SAMPLES - 1);
        const y = example.value(x);
        if (Number.isFinite(y)) points.push([x, y]);
    }
    return {must, nice: [{kind: 'polyline', points}]};
}
