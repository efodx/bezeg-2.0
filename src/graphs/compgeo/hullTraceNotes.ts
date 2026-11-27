import {message, messageNumber, type Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {HULL_ALGORITHMS, type HullAlgorithm, type HullEventInfo, type HullNote} from "./hullTraceRun";

/** The ids of the sentences of the hull trace readout: the step, the event's note, its detail, the test count and the totals per algorithm. */
export type HullTraceNoteId = "step" | "note" | "detail" | "count" | `total-${HullAlgorithm}`;

/** The status-line sentence of a trace note. Exhaustive over the three algorithms' note keys; the monotone chain keeps a collinear middle point (`collinearKept`). */
export function hullNoteMessage(note: HullNote, collinearKept = false): Message {
    switch (note) {
        case "phase-lower": return message("hulltrace_note_phase_lower");
        case "phase-upper": return message("hulltrace_note_phase_upper");
        case "test-turn-left": return message("hulltrace_note_test_turn_left");
        case "test-turn-right": return message("hulltrace_note_test_turn_right");
        case "test-collinear": return collinearKept ? message("hullrobust_note_test_collinear_kept") : message("hulltrace_note_test_collinear");
        case "accept-push": return message("hulltrace_note_accept_push");
        case "reject-pop": return message("hulltrace_note_reject_pop");
        case "output-hull": return message("hulltrace_note_output_hull");
        case "output-small": return message("hulltrace_note_output_small");
        case "done-hull": return message("hulltrace_note_done_hull");
        case "done-collinear": return message("hulltrace_note_done_collinear");
        case "done-fewer-than-three": return message("hulltrace_note_done_fewer_than_three");
        case "accept-edge": return message("hulltrace_note_accept_edge");
        case "reject-edge": return message("hulltrace_note_reject_edge");
        case "test-replace-clockwise": return message("hulltrace_note_test_replace_clockwise");
        case "test-replace-farther": return message("hulltrace_note_test_replace_farther");
        case "test-keep-counterclockwise": return message("hulltrace_note_test_keep_counterclockwise");
        case "test-keep-nearer": return message("hulltrace_note_test_keep_nearer");
        case "accept-wrap": return message("hulltrace_note_accept_wrap");
    }
}

/** The name of an algorithm as a catalog message. */
export function hullAlgorithmMessage(algorithm: HullAlgorithm): Message {
    switch (algorithm) {
        case "monotone-chain": return message("hulltrace_algorithm_monotone_chain");
        case "slow-edge-test": return message("hulltrace_algorithm_slow_edge_test");
        case "gift-wrapping": return message("hulltrace_algorithm_gift_wrapping");
    }
}

export interface HullTraceNoteInput {
    step: number;
    length: number;
    event: HullEventInfo | undefined;
    points: readonly GridPoint[];
    gridStepExponent: number;
    /** Total orientation tests of every algorithm on the current points; present only after `done`. */
    totals: Readonly<Record<HullAlgorithm, number>> | undefined;
    collinearKept?: boolean;
}

/**
 * The sentences the hull trace readout shows, in reading order, as catalog messages: the one source of the Tools panel and of the
 * declaration's notes (task 08). Coordinates are shown in grid units times the grid step (`messageNumber(value, 4)` formats like the
 * panel's `formatNumber(value, language, 4)`).
 */
export function hullTraceNotes(input: HullTraceNoteInput): {id: HullTraceNoteId; text: Message}[] {
    const {step, length, event, points, gridStepExponent, totals, collinearKept} = input;
    const scale = 2 ** gridStepExponent;
    const at = (index: number) => {
        const p = points[index];
        return p ? {x: messageNumber(p.x * scale, 4), y: messageNumber(p.y * scale, 4)} : {x: "?", y: "?"};
    };
    const notes: {id: HullTraceNoteId; text: Message}[] = [{id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(length, 1)})}];
    if (event) notes.push({id: "note", text: hullNoteMessage(event.note, collinearKept)});
    if (event?.test) {
        const [, , p] = event.test.points;
        const where = at(p);
        notes.push({id: "detail", text: message("hulltrace_test_detail", {value0: messageNumber(event.test.value * scale * scale, 4), value1: p + 1, value2: where.x, value3: where.y})});
    } else if (event?.pair) {
        const from = at(event.pair.from);
        const to = at(event.pair.to);
        notes.push({id: "detail", text: message("hulltrace_pair_detail", {
            value0: event.pair.from + 1, value1: from.x, value2: from.y, value3: event.pair.to + 1, value4: to.x, value5: to.y,
        })});
    }
    if (event) notes.push({id: "count", text: message("hulltrace_predicate_count", {value0: event.predicateCount})});
    if (totals) {
        for (const id of HULL_ALGORITHMS) notes.push({id: `total-${id}`, text: message("hulltrace_count_row", {value0: hullAlgorithmMessage(id), value1: totals[id]})});
    }
    return notes;
}
