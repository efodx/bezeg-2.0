import {message, type Message} from "../../localization";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_POLYGON_VERTICES} from "../../compgeo/sweep/limits";
import type {VertexType} from "../../compgeo/sweep/monotonePartition";
import {edgeName, type PartitionEventInfo, type PartitionRun, vertexName} from "./monotonePartitionRun";

/** The ids of the sentences of the monotone partition readout, in reading order. */
export type MonotonePartitionNoteId =
    | "refusal" | "reversed" | "step" | "note" | "vertex" | "reason" | "diagonals" | "summary" | "type-counts" | "balance";

/** The adjective of a vertex type ("razcepno", for "oglišče"). */
export function vertexTypeMessage(type: VertexType): Message {
    switch (type) {
        case "start": return message("monotonepartition_type_start");
        case "end": return message("monotonepartition_type_end");
        case "split": return message("monotonepartition_type_split");
        case "merge": return message("monotonepartition_type_merge");
        case "regular": return message("monotonepartition_type_regular");
    }
}

/** The reason of a type: where the two neighbours lie and how large the interior angle is. */
export function reasonMessage(type: VertexType): Message {
    switch (type) {
        case "start": return message("monotonepartition_reason_start");
        case "end": return message("monotonepartition_reason_end");
        case "split": return message("monotonepartition_reason_split");
        case "merge": return message("monotonepartition_reason_merge");
        case "regular": return message("monotonepartition_reason_regular");
    }
}

/** The refusal of the kernel as one actionable sentence. */
export function partitionRefusalMessage(run: PartitionRun): Message | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    const vertex = refusal.index === undefined ? "" : vertexName(refusal.index);
    switch (refusal.reason) {
        case "fewer-than-three": return message("monotonepartition_refused_fewer_than_three");
        case "too-many": return message("monotonepartition_refused_too_many", {value0: SWEEP_MAX_POLYGON_VERTICES});
        case "not-grid":
        case "not-a-point": return message("monotonepartition_refused_not_grid", {value0: vertex});
        case "out-of-range": return message("monotonepartition_refused_out_of_range", {value0: vertex, value1: SWEEP_COORD_LIMIT});
        case "not-simple": {
            const [a, b] = refusal.edges ?? [0, 0];
            return message("monotonepartition_refused_not_simple", {value0: edgeName(a), value1: edgeName(b)});
        }
        case "collinear-vertices": return message("monotonepartition_refused_collinear", {value0: vertex});
    }
}

/** What the event of this step did. */
export function partitionEventMessage(event: PartitionEventInfo, run: PartitionRun, type: VertexType | null): Message {
    switch (event.note) {
        case "phase": return message("monotonepartition_note_phase");
        case "pop": return message("monotonepartition_note_pop", {value0: vertexName(event.vertex ?? 0), value1: type ? vertexTypeMessage(type) : ""});
        case "insert": return message("monotonepartition_note_insert", {value0: edgeName(event.edge ?? 0), value1: event.statusSize ?? 0});
        case "remove": return message("monotonepartition_note_remove", {value0: edgeName(event.edge ?? 0), value1: event.statusSize ?? 0});
        case "diagonal": {
            const [a, b] = event.diagonal ?? [0, 0];
            return message("monotonepartition_note_diagonal", {value0: vertexName(a), value1: vertexName(b)});
        }
        case "done": return message("monotonepartition_note_done", {value0: run.pieces.length});
    }
}

/**
 * The sentences the monotone partition readout shows, in reading order, as catalog messages: the one source of the Orodja
 * panel's text (kept for the parity test) and of the declaration's notes (task 08). A refused polygon has only its refusal.
 */
export function monotonePartitionNotes(run: PartitionRun, step: number): {id: MonotonePartitionNoteId; text: Message}[] {
    const refusal = partitionRefusalMessage(run);
    if (refusal) return [{id: "refusal", text: refusal}];
    if (run.length === 0) return [];
    const view = run.view(step);
    const event = run.event(step);
    const notes: {id: MonotonePartitionNoteId; text: Message}[] = [];
    if (run.reversed) notes.push({id: "reversed", text: message("monotonepartition_reversed_note")});
    notes.push({id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(run.length, 1)})});
    if (event) notes.push({id: "note", text: partitionEventMessage(event, run, view.type)});
    if (view.vertex !== null && view.type !== null) {
        notes.push({id: "vertex", text: message("monotonepartition_vertex", {value0: vertexName(view.vertex), value1: vertexTypeMessage(view.type)})});
        notes.push({id: "reason", text: reasonMessage(view.type)});
    }
    notes.push({id: "diagonals", text: view.diagonals.length > 0
        ? message("monotonepartition_diagonals", {value0: view.diagonals.length, value1: view.diagonals.map(([a, b]) => `${vertexName(a)}–${vertexName(b)}`).join(", ")})
        : message("monotonepartition_diagonals_none")});
    if (view.done) {
        const counts = run.typeCounts;
        notes.push({id: "summary", text: message("monotonepartition_summary", {value0: run.pieces.length, value1: run.diagonals.length})});
        notes.push({id: "type-counts", text: message("monotonepartition_type_counts", {
            value0: counts.start, value1: counts.end, value2: counts.split, value3: counts.merge, value4: counts.regular,
        })});
        notes.push({id: "balance", text: message("monotonepartition_balance", {
            value0: counts.start, value1: counts.split, value2: counts.start + counts.split,
            value3: counts.end, value4: counts.merge, value5: counts.end + counts.merge,
        })});
    }
    return notes;
}
