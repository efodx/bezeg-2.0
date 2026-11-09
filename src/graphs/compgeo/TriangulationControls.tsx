import React from "react";
import {formatDegrees} from "../../analysis/format";
import {useMemo} from "react";
import {useLanguage, useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {RefusalChannel, RefusalNotice} from "../../inputs/RefusalChannel";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutList} from "../base/controls/ReadoutParts";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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
    /** False while the triangulation overlay is hidden: the panel then shows only n and k, so a hidden triangulation is not given away by its counts or edge list. */
    triangulationShown: boolean;
    actions: TriangulationControlActions;
}

type Translate = ReturnType<typeof useT>;

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
    const {language} = useLanguage();
    const {readout, refusal, event, edges, selected, triangulationShown, actions} = props;
    const key = (a: number, b: number) => `${a}-${b}`;
    const eventSentence = event ? eventText(t, event) : "";
    const flipUnavailable = selected === undefined;
    // A refusal (an invalid point set, or a refused flip) is shown alone in the shared refusal region; the live region carries the other events.
    const refusalSentence = refusal ? refusalText(t, refusal)
        : event?.kind === "flip-refused" || event?.kind === "flip-needs-edge" ? eventSentence : undefined;
    const channel = useMemo(() => {
        const next = new RefusalChannel();
        if (refusalSentence) next.refuse(refusalSentence, true);
        return next;
    }, [refusalSentence]);
    // The one announcement: the last event, except a refusal (its own alert announces it). No Play here, so never muted.
    const liveReadout = useStatusReadout(refusalSentence === eventSentence ? "" : eventSentence, true);
    return <>
        {triangulationShown && <div className="inspector-group" data-triangulation="edge-flip">
            <div className="inspector-playback" role="group" aria-label={t("tri_flip_group")}>
                {/* No edges: the list offers only "none" and says why (the shared select's unavailable reason). */}
                <ChoiceSelect label={t("tri_edge_select")} value={selected ? key(selected[0], selected[1]) : ""}
                              reason={edges.length === 0 ? t("tri_edges_unavailable") : undefined}
                              options={[{value: "", text: t("tri_edge_none")}, ...edges.map(e => ({
                                  value: key(e.a, e.b),
                                  text: t(e.interior ? "tri_edge_option_interior" : "tri_edge_option_hull", {value0: e.a + 1, value1: e.b + 1}),
                              }))]}
                              onChange={value => {
                                  const [a, b] = value.split("-").map(Number);
                                  if (value === "") actions.selectEdge(undefined); else actions.selectEdge(a, b);
                              }}/>
                <UnavailableButton data-action="flip-edge" aria-describedby="triangulation-flip-hint" reason={flipUnavailable ? t("tri_event_needs_edge") : undefined}
                                   onPress={() => actions.flip()} onBlockedPress={() => actions.flip()}>{t("tri_flip")}</UnavailableButton>
            </div>
            <p className="inspector-help" id="triangulation-flip-hint">{t("tri_flip_hint")}</p>
        </div>}
        <div className="inspector-group" data-triangulation="status">
            <div data-triangulation="refusal-slot"><RefusalNotice channel={channel}/></div>
            {eventSentence && refusalSentence !== eventSentence && <p className="inspector-help" data-triangulation="event">{eventSentence}</p>}
            {readout && <ReadoutList label={t("tri_readout_label")} hooks={{"data-triangulation": "readout"}} rows={[
                {id: "n", value: t("tri_readout_points", {value0: readout.n})},
                {id: "k", value: t("tri_readout_boundary", {value0: readout.boundary.k})},
                ...(readout.boundary.collinear > 0 ? [{id: "collinear", value: t("tri_readout_collinear", {value0: readout.boundary.collinear})}] : []),
                ...(triangulationShown ? [
                    {id: "triangles", value: t("tri_readout_triangles", {value0: readout.counts.triangles, value1: readout.n, value2: readout.boundary.k})},
                    {id: "edges", value: t("tri_readout_edges", {
                        value0: readout.counts.edges, value1: readout.n, value2: readout.boundary.k,
                        value3: readout.counts.interiorEdges, value4: readout.counts.hullEdges})},
                    {id: "angle", value: t("tri_readout_angle_now", {value0: formatDegrees(readout.minAngle, language)})},
                    {id: "angle-before", value: readout.minAngleBefore === undefined
                        ? t("tri_readout_angle_before_none")
                        : t("tri_readout_angle_before", {value0: formatDegrees(readout.minAngleBefore, language)})},
                ] : []),
            ]}/>}
            <LiveReadout readout={liveReadout} dataAttribute="triangulation-live"/>
        </div>
    </>;
}
