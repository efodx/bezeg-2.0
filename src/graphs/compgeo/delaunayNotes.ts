import {message, messageNumber, type Message, type MessageNumber} from "../../localization";
import type {LawsonNote} from "../../compgeo/delaunay";
import type {DelaunayStatus} from "./DelaunayControls";
import type {TriangulationEvent, TriangulationReadout} from "./TriangulationGraph";

/** The ids of the sentences of the Delaunay readout (the trace, the angles, the selected triangle, the inherited triangulation counts). */
export type DelaunayNoteId =
    | "step" | "note" | "detail" | "incircle" | "flips" | "illegal" | "min-now" | "min-start" | "angles-now" | "angles-start"
    | "selected-triangle" | `neighbour-${number}` | "hull-edges" | "done" | "cocircular" | "event"
    | "n" | "k" | "collinear" | "triangles" | "edges" | "angle" | "angle-before";

/** How many angles are listed in full: the six angles of a four-point quadrilateral. */
const FULL_ANGLES = 6;

const noteMessage = (note: LawsonNote): Message => {
    switch (note) {
        case "phase-start": return message("del_note_phase_start");
        case "test-legal": return message("del_note_test_legal");
        case "test-illegal": return message("del_note_test_illegal");
        case "flip-edge": return message("del_note_flip");
        case "done-delaunay": return message("del_note_done");
    }
};

const signMessage = (sign: -1 | 0 | 1): Message => {
    switch (sign) {
        case 1: return message("del_sign_inside");
        case 0: return message("del_sign_on");
        case -1: return message("del_sign_outside");
    }
};

const circleSignMessage = (sign: -1 | 0 | 1): Message => {
    switch (sign) {
        case 1: return message("del_tri_sign_inside");
        case 0: return message("del_tri_sign_on");
        case -1: return message("del_tri_sign_outside");
    }
};

/** The corner numbers of a triangle in ascending order, so that its name does not depend on the stored rotation. */
const triple = (corners: readonly number[]) => {
    const [a, b, c] = [...corners].sort((x, y) => x - y);
    return {value0: a + 1, value1: b + 1, value2: c + 1};
};

/** The angles as "a; b; c" (a semicolon, as the panel lists them), joined by nested messages so a language switch reformats each number. */
function angleList(angles: readonly number[]): Message | MessageNumber {
    const [first, ...rest] = angles;
    const head = messageNumber(first, 2);
    return rest.length === 0 ? head : message("del_angle_join", {value0: head, value1: angleList(rest)});
}

const angleMessage = (angles: readonly number[], whole: "del_angles_now" | "del_angles_start"): Message => {
    if (angles.length <= FULL_ANGLES) return message(whole, {value0: angleList(angles)});
    return message("del_angles_truncated", {value0: FULL_ANGLES, value1: angles.length, value2: angleList(angles.slice(0, FULL_ANGLES))});
};

/** The sentence of the last point-set event; a refused flip is shown by the refusal region instead, so it has none here. */
function eventMessage(event: TriangulationEvent): Message | undefined {
    switch (event.kind) {
        case "inserted": {
            const names = {value0: event.point + 1, value1: event.added};
            switch (event.change) {
                case "inside": return message("tri_event_inserted_inside", names);
                case "interior-edge": return message("tri_event_inserted_interior_edge", names);
                case "hull-edge": return message("tri_event_inserted_hull_edge", names);
                case "outside": return message("tri_event_inserted_outside", names);
            }
        }
        case "rebuilt": return message("tri_event_rebuilt");
        case "flipped":
            return message("tri_event_flipped", {value0: event.edge[0] + 1, value1: event.edge[1] + 1, value2: event.created[0] + 1, value3: event.created[1] + 1});
        case "flip-refused":
        case "flip-needs-edge": return undefined;
    }
}

export interface DelaunayNoteInput {
    status: DelaunayStatus | undefined;
    event: TriangulationEvent | undefined;
    readout: TriangulationReadout | undefined;
    /** False while the triangulation overlay is hidden: the counts and angles of the triangulation are then not given away. */
    triangulationShown: boolean;
}

