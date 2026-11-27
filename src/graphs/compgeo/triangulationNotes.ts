import {message, messageNumber, type Message} from "../../localization";
import type {TriangulationEvent, TriangulationReadout} from "./TriangulationGraph";

/** The ids of the sentences of the triangulation readout: the last event and the counts. */
export type TriangulationNoteId = "event" | "n" | "k" | "collinear" | "triangles" | "edges" | "angle" | "angle-before";

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

/**
 * The sentences of the triangulation panel as catalog messages (the last event, then the counts), the source of the declared
 * notes of the point-set triangulation graph and, after the Lawson trace, of the Delaunay graph's (task 08).
 * `triangulationShown` false: only n and k, so a hidden triangulation is not given away.
 */
export function triangulationNotes(event: TriangulationEvent | undefined, readout: TriangulationReadout | undefined, triangulationShown: boolean): {id: TriangulationNoteId; text: Message}[] {
    const notes: {id: TriangulationNoteId; text: Message}[] = [];
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
