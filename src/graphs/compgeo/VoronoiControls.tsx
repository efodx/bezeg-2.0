import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import {useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {ResetExampleButton} from "../../inputs/ResetExampleButton";
import {PointListInput} from "../../inputs/PointListInput";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutHeading, ReadoutList} from "../base/controls/ReadoutParts";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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
    /** Chooses the site whose cell is constructed, or null for none; the construction count returns to 0. */
    selectSite(site: number | null): void;
    constructNext(): void;
    constructBack(): void;
    constructReset(): void;
    constructPlayPause(): void;
    /** Places the query point at a typed value, rounded to the quarter grid. */
    setQuery(x: number, y: number): void;
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
    query: {x: string; y: string; value: readonly [number, number]; nearest: readonly number[]};
    coordinateLimit: number;
    overlayShown: boolean;
    /** The Voronoi diagram is drawn; while it is hidden (a lesson step that asks for a prediction) the panel prints no diagram count and no vertex. */
    diagramShown: boolean;
    triangles: readonly (readonly [number, number, number])[];
    selectedTriangle?: number;
    selectedVertex?: {corners: readonly [number, number, number]; x: string; y: string; sites: readonly number[]};
    mode: VoronoiMode;
    /** Whether the panel offers the mode switch (the degenerate-sites graph). */
    modeSwitch: boolean;
    /** The last switch to four-point mode was refused because there are not exactly four sites. */
    modeRefused: boolean;
    /** The scene already is what Reset example restores (the button is unavailable then). */
    atExample: boolean;
    examples: readonly VoronoiExampleId[];
    /** The example the sites show now, or undefined once they are custom. */
    exampleId?: VoronoiExampleId;
    /** The four-point readout: set in four-point mode while there are exactly four distinct sites. */
    fourPoint?: FourPointReadout;
}

export interface VoronoiControlsProps {
    status: VoronoiStatus;
    actions: VoronoiControlActions;
    /** The cell construction is playing. */
    playing?: boolean;
}

