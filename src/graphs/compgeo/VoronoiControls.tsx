import React, {useState} from "react";
import {useT} from "../../localization";

export interface VoronoiControlActions {
    /** Restores the B4 example, the overlay off, no selection (C2). */
    resetExample(): void;
    /** Restores the box of the drawing's `frame`. */
    resetView(): void;
    /** Chooses the site whose cell is constructed, or null for none; the construction count returns to 0. */
    selectSite(site: number | null): void;
    constructNext(): void;
    constructBack(): void;
    constructReset(): void;
    /** Sets the query point from typed text; false when the text is not a number in range. */
    setQuery(x: string, y: string): boolean;
    /** Moves the query point by a step in grid units. */
    moveQuery(dx: number, dy: number): void;
    selectTriangle(index: number | undefined): void;
}

/** Everything the panel shows; all numbers are already computed, rationals as exact text. 0-based site indices. */
export interface VoronoiStatus {
    /** Why no diagram is drawn, if so. */
    refusal?: {kind: "few"} | {kind: "duplicate"; sites: readonly [number, number]};
    collinear: boolean;
    counts: {sites: number; vertices: number; finite: number; rays: number; lines: number; bounded: number; unbounded: number};
    vertices: readonly {x: string; y: string; sites: readonly number[]}[];
    cellSite: number | null;
    construction?: {count: number; total: number; other?: number; done: boolean};
    query: {x: string; y: string; nearest: readonly number[]};
    coordinateLimit: number;
    overlayShown: boolean;
    triangles: readonly (readonly [number, number, number])[];
    selectedTriangle?: number;
    selectedVertex?: {corners: readonly [number, number, number]; x: string; y: string; sites: readonly number[]};
}

export interface VoronoiControlsProps {
    status: VoronoiStatus;
    actions: VoronoiControlActions;
}

const sorted = (corners: readonly number[]) => [...corners].sort((a, b) => a - b);
/** "P1, P3 and P6" as a plain list: "P1, P3, P6". */
const siteList = (sites: readonly number[]) => sites.map(s => `P${s + 1}`).join(", ");
const triple = (corners: readonly number[]) => {
    const [a, b, c] = sorted(corners);
    return {value0: a + 1, value1: b + 1, value2: c + 1};
};

/** Typed query coordinates; a valid pair commits when the button is pressed or Enter is typed. */
function QueryFields(props: {x: string; y: string; limit: number; onSet: (x: string, y: string) => boolean}) {
    const t = useT();
    const [draft, setDraft] = useState<{x: string; y: string; from: string}>({x: props.x, y: props.y, from: `${props.x}|${props.y}`});
    const from = `${props.x}|${props.y}`;
    // A new position from the graph (drag, arrows, Reset) replaces the draft; adjusted during render, not in an effect.
    if (draft.from !== from) setDraft({x: props.x, y: props.y, from});
    const [invalid, setInvalid] = useState(false);
    const commit = () => setInvalid(!props.onSet(draft.x, draft.y));
    const key = (event: React.KeyboardEvent) => { if (event.key === "Enter") commit(); };
    return <>
        <label>{t("vor_query_x")} <input type="text" inputMode="text" data-voronoi="query-x" value={draft.x}
                                       aria-invalid={invalid} onKeyDown={key} onChange={e => setDraft({...draft, x: e.target.value})}/></label>
        <label>{t("vor_query_y")} <input type="text" inputMode="text" data-voronoi="query-y" value={draft.y}
                                       aria-invalid={invalid} onKeyDown={key} onChange={e => setDraft({...draft, y: e.target.value})}/></label>
        <button type="button" data-action="query-set" onClick={commit}>{t("vor_query_set")}</button>
        {invalid && <p className="inspector-help" role="alert" data-voronoi="query-invalid">{t("vor_query_invalid", {value0: props.limit})}</p>}
    </>;
}

