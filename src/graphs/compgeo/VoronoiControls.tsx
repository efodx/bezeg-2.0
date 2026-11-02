import React, {useState} from "react";
import {useT} from "../../localization";
import type {FourPointReadout} from "./degenerateSites";
import type {VoronoiMode} from "./voronoiPresetCollection";

/** The named examples of the degenerate-sites graph. */
export type VoronoiExampleId = "square" | "trapezoid" | "near" | "collinear";
const EXAMPLE_LABEL = {
    square: "deg_example_square", trapezoid: "deg_example_trapezoid", near: "deg_example_near", collinear: "deg_example_collinear",
} as const;

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
    /** Switches between `sites` and `four-point` mode; refused (with a message) unless there are exactly four sites for the latter. */
    setMode(mode: VoronoiMode): void;
    /** Loads one named example (sites, overlays and mode). */
    loadExample(id: VoronoiExampleId): void;
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
    /** The last move of the query point (arrows or drag) was refused beyond the coordinate limit. */
    queryRefused: boolean;
    overlayShown: boolean;
    triangles: readonly (readonly [number, number, number])[];
    selectedTriangle?: number;
    selectedVertex?: {corners: readonly [number, number, number]; x: string; y: string; sites: readonly number[]};
    mode: VoronoiMode;
    /** Whether the panel offers the mode switch (the degenerate-sites graph). */
    modeSwitch: boolean;
    /** The last switch to four-point mode was refused because there are not exactly four sites. */
    modeRefused: boolean;
    examples: readonly VoronoiExampleId[];
    /** The four-point readout: set in four-point mode while there are exactly four distinct sites. */
    fourPoint?: FourPointReadout;
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
function QueryFields(props: {x: string; y: string; invalid: boolean; message: string; onInvalid: (invalid: boolean) => void; onSet: (x: string, y: string) => boolean}) {
    const t = useT();
    const [draft, setDraft] = useState<{x: string; y: string; from: string}>({x: props.x, y: props.y, from: `${props.x}|${props.y}`});
    const from = `${props.x}|${props.y}`;
    // A new position from the graph (drag, arrows, Reset) replaces the draft; adjusted during render, not in an effect.
    if (draft.from !== from) setDraft({x: props.x, y: props.y, from});
    const commit = () => props.onInvalid(!props.onSet(draft.x, draft.y));
    const key = (event: React.KeyboardEvent) => { if (event.key === "Enter") commit(); };
    const edit = (next: {x: string; y: string}) => { setDraft({...draft, ...next}); props.onInvalid(false); };
    const described = props.invalid ? "voronoi-query-invalid" : undefined;
    return <>
        <label>{t("vor_query_x")} <input type="text" inputMode="text" data-voronoi="query-x" value={draft.x} aria-invalid={props.invalid} aria-describedby={described}
                                       onKeyDown={key} onChange={e => edit({x: e.target.value, y: draft.y})}/></label>
        <label>{t("vor_query_y")} <input type="text" inputMode="text" data-voronoi="query-y" value={draft.y} aria-invalid={props.invalid} aria-describedby={described}
                                       onKeyDown={key} onChange={e => edit({x: draft.x, y: e.target.value})}/></label>
        <button type="button" data-action="query-set" onClick={commit}>{t("vor_query_set")}</button>
        {props.message && <p id="voronoi-query-invalid" className="inspector-help" role="alert" data-voronoi="query-invalid">{props.message}</p>}
    </>;
}

const vertexTextOf = (t: ReturnType<typeof useT>, vertex: VoronoiStatus["selectedVertex"]) => vertex
    ? t("vor_tri_vertex", {...triple(vertex.corners), value3: vertex.x, value4: vertex.y, value5: siteList(vertex.sites)})
    : undefined;

