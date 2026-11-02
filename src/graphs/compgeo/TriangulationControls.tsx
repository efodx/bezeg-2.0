import React from "react";
import {currentLanguage, useT} from "../../localization";
import type {TriangulationEvent, TriangulationReadout, TriangulationRefusal} from "./TriangulationGraph";

export interface TriangulationControlActions {
    selectEdge(a: number | undefined, b?: number): void;
    flip(): void;
}

export interface TriangulationEdgeChoice {
    a: number;
    b: number;
    interior: boolean;
}

export interface TriangulationControlsProps {
    readout: TriangulationReadout | undefined;
    refusal: TriangulationRefusal | undefined;
    event: TriangulationEvent | undefined;
    edges: readonly TriangulationEdgeChoice[];
    selected: readonly [number, number] | undefined;
    actions: TriangulationControlActions;
}

type Translate = ReturnType<typeof useT>;

/** Two decimals, with a decimal comma in Slovenian. Display only. */
function degrees(value: number): string {
    const text = value.toFixed(2);
    return currentLanguage() === "sl" ? text.replace(".", ",") : text;
}

export function refusalText(t: Translate, refusal: TriangulationRefusal): string {
    switch (refusal) {
        case "duplicate-point": return t("tri_refusal_duplicate");
        case "degenerate-points": return t("tri_refusal_degenerate");
        case "unsupported": return t("tri_refusal_unsupported");
    }
}

/** The sentence for the last action: an insertion case, a flip result or a flip refusal. */
export function eventText(t: Translate, event: TriangulationEvent): string {
    switch (event.kind) {
        case "inserted": {
            const p = event.point + 1;
            switch (event.change) {
                case "inside": return t("tri_event_inserted_inside", {value0: p, value1: event.added});
                case "interior-edge": return t("tri_event_inserted_interior_edge", {value0: p, value1: event.added});
                case "hull-edge": return t("tri_event_inserted_hull_edge", {value0: p, value1: event.added});
                case "outside": return t("tri_event_inserted_outside", {value0: p, value1: event.added});
            }
        }
        case "rebuilt": return t("tri_event_rebuilt");
        case "flipped":
            return t("tri_event_flipped", {value0: event.edge[0] + 1, value1: event.edge[1] + 1, value2: event.created[0] + 1, value3: event.created[1] + 1});
        case "flip-refused": {
            const names = {value0: event.edge[0] + 1, value1: event.edge[1] + 1};
            switch (event.reason) {
                case "hull-edge": return t("tri_event_refused_hull_edge", names);
                case "not-convex": return t("tri_event_refused_not_convex", names);
                case "no-such-edge": return t("tri_event_refused_no_edge", names);
            }
        }
        case "flip-needs-edge": return t("tri_event_needs_edge");
    }
}

/** The readouts, the edge list and the Flip button of the triangulation graph. The live region announces the last event; a refusal is announced by its own alert only. */
export function TriangulationControls(props: TriangulationControlsProps) {
    const t = useT();
    const {readout, refusal, event, edges, selected, actions} = props;
    const key = (a: number, b: number) => `${a}-${b}`;
    const eventSentence = event ? eventText(t, event) : "";
    const flipUnavailable = selected === undefined;
    return <>
        <div className="inspector-group" data-triangulation="edge-flip">
            <div className="inspector-playback" role="group" aria-label={t("tri_flip_group")}>
                <label htmlFor="triangulation-edge">{t("tri_edge_select")}</label>
                <select id="triangulation-edge" aria-describedby="triangulation-flip-hint" data-triangulation="edge-list" value={selected ? key(selected[0], selected[1]) : ""}
                        disabled={edges.length === 0}
                        onChange={change => {
                            const value = change.target.value;
                            const [a, b] = value.split("-").map(Number);
                            if (value === "") actions.selectEdge(undefined); else actions.selectEdge(a, b);
                        }}>
                    <option value="">{t("tri_edge_none")}</option>
                    {edges.map(e => <option key={key(e.a, e.b)} value={key(e.a, e.b)}>
                        {t(e.interior ? "tri_edge_option_interior" : "tri_edge_option_hull", {value0: e.a + 1, value1: e.b + 1})}
                    </option>)}
                </select>
                <button type="button" data-action="flip-edge" aria-describedby="triangulation-flip-hint" aria-disabled={flipUnavailable || undefined}
                        onClick={() => actions.flip()}>{t("tri_flip")}</button>
            </div>
            <p className="inspector-help" id="triangulation-flip-hint">{t("tri_flip_hint")}</p>
        </div>
        <div className="inspector-group" data-triangulation="status">
            {refusal && <p className="inspector-help" role="alert" data-triangulation="refusal">{refusalText(t, refusal)}</p>}
            {eventSentence && <p className="inspector-help" data-triangulation="event">{eventSentence}</p>}
            {readout && <ul aria-label={t("tri_readout_label")} data-triangulation="readout">
                <li data-readout="n">{t("tri_readout_points", {value0: readout.n})}</li>
                <li data-readout="k">{t("tri_readout_boundary", {value0: readout.boundary.k})}</li>
                {readout.boundary.collinear > 0 &&
                    <li data-readout="collinear">{t("tri_readout_collinear", {value0: readout.boundary.collinear})}</li>}
                <li data-readout="triangles">{t("tri_readout_triangles", {value0: readout.counts.triangles, value1: readout.n, value2: readout.boundary.k})}</li>
                <li data-readout="edges">{t("tri_readout_edges", {
                    value0: readout.counts.edges, value1: readout.n, value2: readout.boundary.k,
                    value3: readout.counts.interiorEdges, value4: readout.counts.hullEdges})}</li>
                {!readout.anglesHidden && <li data-readout="angle">{t("tri_readout_angle_now", {value0: degrees(readout.minAngle)})}</li>}
                {!readout.anglesHidden && <li data-readout="angle-before">{readout.minAngleBefore === undefined
                    ? t("tri_readout_angle_before_none")
                    : t("tri_readout_angle_before", {value0: degrees(readout.minAngleBefore)})}</li>}
            </ul>}
            <p className="visually-hidden" role="status" aria-live="polite" data-triangulation="live">
                {eventSentence}</p>
        </div>
    </>;
}