/** The readouts, the cell construction, the query point and the duality triangle list of the Voronoi graph. */
export function VoronoiControls(props: VoronoiControlsProps) {
    const t = useT();
    const {status, actions} = props;
    const {counts, construction} = status;
    const refusal = status.refusal;
    const refusalText = refusal
        ? refusal.kind === "few" ? t("vor_refused_few") : t("vor_refused_duplicate", {value0: refusal.sites[0] + 1, value1: refusal.sites[1] + 1})
        : undefined;
    const nearest = status.query.nearest;
    const queryText = refusal ? undefined : nearest.length === 1
        ? t("vor_query_nearest", {value0: nearest[0] + 1})
        : t("vor_query_tie", {value0: siteList(nearest)});
    const selectedVertex = status.selectedVertex;
    const vertexText = selectedVertex
        ? t("vor_tri_vertex", {...triple(selectedVertex.corners), value3: selectedVertex.x, value4: selectedVertex.y, value5: siteList(selectedVertex.sites)})
        : undefined;
    const stepText = !construction || status.cellSite === null ? t("vor_construct_none")
        : construction.count === 0 ? t("vor_construct_start", {value0: status.cellSite + 1, value1: construction.total})
        : construction.done ? t("vor_construct_done", {value0: status.cellSite + 1, value1: construction.count})
        : t("vor_construct_step", {value0: construction.count, value1: construction.total, value2: status.cellSite + 1, value3: (construction.other ?? 0) + 1});
    const overlayText = status.overlayShown ? t("vor_overlay_on") : t("vor_overlay_off");
    const nextUnavailable = !construction || construction.count >= construction.total;
    const backUnavailable = !construction || construction.count <= 0;
    return <>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("vor_view_group")}>
                <button type="button" data-action="reset-example" onClick={actions.resetExample}>{t("vor_example_reset")}</button>
                <button type="button" data-action="reset-view" onClick={actions.resetView}>{t("vor_view_reset")}</button>
            </div>
        </div>
        <div className="inspector-group" data-voronoi-status="">
            {refusalText && <p className="inspector-help" role="alert" data-voronoi="refusal">{refusalText}</p>}
            {status.collinear && !refusal && <p className="inspector-help" data-voronoi="collinear">{t("vor_collinear_note")}</p>}
            {!refusal && <ul aria-label={t("vor_readout_label")} data-voronoi="readout">
                <li data-readout="sites">{t("vor_count_sites", {value0: counts.sites})}</li>
                <li data-readout="vertices">{t("vor_count_vertices", {value0: counts.vertices})}</li>
                <li data-readout="edges">{t("vor_count_edges", {value0: counts.finite})}</li>
                <li data-readout="rays">{t("vor_count_rays", {value0: counts.rays})}</li>
                {counts.lines > 0 && <li data-readout="lines">{t("vor_count_lines", {value0: counts.lines})}</li>}
                <li data-readout="bounded">{t("vor_count_bounded", {value0: counts.bounded})}</li>
                <li data-readout="unbounded">{t("vor_count_unbounded", {value0: counts.unbounded})}</li>
            </ul>}
            {!refusal && status.vertices.length > 0 && <ul aria-label={t("vor_vertices_label")} data-voronoi="vertices">
                {status.vertices.map((vertex, index) => (
                    <li key={index} data-vertex={index}>{t("vor_vertex_item", {value0: index + 1, value1: vertex.x, value2: vertex.y, value3: siteList(vertex.sites)})}</li>
                ))}
            </ul>}
        </div>
        {!refusal && <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("vor_sites_label")} data-voronoi="sites">
                {Array.from({length: counts.sites}, (_, site) => (
                    <button type="button" key={site} data-site={site} aria-pressed={status.cellSite === site}
                            onClick={() => actions.selectSite(status.cellSite === site ? null : site)}>{t("vor_site_item", {value0: site + 1})}</button>
                ))}
            </div>
            <div className="inspector-playback" role="group" aria-label={t("vor_construct_group")}>
                <button type="button" data-action="construct-next" aria-disabled={nextUnavailable}
                        onClick={() => { if (!nextUnavailable) actions.constructNext(); }}>{t("vor_construct_next")}</button>
                <button type="button" data-action="construct-back" aria-disabled={backUnavailable}
                        onClick={() => { if (!backUnavailable) actions.constructBack(); }}>{t("vor_construct_back")}</button>
                <button type="button" data-action="construct-reset" aria-disabled={backUnavailable}
                        onClick={() => { if (!backUnavailable) actions.constructReset(); }}>{t("vor_construct_reset")}</button>
            </div>
            <p className="inspector-help" data-voronoi="construction">{stepText}</p>
        </div>}
        <div className="inspector-group" role="group" aria-label={t("vor_query_group")}>
            <QueryFields x={status.query.x} y={status.query.y} limit={status.coordinateLimit} onSet={actions.setQuery}/>
            <div className="inspector-playback" role="group" aria-label={t("vor_query_move_group")}>
                <button type="button" data-action="query-left" onClick={() => actions.moveQuery(-1, 0)}>{t("vor_query_left")}</button>
                <button type="button" data-action="query-right" onClick={() => actions.moveQuery(1, 0)}>{t("vor_query_right")}</button>
                <button type="button" data-action="query-up" onClick={() => actions.moveQuery(0, 1)}>{t("vor_query_up")}</button>
                <button type="button" data-action="query-down" onClick={() => actions.moveQuery(0, -1)}>{t("vor_query_down")}</button>
            </div>
            <p className="inspector-help" data-voronoi="query-at">{t("vor_query_at", {value0: status.query.x, value1: status.query.y})}</p>
            {queryText && <p className="inspector-help" data-voronoi="query-nearest">{queryText}</p>}
        </div>
        {status.overlayShown && status.triangles.length > 0 && <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("vor_triangles_label")} data-voronoi="triangles">
                {status.triangles.map((corners, index) => (
                    <button type="button" key={corners.join("-")} data-triangle={index} aria-pressed={status.selectedTriangle === index}
                            onClick={() => actions.selectTriangle(status.selectedTriangle === index ? undefined : index)}>
                        {t("del_tri_item", triple(corners))}</button>
                ))}
                <button type="button" data-action="clear-triangle" aria-disabled={selectedVertex === undefined}
                        onClick={() => { if (selectedVertex) actions.selectTriangle(undefined); }}>{t("del_tri_clear")}</button>
            </div>
            {vertexText && <p className="inspector-help" data-voronoi="selected-vertex">{vertexText}</p>}
        </div>}
        <p className="visually-hidden" role="status" aria-live="polite" data-voronoi-live="">
            {[overlayText, vertexText, construction && status.cellSite !== null ? stepText : undefined].filter(Boolean).join(" ")}</p>
    </>;
}