/** The sentences of the four-point readout; undefined while there is nothing to read (not four distinct sites). */
function fourPointText(t: ReturnType<typeof useT>, status: VoronoiStatus) {
    const f = status.fourPoint;
    if (!f) return undefined;
    const circle = f.circle;
    const triple = circle ? `P${circle.a + 1}, P${circle.b + 1}, P${circle.c + 1}` : "";
    const fourth = circle ? `P${circle.d + 1}` : "";
    const values = {value0: f.determinant ?? "", value1: triple, value2: fourth};
    const incircle = !circle || f.sign === undefined ? t("deg_no_circle")
        : f.sign === "inside" ? t("deg_incircle_inside", values)
        : f.sign === "on" ? t("deg_incircle_on", values)
        : t("deg_incircle_outside", values);
    const vertices = f.degrees.length > 0 ? t("deg_vertices", {value0: f.degrees.length, value1: f.degrees.join(", ")}) : t("deg_vertices_none");
    const diagonals = (f.diagonals ?? []).map(d => {
        const names = {value0: d.from + 1, value1: d.to + 1};
        return {key: `${d.from}-${d.to}`, text: d.legal ? t("deg_diagonal_legal", names) : t("deg_diagonal_illegal", names)};
    });
    const legal = (f.diagonals ?? []).filter(d => d.legal);
    const verdict = !f.diagonals ? t("deg_not_convex")
        : legal.length === 2 ? t("deg_not_unique")
        : legal.length === 1 ? t("deg_unique", {value0: legal[0].from + 1, value1: legal[0].to + 1})
        : undefined;
    return {incircle, vertices, diagonals, verdict};
}

/** The mode switch and the named examples of the degenerate-sites graph. */
function DegenerateModes(props: VoronoiControlsProps) {
    const t = useT();
    const {status, actions} = props;
    if (!status.modeSwitch && status.examples.length === 0) return null;
    return <div className="inspector-group">
        {status.modeSwitch && <>
            <h3 className="inspector-reveals-title">{t("deg_title")}</h3>
            <div className="inspector-playback" role="group" aria-label={t("deg_mode_group")} data-voronoi="mode">
                <button type="button" data-action="mode-sites" aria-pressed={status.mode === "sites"} onClick={() => actions.setMode("sites")}>{t("deg_mode_sites")}</button>
                <button type="button" data-action="mode-four-point" aria-pressed={status.mode === "four-point"} onClick={() => actions.setMode("four-point")}>{t("deg_mode_four")}</button>
            </div>
            {status.modeRefused && <p className="inspector-help" role="alert" data-voronoi="mode-refused">{t("deg_mode_needs_four", {value0: status.counts.sites})}</p>}
        </>}
        {status.examples.length > 0 && <div className="inspector-playback" role="group" aria-label={t("deg_example_group")} data-voronoi="examples">
            {status.examples.map(id => <button type="button" key={id} data-example={id} onClick={() => actions.loadExample(id)}>{t(EXAMPLE_LABEL[id])}</button>)}
        </div>}
    </div>;
}

/** The triangles of the Delaunay overlay and the selected triangle's Voronoi vertex; placed after the overlay switch. */
export function VoronoiTriangles(props: VoronoiControlsProps) {
    const t = useT();
    const {status, actions} = props;
    const selectedVertex = status.selectedVertex;
    const vertexText = vertexTextOf(t, selectedVertex);
    if (!status.overlayShown || status.triangles.length === 0) return null;
    return <div className="inspector-group">
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
    </div>;
}

