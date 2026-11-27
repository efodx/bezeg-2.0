import {message, type Message} from "../../localization";
import type {CurvePairState} from "../../compgeo/curvePairSubdivision";
import {bezierHullsReadout, type BezierHullsLine} from "./bezierHullsReadout";

/** The ids of the sentences of the Bezier hulls readout: the step counter, then one per line kind of the adapter. */
export type BezierHullsNoteId = "step" | BezierHullsLine["kind"];

/** The sentence of one readout line. Exhaustive over the adapter's line kinds. */
function lineMessage(line: BezierHullsLine): Message {
    switch (line.kind) {
        case "depth": return message("bezierhulls_depth", {value0: line.depth, value1: line.maxDepth});
        case "candidates": return message("bezierhulls_candidates", {value0: line.candidates});
        case "kept": return message("bezierhulls_kept", {value0: line.kept, value1: line.of});
        case "tests": return message("bezierhulls_tests", {value0: line.tested, value1: line.discarded});
        case "empty": return message("bezierhulls_empty");
        case "remaining": return message("bezierhulls_remaining");
    }
}

/**
 * The sentences the Bezier hulls readout shows, in reading order, as catalog messages: the one source of the Tools panel and of
 * the declaration's notes (task 08), so the two cannot differ.
 */
export function bezierHullsNotes(state: CurvePairState, step: number, length: number): {id: BezierHullsNoteId; text: Message}[] {
    return [
        {id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(length, 1)})},
        ...bezierHullsReadout(state).lines.map(line => ({id: line.kind, text: lineMessage(line)})),
    ];
}
