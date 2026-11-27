import {message, type Message} from "../../localization";
import type {EarClippingNote} from "../../compgeo/earClipping";
import type {EarEventInfo, EarRefusal, EarSummary} from "./earClippingRun";

/** The ids of the sentences of the ear clipping readout, in reading order. */
export type EarClippingNoteId =
    | "refusal" | "reversed" | "step" | "note" | "detail" | "triangles" | "count"
    | "result-triangles" | "result-diagonals" | "result-classes" | "result-guards";

const noteMessage = (note: EarClippingNote): Message => {
    switch (note) {
        case "phase-start": return message("earclip_note_phase_start");
        case "test-reflex": return message("earclip_note_test_reflex");
        case "test-blocked": return message("earclip_note_test_blocked");
        case "test-ear": return message("earclip_note_test_ear");
        case "accept-ear": return message("earclip_note_accept_ear");
        case "output-ear": return message("earclip_note_output_ear");
        case "output-last-triangle": return message("earclip_note_output_last_triangle");
        case "done-triangulated": return message("earclip_note_done_triangulated");
    }
};

const refusalMessage = (refusal: EarRefusal): Message => {
    switch (refusal) {
        case "fewer-than-three": return message("earclip_refusal_fewer_than_three");
        case "not-simple": return message("earclip_refusal_not_simple");
        case "collinear-vertices": return message("earclip_refusal_collinear");
        case "unsupported": return message("earclip_refusal_unsupported");
    }
};

export interface EarClippingNoteInput {
    refusal: EarRefusal | undefined;
    reversed: boolean;
    step: number;
    length: number;
    event: EarEventInfo | undefined;
    trianglesSoFar: number;
    /** Present only once the trace is done. */
    summary: EarSummary | undefined;
}

/**
 * The sentences the ear clipping readout shows, in reading order, as catalog messages: the one source of the Tools panel's text
 * (kept for the parity test) and of the declaration's notes (task 08). A refused polygon has only its refusal sentence.
 */
export function earClippingNotes(input: EarClippingNoteInput): {id: EarClippingNoteId; text: Message}[] {
    const {refusal, reversed, step, length, event, trianglesSoFar, summary} = input;
    const notes: {id: EarClippingNoteId; text: Message}[] = [];
    if (refusal) notes.push({id: "refusal", text: refusalMessage(refusal)});
    const traced = refusal === undefined && length > 0;
    if (traced && reversed) notes.push({id: "reversed", text: message("earclip_reversed_note")});
    if (!traced) return notes;
    notes.push({id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(length, 1)})});
    if (event) notes.push({id: "note", text: noteMessage(event.note)});
    if (event && event.points.length === 3 && event.kind === "test") {
        const [previous, apex, next] = event.points;
        const triangle = message("earclip_detail_triangle", {value0: previous + 1, value1: apex + 1, value2: next + 1});
        notes.push({id: "detail", text: typeof event.rejected === "number"
            ? message("earclip_detail_join", {value0: triangle, value1: message("earclip_detail_blocker", {value0: event.rejected + 1})})
            : triangle});
    }
    notes.push({id: "triangles", text: message("earclip_triangles_so_far", {value0: trianglesSoFar})});
    if (event) notes.push({id: "count", text: message("hulltrace_predicate_count", {value0: event.predicateCount})});
    if (summary) {
        notes.push({id: "result-triangles", text: message("earclip_result_triangles", {value0: summary.triangles, value1: summary.triangles + 2})});
        notes.push({id: "result-diagonals", text: message("earclip_result_diagonals", {value0: summary.diagonals})});
        notes.push({id: "result-classes", text: message("earclip_result_classes", {
            value0: summary.classSizes[0], value1: summary.classSizes[1], value2: summary.classSizes[2]})});
        notes.push({id: "result-guards", text: message("earclip_result_guards", {
            value0: summary.guardCount, value1: summary.guardVertices.map(v => `P${v + 1}`).join(", ")})});
    }
    return notes;
}