/**
 * The sentences the Delaunay readout shows, in reading order, as catalog messages: the Lawson trace (step, note, tested edge,
 * incircle value, the six angle rows, the selected triangle and its neighbours, the result), then the last event and the
 * inherited triangulation counts. The one source of the declaration's notes (task 08); the Tools panel renders the same
 * sentences from `DelaunayControls` and `TriangulationControls` (the parity test compares the two).
 */
export function delaunayNotes(input: DelaunayNoteInput): {id: DelaunayNoteId; text: Message}[] {
    const {status, event, readout, triangulationShown} = input;
    const notes: {id: DelaunayNoteId; text: Message}[] = [];
    if (status) {
        notes.push({id: "step", text: message("step_counter", {value0: status.step + 1, value1: Math.max(status.length, 1)})});
        notes.push({id: "note", text: noteMessage(status.note)});
        if (status.test) {
            notes.push({id: "detail", text: message("del_detail_edge", {
                value0: status.test.edge[0] + 1, value1: status.test.edge[1] + 1, value2: status.test.apexes[0] + 1, value3: status.test.apexes[1] + 1,
            })});
            notes.push({id: "incircle", text: message("del_incircle_value", {value0: status.test.value, value1: signMessage(status.test.sign)})});
        }
        notes.push({id: "flips", text: message("del_flips", {value0: status.flips})});
        notes.push({id: "illegal", text: message("del_illegal_count", {value0: status.illegalCount})});
        notes.push({id: "min-now", text: message("del_min_now", {value0: messageNumber(status.minNow, 2)})});
        notes.push({id: "min-start", text: message("del_min_start", {value0: messageNumber(status.minStart, 2)})});
        notes.push({id: "angles-now", text: angleMessage(status.anglesNow, "del_angles_now")});
        notes.push({id: "angles-start", text: angleMessage(status.anglesStart, "del_angles_start")});
        const selection = status.selection;
        if (selection) {
            notes.push({id: "selected-triangle", text: message("del_tri_selected", triple(selection.corners))});
            selection.neighbours.forEach((n, index) => notes.push({id: `neighbour-${index}`, text: message("del_tri_neighbour", {
                value0: n.edge[0] + 1, value1: n.edge[1] + 1, value2: n.vertex + 1, value3: n.value, value4: circleSignMessage(n.sign),
            })}));
            if (selection.hullCount > 0) notes.push({id: "hull-edges", text: message("del_tri_hull", {value0: selection.hullCount})});
        }
        if (status.done) {
            notes.push({id: "done", text: message("del_result_done")});
            if (status.done.cocircular) notes.push({id: "cocircular", text: message("del_result_cocircular")});
        }
    }
    const eventText = event ? eventMessage(event) : undefined;
    if (eventText) notes.push({id: "event", text: eventText});
    if (readout) {
        notes.push({id: "n", text: message("tri_readout_points", {value0: readout.n})});
        notes.push({id: "k", text: message("tri_readout_boundary", {value0: readout.boundary.k})});
        if (readout.boundary.collinear > 0) notes.push({id: "collinear", text: message("tri_readout_collinear", {value0: readout.boundary.collinear})});
        if (triangulationShown) {
            notes.push({id: "triangles", text: message("tri_readout_triangles", {value0: readout.counts.triangles, value1: readout.n, value2: readout.boundary.k})});
            notes.push({id: "edges", text: message("tri_readout_edges", {
                value0: readout.counts.edges, value1: readout.n, value2: readout.boundary.k,
                value3: readout.counts.interiorEdges, value4: readout.counts.hullEdges,
            })});
            notes.push({id: "angle", text: message("tri_readout_angle_now", {value0: messageNumber(readout.minAngle, 2)})});
            notes.push({id: "angle-before", text: readout.minAngleBefore === undefined
                ? message("tri_readout_angle_before_none")
                : message("tri_readout_angle_before", {value0: messageNumber(readout.minAngleBefore, 2)})});
        }
    }
    return notes;
}
