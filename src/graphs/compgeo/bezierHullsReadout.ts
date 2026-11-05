import {CURVE_PAIR_MAX_DEPTH, CurvePairState} from "../../compgeo/curvePairSubdivision";

/**
 * Pure adapter of the Bezier hulls graph's readout (convexity task 26, spec A6): which lines the shown step supports and the
 * numbers in them. No React, JSXGraph or localization (`BezierHullsControls` turns a line into text). The lines never claim
 * more than the test knows (ADR 0036): a kept pair means "not certified apart", a discarded pair means "separated with a safety
 * margin", and nothing here says the test is exact or that a kept pair meets.
 */
export type BezierHullsLine =
    /** Always: the halving depth of the shown step and the deepest depth of a run. */
    | {readonly kind: "depth"; readonly depth: number; readonly maxDepth: number}
    /** A split step: the pairs about to be tested; no verdict yet. */
    | {readonly kind: "candidates"; readonly candidates: number}
    /** A verdict step: the pairs that remain, of all 4^depth pairs of pieces. */
    | {readonly kind: "kept"; readonly kept: number; readonly of: number}
    /** A verdict step: the pairs tested at this depth and the pairs discarded among them. */
    | {readonly kind: "tests"; readonly tested: number; readonly discarded: number}
    /** The run ended with no pair left: the curves do not meet, certified with a safety margin. */
    | {readonly kind: "empty"}
    /** The run ended at the deepest depth with pairs left: they may or may not meet. */
    | {readonly kind: "remaining"}

export interface BezierHullsReadout {
    readonly lines: readonly BezierHullsLine[];
}

/** The readout lines of a pair state, in reading order. A state with no phase (nothing computed yet) has the depth line only. */
export function bezierHullsReadout(state: CurvePairState): BezierHullsReadout {
    const lines: BezierHullsLine[] = [{kind: "depth", depth: state.depth, maxDepth: CURVE_PAIR_MAX_DEPTH}];
    if (state.phase === "split") {
        lines.push({kind: "candidates", candidates: state.candidates.length});
    } else if (state.phase !== null) {
        lines.push({kind: "kept", kept: state.kept.length, of: 4 ** state.depth});
        lines.push({kind: "tests", tested: state.candidates.length, discarded: state.discarded.length});
        if (state.kept.length === 0) lines.push({kind: "empty"});
        else if (state.depth === CURVE_PAIR_MAX_DEPTH) lines.push({kind: "remaining"});
    }
    return {lines};
}