/** The readouts, the cell construction, the query point and the duality triangle list of the Voronoi graph. */
export function VoronoiControls(props: VoronoiControlsProps) {
    const t = useT();
    const {status, actions} = props;
    const {counts, construction} = status;
    const [invalid, setInvalid] = useState(false);
    const [seenAt, setSeenAt] = useState(`${status.query.x}|${status.query.y}`);
    // Any committed move of the query point, by whatever route, retires an earlier typing error.
    if (seenAt !== `${status.query.x}|${status.query.y}`) { setSeenAt(`${status.query.x}|${status.query.y}`); setInvalid(false); }
    const refusal = status.refusal;
    const refusalText = refusal
        ? refusal.kind === "few" ? t("vor_refused_few") : t("vor_refused_duplicate", {value0: refusal.sites[0] + 1, value1: refusal.sites[1] + 1})
        : undefined;
    const nearest = status.query.nearest;
    const queryText = refusal ? undefined : nearest.length === 1
        ? t("vor_query_nearest", {value0: nearest[0] + 1})
        : t("vor_query_tie", {value0: siteList(nearest)});
    const selectedVertex = status.selectedVertex;
    const vertexText = vertexTextOf(t, selectedVertex);
    const queryMessage = invalid || status.queryRefused ? t("vor_query_invalid", {value0: status.coordinateLimit}) : "";
    const queryAnswer = refusal ? undefined : `${t("vor_query_at", {value0: status.query.x, value1: status.query.y})} ${queryText}`;
    const stepText = !construction || status.cellSite === null ? t("vor_construct_none")
        : construction.count === 0 ? t("vor_construct_start", {value0: status.cellSite + 1, value1: construction.total})
        : construction.done ? t("vor_construct_done", {value0: status.cellSite + 1, value1: construction.count})
        : t("vor_construct_step", {value0: construction.count, value1: construction.total, value2: status.cellSite + 1, value3: (construction.other ?? 0) + 1});
    const four = fourPointText(t, status);
    // Short on purpose: the live text changes only when the sign, the verdict or the vertex degrees change, not on every determinant value.
    const fourSign = status.fourPoint?.sign;
    const fourAnnouncement = four ? [fourSign === undefined ? four.incircle : t(fourSign === "inside" ? "deg_say_inside" : fourSign === "on" ? "deg_say_on" : "deg_say_outside"), four.verdict, four.vertices] : [];
    const collinearAnnouncement = status.collinear && !refusal ? t("vor_collinear_note") : undefined;
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
        <DegenerateModes status={status} actions={actions}/>
        <div className="inspector-group" data-voronoi-status="">
            {refusalText && <p className="inspector-help" role="alert" data-voronoi="refusal">{refusalText}</p>}
            {status.collinear && !refusal && <p className="inspector-help" data-voronoi="collinear">{t("vor_collinear_note")}</p>}
            {status.mode === "four-point" && <p className="inspector-help" data-voronoi="four-fixed">{t("deg_four_fixed")}</p>}
            {status.mode === "four-point" && status.counts.sites !== 4 && <p className="inspector-help" role="alert" data-voronoi="wrong-count">{t("deg_wrong_count", {value0: status.counts.sites})}</p>}
            {four && <div data-voronoi="four-point" role="group" aria-label={t("deg_readout_label")}>
                <p className="inspector-help" data-fourpoint="incircle">{four.incircle}</p>
                <p className="inspector-help" data-fourpoint="vertices">{four.vertices}</p>
                {four.diagonals.length > 0 && <ul aria-label={t("deg_diagonals_label")} data-fourpoint="diagonals">
                    {four.diagonals.map(d => <li key={d.key}>{d.text}</li>)}
                </ul>}
                {four.verdict && <p className="inspector-help" data-fourpoint="verdict">{four.verdict}</p>}
            </div>}
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
            <QueryFields x={status.query.x} y={status.query.y} invalid={invalid} message={queryMessage} onInvalid={setInvalid} onSet={actions.setQuery}/>
            <div className="inspector-playback" role="group" aria-label={t("vor_query_move_group")}>
                <button type="button" data-action="query-left" onClick={() => actions.moveQuery(-1, 0)}>{t("vor_query_left")}</button>
                <button type="button" data-action="query-right" onClick={() => actions.moveQuery(1, 0)}>{t("vor_query_right")}</button>
                <button type="button" data-action="query-up" onClick={() => actions.moveQuery(0, 1)}>{t("vor_query_up")}</button>
                <button type="button" data-action="query-down" onClick={() => actions.moveQuery(0, -1)}>{t("vor_query_down")}</button>
            </div>
            <p className="inspector-help" data-voronoi="query-at">{t("vor_query_at", {value0: status.query.x, value1: status.query.y})}</p>
            {queryText && <p className="inspector-help" data-voronoi="query-nearest">{queryText}</p>}
        </div>
        <p className="visually-hidden" role="status" aria-live="polite" data-voronoi-live="">
            {[overlayText, vertexText, construction && status.cellSite !== null ? stepText : undefined, queryAnswer, queryMessage,
                ...fourAnnouncement, collinearAnnouncement].filter(Boolean).join(" ")}</p>
    </>;
}
