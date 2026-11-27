import {message, type Message} from "../../localization";
import type {VoronoiStatus} from "./VoronoiControls";

/** The ids of the sentences of the Voronoi readout, in reading order; `vertex-k` is the k-th vertex of the diagram. */
export type VoronoiNoteId =
    "mode-refused" | "refusal" | "collinear" | "four-fixed" | "wrong-count" | "incircle" | "four-vertices" | `diagonal-${number}` | "verdict" | "construction" | "sites" | "vertices" | "edges" | "rays" | "lines" | "bounded" | "unbounded"
    | `vertex-${number}` | "query-at" | "query-nearest" | "selected-vertex";

const sorted = (corners: readonly number[]) => [...corners].sort((a, b) => a - b);
/** "P1, P3, P6" as a plain list. */
export const siteList = (sites: readonly number[]) => sites.map(s => `P${s + 1}`).join(", ");
const triple = (corners: readonly number[]) => {
    const [a, b, c] = sorted(corners);
    return {value0: a + 1, value1: b + 1, value2: c + 1};
};

/** The selected triangle's circumcentre as a Voronoi vertex. */
export function voronoiVertexMessage(vertex: VoronoiStatus["selectedVertex"]): Message | undefined {
    return vertex
        ? message("vor_tri_vertex", {...triple(vertex.corners), value3: vertex.x, value4: vertex.y, value5: siteList(vertex.sites)})
        : undefined;
}

/** The refusal of the diagram as one actionable sentence. */
export function voronoiRefusalMessage(status: VoronoiStatus): Message | undefined {
    const refusal = status.refusal;
    if (!refusal) return undefined;
    return refusal.kind === "few" ? message("vor_refused_few") : message("vor_refused_duplicate", {value0: refusal.sites[0] + 1, value1: refusal.sites[1] + 1});
}

/** The line about the cell construction of the chosen site. */
export function voronoiConstructionMessage(status: VoronoiStatus): Message {
    const {construction} = status;
    return !construction || status.cellSite === null ? message("vor_construct_none")
        : construction.count === 0 ? message("vor_construct_start", {value0: status.cellSite + 1, value1: construction.total})
        : construction.done ? message("vor_construct_done", {value0: status.cellSite + 1, value1: construction.count})
        : message("vor_construct_step", {value0: construction.count, value1: construction.total, value2: status.cellSite + 1, value3: (construction.other ?? 0) + 1});
}

/** The nearest site(s) of the query point, or undefined while the diagram is refused. */
export function voronoiNearestMessage(status: VoronoiStatus): Message | undefined {
    if (status.refusal) return undefined;
    const nearest = status.query.nearest;
    return nearest.length === 1 ? message("vor_query_nearest", {value0: nearest[0] + 1}) : message("vor_query_tie", {value0: siteList(nearest)});
}

/** The sentences of the four-point readout; undefined while there is nothing to read (not four distinct sites). */
export function voronoiFourPointMessages(status: VoronoiStatus) {
    const f = status.fourPoint;
    if (!f) return undefined;
    const circle = f.circle;
    const triple3 = circle ? `P${circle.a + 1}, P${circle.b + 1}, P${circle.c + 1}` : "";
    const fourth = circle ? `P${circle.d + 1}` : "";
    const values = {value0: f.determinant ?? "", value1: triple3, value2: fourth};
    const incircle = !circle || f.sign === undefined ? message("deg_no_circle")
        : f.sign === "inside" ? message("deg_incircle_inside", values)
        : f.sign === "on" ? message("deg_incircle_on", values)
        : message("deg_incircle_outside", values);
    const vertices = f.degrees.length > 0 ? message("deg_vertices", {value0: f.degrees.length, value1: f.degrees.join(", ")}) : message("deg_vertices_none");
    const diagonals = (f.diagonals ?? []).map(d => {
        const names = {value0: d.from + 1, value1: d.to + 1};
        return {key: `${d.from}-${d.to}`, text: d.legal ? message("deg_diagonal_legal", names) : message("deg_diagonal_illegal", names)};
    });
    const legal = (f.diagonals ?? []).filter(d => d.legal);
    const verdict = !f.diagonals ? message("deg_not_convex")
        : legal.length === 2 ? message("deg_not_unique")
        : legal.length === 1 ? message("deg_unique", {value0: legal[0].from + 1, value1: legal[0].to + 1})
        : undefined;
    return {incircle, vertices, diagonals, verdict};
}

/**
 * The sentences the Voronoi readout shows, in reading order, as catalog messages: the one source of the Orodja
 * panel's text and of the declaration's notes (task 08). The degenerate-sites graph adds its mode refusal and the four-point sentences.
 * A refused set has its refusal, the construction line and the query point; the diagram's counts appear while the diagram is shown.
 */
export function voronoiNotes(status: VoronoiStatus): {id: VoronoiNoteId; text: Message}[] {
    const notes: {id: VoronoiNoteId; text: Message}[] = [];
    const refusal = voronoiRefusalMessage(status);
    if (status.modeSwitch && status.modeRefused) notes.push({id: "mode-refused", text: message("deg_mode_needs_four", {value0: status.counts.sites})});
    if (refusal) notes.push({id: "refusal", text: refusal});
    else if (status.collinear) notes.push({id: "collinear", text: message("vor_collinear_note")});
    if (status.mode === "four-point") {
        notes.push({id: "four-fixed", text: message("deg_four_fixed")});
        if (status.counts.sites !== 4) notes.push({id: "wrong-count", text: message("deg_wrong_count", {value0: status.counts.sites})});
    }
    const four = voronoiFourPointMessages(status);
    if (four) {
        notes.push({id: "incircle", text: four.incircle}, {id: "four-vertices", text: four.vertices});
        four.diagonals.forEach((d, index) => notes.push({id: `diagonal-${index}`, text: d.text}));
        if (four.verdict) notes.push({id: "verdict", text: four.verdict});
    }
    if (!refusal) notes.push({id: "construction", text: voronoiConstructionMessage(status)});
    const {counts} = status;
    if (!refusal && status.diagramShown) {
        notes.push({id: "sites", text: message("vor_count_sites", {value0: counts.sites})});
        notes.push({id: "vertices", text: message("vor_count_vertices", {value0: counts.vertices})});
        notes.push({id: "edges", text: message("vor_count_edges", {value0: counts.finite})});
        notes.push({id: "rays", text: message("vor_count_rays", {value0: counts.rays})});
        if (counts.lines > 0) notes.push({id: "lines", text: message("vor_count_lines", {value0: counts.lines})});
        notes.push({id: "bounded", text: message("vor_count_bounded", {value0: counts.bounded})});
        notes.push({id: "unbounded", text: message("vor_count_unbounded", {value0: counts.unbounded})});
        status.vertices.forEach((vertex, index) => notes.push({
            id: `vertex-${index}`,
            text: message("vor_vertex_item", {value0: index + 1, value1: vertex.x, value2: vertex.y, value3: siteList(vertex.sites)}),
        }));
    }
    // The query sentence is shown even while the diagram is refused (the panel always printed it); the nearest site only with a diagram.
    notes.push({id: "query-at", text: message("vor_query_at", {value0: status.query.x, value1: status.query.y})});
    const nearest = voronoiNearestMessage(status);
    if (nearest) notes.push({id: "query-nearest", text: nearest});
    const vertex = status.overlayShown && status.triangles.length > 0 ? voronoiVertexMessage(status.selectedVertex) : undefined;
    if (vertex) notes.push({id: "selected-vertex", text: vertex});
    return notes;
}