const sorted = (corners: readonly number[]) => [...corners].sort((a, b) => a - b);
/** "P1, P3 and P6" as a plain list: "P1, P3, P6". */
const siteList = (sites: readonly number[]) => sites.map(s => `P${s + 1}`).join(", ");
const triple = (corners: readonly number[]) => {
    const [a, b, c] = sorted(corners);
    return {value0: a + 1, value1: b + 1, value2: c + 1};
};

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
            <ReadoutHeading>{t("deg_title")}</ReadoutHeading>
            <ChoiceSelect label={t("deg_mode_group")} value={status.mode} onChange={mode => actions.setMode(mode === "four-point" ? "four-point" : "sites")}
                          options={[{value: "sites", text: t("deg_mode_sites")}, {value: "four-point", text: t("deg_mode_four")}]}/>
            {status.modeRefused && <p className="inspector-help" role="alert" data-voronoi="mode-refused">{t("deg_mode_needs_four", {value0: status.counts.sites})}</p>}
        </>}
        {status.examples.length > 0 && <ExampleSelect<VoronoiExampleId> label={t("deg_example_group")} current={status.exampleId} onChoose={actions.loadExample}
                                                                         options={status.examples.map(id => ({id, text: t(EXAMPLE_LABEL[id])}))}/>}
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
        <div className={CONTROL_ROW_FILL} role="group" aria-label={t("vor_triangles_label")} data-voronoi="triangles">
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
    const playing = props.playing ?? false;
    const backUnavailable = !construction || construction.count <= 0;
    const liveReadout = useStatusReadout([overlayText, vertexText, construction && status.cellSite !== null ? stepText : undefined, queryAnswer,
        ...fourAnnouncement, collinearAnnouncement].filter(Boolean).join(" "), true);
    return <>
        <DegenerateModes status={status} actions={actions}/>
        <div className="inspector-group">
            <ResetExampleButton atExample={status.atExample} onReset={actions.resetExample}/>
        </div>
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
            {!refusal && status.diagramShown && <ReadoutList label={t("vor_readout_label")} hooks={{"data-voronoi": "readout"}} rows={[
                {id: "sites", value: t("vor_count_sites", {value0: counts.sites})},
                {id: "vertices", value: t("vor_count_vertices", {value0: counts.vertices})},
                {id: "edges", value: t("vor_count_edges", {value0: counts.finite})},
                {id: "rays", value: t("vor_count_rays", {value0: counts.rays})},
                ...(counts.lines > 0 ? [{id: "lines", value: t("vor_count_lines", {value0: counts.lines})}] : []),
                {id: "bounded", value: t("vor_count_bounded", {value0: counts.bounded})},
                {id: "unbounded", value: t("vor_count_unbounded", {value0: counts.unbounded})},
            ]}/>}
            {!refusal && status.diagramShown && status.vertices.length > 0 && <ul aria-label={t("vor_vertices_label")} data-voronoi="vertices">
                {status.vertices.map((vertex, index) => (
                    <li key={index} data-vertex={index}>{t("vor_vertex_item", {value0: index + 1, value1: vertex.x, value2: vertex.y, value3: siteList(vertex.sites)})}</li>
                ))}
            </ul>}
        </div>
        {!refusal && <div className="inspector-group">
            <div className={CONTROL_ROW_FILL} role="group" aria-label={t("vor_sites_label")} data-voronoi="sites">
                {Array.from({length: counts.sites}, (_, site) => (
                    <button type="button" key={site} data-site={site} aria-pressed={status.cellSite === site}
                            onClick={() => actions.selectSite(status.cellSite === site ? null : site)}>{t("vor_site_item", {value0: site + 1})}</button>
                ))}
            </div>
            <PlaybackButtons placement="graph" groupLabel={t("vor_construct_group")} nextLabel={t("vor_construct_next")} resetLabel={t("vor_construct_reset")} playing={playing}
                             onNext={() => actions.constructNext()} onPlayPause={() => actions.constructPlayPause()} onReset={() => actions.constructReset()}
                             {...playbackBlocks({ready: construction !== undefined && construction.total > 0, atStart: (construction?.count ?? 0) <= 0,
                                 atEnd: !construction || construction.count >= construction.total, playing, stepsWhilePlaying: true})}>
                <UnavailableButton data-action="construct-back" reason={backUnavailable ? t("playback_block_at_start") : undefined}
                                   onPress={() => actions.constructBack()}>{t("back")}</UnavailableButton>
            </PlaybackButtons>
            <p className="inspector-help" data-voronoi="construction">{stepText}</p>
        </div>}
        <div className="inspector-group">
            {/* A single-point list: no add or remove. Values are quarters of a grid unit, so the field grid keeps them exact. */}
            <PointListInput title={t("vor_query_group")} points={[status.query.value]} pointLabel={() => "q"}
                            min={-status.coordinateLimit} max={status.coordinateLimit} grid={0.25} decimals={2}
                            onCommit={(_, [x, y]) => { actions.setQuery(x, y); }}/>
            <div className={CONTROL_ROW_FILL} role="group" aria-label={t("vor_query_move_group")}>
                <button type="button" data-action="query-left" onClick={() => actions.moveQuery(-1, 0)}>{t("vor_query_left")}</button>
                <button type="button" data-action="query-right" onClick={() => actions.moveQuery(1, 0)}>{t("vor_query_right")}</button>
                <button type="button" data-action="query-up" onClick={() => actions.moveQuery(0, 1)}>{t("vor_query_up")}</button>
                <button type="button" data-action="query-down" onClick={() => actions.moveQuery(0, -1)}>{t("vor_query_down")}</button>
            </div>
            <p className="inspector-help" data-voronoi="query-at">{t("vor_query_at", {value0: status.query.x, value1: status.query.y})}</p>
            {queryText && <p className="inspector-help" data-voronoi="query-nearest">{queryText}</p>}
        </div>
        <LiveReadout readout={liveReadout} muted={playing} dataAttribute="voronoi-live"/>
    </>;
}
