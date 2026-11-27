import {message, type Message} from "../../localization";
import type {Chain} from "../../compgeo/sweep/monotoneTriangulation";
import {partitionEventMessage, partitionRefusalMessage, reasonMessage, vertexTypeMessage} from "./monotonePartitionNotes";
import {vertexName} from "./monotonePartitionRun";
import type {TriangulationEventInfo, TriangulationRun} from "./monotoneTriangulationRun";

/** The ids of the sentences of the monotone triangulation readout, in reading order. */
export type MonotoneTriangulationNoteId =
    | "refusal" | "reversed" | "step" | "phase" | "note" | "vertex" | "reason" | "diagonals" | "already-monotone" | "piece" | "chain-vertex" | "test"
    | "triangle-diagonals" | "triangles" | "comparison-monotone" | "comparison-ear" | "comparison-growth" | "comparison-note";

/** The text of a chain: "left chain", "right chain", "top vertex", "bottom vertex". */
export function chainMessage(chain: Chain): Message {
    switch (chain) {
        case "top": return message("monotonetri_chain_top");
        case "left": return message("monotonetri_chain_left");
        case "right": return message("monotonetri_chain_right");
        case "bottom": return message("monotonetri_chain_bottom");
    }
}

function testOutcomeMessage(outcome: "visible" | "blocked"): Message {
    return outcome === "visible" ? message("monotonetri_test_inside") : message("monotonetri_test_outside");
}

/** What the event of a triangulation step did. */
function triangulationEventMessage(event: TriangulationEventInfo, run: TriangulationRun): Message {
    switch (event.note) {
        case "pop": return message("monotonetri_note_pop", {value0: vertexName(event.vertex ?? 0), value1: chainMessage(event.chain ?? "left")});
        case "push": return message("monotonetri_note_push", {value0: vertexName(event.vertex ?? 0), value1: event.stackSize ?? 0});
        case "unstack": return message("monotonetri_note_unstack", {value0: vertexName(event.vertex ?? 0), value1: event.stackSize ?? 0});
        case "test": {
            const a = vertexName(event.test?.a ?? 0);
            const b = vertexName(event.test?.b ?? 0);
            return event.test?.outcome === "blocked"
                ? message("monotonetri_note_blocked", {value0: a, value1: b})
                : message("monotonetri_note_visible", {value0: a, value1: b});
        }
        case "diagonal": {
            const [a, b] = event.diagonal ?? [0, 0];
            return message("monotonepartition_note_diagonal", {value0: vertexName(a), value1: vertexName(b)});
        }
        case "done": return message("monotonetri_note_done", {value0: run.triangles.length});
    }
}

const diagonalList = (diagonals: readonly (readonly [number, number])[]) => diagonals.map(([a, b]) => `${vertexName(a)}–${vertexName(b)}`).join(", ");
const diagonalsMessage = (diagonals: readonly (readonly [number, number])[]): Message => diagonals.length > 0
    ? message("monotonepartition_diagonals", {value0: diagonals.length, value1: diagonalList(diagonals)})
    : message("monotonepartition_diagonals_none");

/**
 * The sentences the monotone triangulation readout shows, in reading order, as catalog messages: the one source of the Orodja
 * panel's text and of the declaration's notes (task 08). A refused polygon has only its refusal.
 */
export function monotoneTriangulationNotes(run: TriangulationRun, step: number): {id: MonotoneTriangulationNoteId; text: Message}[] {
    const refusal = partitionRefusalMessage(run);
    if (refusal) return [{id: "refusal", text: refusal}];
    if (run.length === 0) return [];
    const notes: {id: MonotoneTriangulationNoteId; text: Message}[] = [];
    const piece = run.pieceAt(step);
    const tri = piece === null ? undefined : run.triangulationView(step);
    const triEvent = piece === null ? undefined : run.triangulationEvent(step);
    const partitionView = run.view(step);
    const partitionEvent = run.event(step);
    if (run.reversed) notes.push({id: "reversed", text: message("monotonepartition_reversed_note")});
    notes.push({id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(run.length, 1)})});
    notes.push({id: "phase", text: piece === null
        ? message("monotonetri_phase_partition")
        : message("monotonetri_phase_triangulation", {value0: piece + 1, value1: run.pieceCount})});
    if (tri && triEvent) notes.push({id: "note", text: triangulationEventMessage(triEvent, run)});
    else if (partitionEvent) notes.push({id: "note", text: partitionEventMessage(partitionEvent, run, partitionView.type)});
    if (piece === null && partitionView.vertex !== null && partitionView.type !== null) {
        notes.push({id: "vertex", text: message("monotonepartition_vertex", {value0: vertexName(partitionView.vertex), value1: vertexTypeMessage(partitionView.type)})});
        notes.push({id: "reason", text: reasonMessage(partitionView.type)});
    }
    if (piece === null) notes.push({id: "diagonals", text: diagonalsMessage(partitionView.diagonals)});
    if (run.alreadyMonotone && step >= run.boundary) notes.push({id: "already-monotone", text: message("monotonetri_already_monotone")});
    if (tri && piece !== null) {
        notes.push({id: "piece", text: message("monotonetri_piece_info", {value0: piece + 1, value1: run.pieceSize(piece), value2: run.pieceSize(piece) - 2})});
        if (tri.vertex !== null && tri.chain !== null) {
            notes.push({id: "chain-vertex", text: message("monotonetri_vertex_item", {value0: vertexName(tri.vertex), value1: chainMessage(tri.chain)})});
        }
        if (tri.test) {
            notes.push({id: "test", text: message("monotonetri_test_readout", {
                value0: vertexName(tri.test.a), value1: vertexName(tri.test.b), value2: testOutcomeMessage(tri.test.outcome),
            })});
        }
        notes.push({id: "triangle-diagonals", text: diagonalsMessage([...tri.earlierDiagonals, ...tri.diagonals])});
        notes.push({id: "triangles", text: tri.done
            ? message("monotonetri_triangles_total", {value0: run.triangles.length, value1: run.vertices.length})
            : message("monotonetri_triangles_so_far", {value0: tri.triangles.length})});
        if (tri.done && run.counts) {
            notes.push({id: "comparison-monotone", text: message("monotonetri_comparison_monotone", {value0: run.counts.monotone})});
            notes.push({id: "comparison-ear", text: message("monotonetri_comparison_ear", {value0: run.counts.earClipping})});
            notes.push({id: "comparison-growth", text: message("monotonetri_comparison_growth")});
            notes.push({id: "comparison-note", text: message("monotonetri_comparison_note")});
        }
    }
    return notes;
}
