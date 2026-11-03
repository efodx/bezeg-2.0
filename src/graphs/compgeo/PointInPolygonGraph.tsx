import React, {useState} from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {GraphSession} from "../base/GraphSession";
import {BaseGraphState, TransientState} from "../base/BaseGraph";
import {currentLanguage, onLanguageChange, t, useT} from "../../localization";
import {GridPoint, isGridPoint} from "../../compgeo/grid";
import {gridToBoard, PointSetModel, snapToGrid} from "../../compgeo/pointSetModel";
import {NOTCHED_PENTAGON, PENTAGRAM_VERTICES} from "../../compgeo/pointInPolygon";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {formatSigned} from "./orientationReadout";
import {PointInPolygonReadout, pointInPolygonReadout, rayMarkers} from "./pointInPolygonReadout";
import {POINT_IN_POLYGON_OVERLAY_IDS, pointInPolygonPresetCollection} from "./pointInPolygonPresetCollection";

/**
 * Point in polygon (spec convexity-hulls-lessons A3, task 18): a `PointSetGraph` in closed polygon mode plus a query point q.
 * `PointSetGraph` is reused unchanged: the base interface, its overlay hook (`overlayIds`/`overlayLabel`/`drawOverlay`) and its
 * `overlayInputs()` hook (the overlays depend on q, which is not part of the model).
 *
 * - The query point q is scene state (`state.query`, a grid point, default (3, 1)), not a polygon vertex: adding or removing
 *   vertices never moves it. It is a separate JSXGraph point (name "q", square), dragged with the same snapping as a vertex,
 *   moved by the arrow keys by one grid step while it is the active target (press it, or the inspector's select button;
 *   selecting a vertex hands the keys back to the vertices), and edited numerically in the inspector.
 * - Overlays: `ray` (the ray from q towards +x to the board edge; counted crossings are circles numbered from q outwards,
 *   vertices on the ray that do not count are diamonds, so shape and not only colour tells them apart), `winding` (each counted
 *   edge thickened and labelled +1 or -1) and `values`, the verdict switch.
 * - Verdict hiding: `values` off replaces the readout (location, crossing count, both verdicts, winding number) by one neutral
 *   sentence. The readout element stays mounted with empty data attributes, so a lesson's "predict" step uses the scene option
 *   (overlay `values`) and never unmounts anything. Board overlays are independent of it.
 * - The readout outside the board (`data-pip-readout`) is built by the pure `pointInPolygonReadout` (task 16's `classifyPoint`).
 *   On an edge or at a vertex it says "on the boundary" and shows no count and no winding number. A self-intersecting polygon
 *   carries a "not simple" line.
 * - Examples: `loadFigure("notched" | "pentagram")` loads task 16's polygon with its query point ((3, 1) or the centre (0, 0)) and
 *   fits the view. The pentagram is a lattice approximation (see `PENTAGRAM_VERTICES`).
 * - Preset: `pointInPolygonPresetCollection` (key `compgeo-point-in-polygon`) carries the polygon as `data` and the query in
 *   `graphState`. No route or catalog entry yet; the route (task 20) registers the collection.
 * - Ownership: the query point is removed with the figure scene and before the board is freed; the key listener and language
 *   subscription are registered on the session and undone by its cleanup.
 */
export type PointInPolygonOverlayId = "ray" | "winding" | "values";

/** The scene: the polygon and overlays (`PointSetGraphState`) and the query point q (grid coordinates). */
export interface PointInPolygonGraphState extends PointSetGraphState {
    query: GridPoint;
}

export type PointInPolygonFigure = "notched" | "pentagram";

const copyPoints = (points: readonly GridPoint[]): PointSetModel["points"] => points.map(p => ({x: p.x, y: p.y}));

/** The notched pentagon (task 16), counter-clockwise, with the query point (3, 1) inside it. */
export const NOTCHED_MODEL: PointSetModel = {mode: "polygon", closed: true, gridStepExponent: 0, points: copyPoints(NOTCHED_PENTAGON)};
export const NOTCHED_QUERY: GridPoint = {x: 3, y: 1};
/** The lattice pentagram (task 16) with its centre, where the winding number is 2 and the even-odd rule says outside. */
export const PENTAGRAM_MODEL: PointSetModel = {mode: "polygon", closed: true, gridStepExponent: 0, points: copyPoints(PENTAGRAM_VERTICES)};
export const PENTAGRAM_QUERY: GridPoint = {x: 0, y: 0};

const FIGURES: Readonly<Record<PointInPolygonFigure, {model: PointSetModel; query: GridPoint}>> = {
    notched: {model: NOTCHED_MODEL, query: NOTCHED_QUERY},
    pentagram: {model: PENTAGRAM_MODEL, query: PENTAGRAM_QUERY},
};

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

const storedQuery = (value: unknown): GridPoint => (isGridPoint(value) ? {x: value.x, y: value.y} : {...NOTCHED_QUERY});

/** The view for a polygon and its query point: their bounding box with a margin of at least 1.5 grid units. */
function viewFor(points: readonly GridPoint[], query: GridPoint, exponent: number): [number, number, number, number] {
    const all = [...points, query].map(p => gridToBoard(p, exponent));
    const xs = all.map(p => p.x), ys = all.map(p => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const margin = Math.max(1.5 * 2 ** exponent, 0.1 * Math.max(maxX - minX, maxY - minY));
    return [minX - margin, maxY + margin, maxX + margin, minY - margin];
}

const windingText = (winding: number): string => (winding < 0 ? `−${-winding}` : String(winding));

function PointInPolygonStatus({model, query, valuesShown}: {model: PointSetModel; query: GridPoint; valuesShown: boolean}) {
    const translate = useT();
    if (!valuesShown) {
        return <div className="inspector-help pointset-status" data-pip-readout="" data-pip-location="" data-pip-crossings="" data-pip-winding="">
            <p className="mb-1" role="status" data-pip-live="">{translate("pointinpolygon_values_hidden")}</p>
        </div>;
    }
    const readout: PointInPolygonReadout = pointInPolygonReadout(model, query);
    // One concise line is live (where q is, or why that is unknown); the other rows are plain text, read on demand.
    let live: string;
    let lines: string[] = [];
    if (readout.kind === "message") {
        live = readout.reason === "open" ? translate("pointinpolygon_open") : translate("pointinpolygon_too_few", {value0: readout.missing});
    } else if (readout.kind === "boundary") {
        live = translate("pointinpolygon_location_boundary");
        lines = [translate("pointinpolygon_boundary_note")];
    } else {
        live = readout.location === "inside" ? translate("pointinpolygon_location_inside")
            : readout.location === "outside" ? translate("pointinpolygon_location_outside") : translate("pointinpolygon_location_rules_differ");
        lines = [
            translate("pointinpolygon_crossings", {value0: readout.crossings}),
            readout.evenOdd === "inside" ? translate("pointinpolygon_even_odd_inside") : translate("pointinpolygon_even_odd_outside"),
            translate("pointinpolygon_winding", {value0: windingText(readout.winding)}),
            readout.nonzero === "inside" ? translate("pointinpolygon_nonzero_inside") : translate("pointinpolygon_nonzero_outside"),
            ...(readout.simple ? [] : [translate("pointinpolygon_not_simple")]),
        ];
    }
    return <div className="inspector-help pointset-status" data-pip-readout={readout.kind}
                data-pip-location={readout.kind === "located" ? readout.location : readout.kind === "boundary" ? "boundary" : ""}
                data-pip-crossings={readout.kind === "located" ? String(readout.crossings) : ""}
                data-pip-winding={readout.kind === "located" ? String(readout.winding) : ""}>
        <p className="mb-1" role="status" data-pip-live="">{live}</p>
        {lines.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
    </div>;
}

/** A whole-number field that keeps what is being typed and commits every valid integer (as the vertex list's). */
function CoordinateField({label, value, onCommit, name}: {label: string; value: number; onCommit: (value: number) => void; name: string}) {
    const [draft, setDraft] = useState(String(value));
    const [shownValue, setShownValue] = useState(value);
    if (shownValue !== value) {
        setShownValue(value);
        setDraft(String(value));
    }
    return <label className="pointset-field">
        <input type="number" step={1} inputMode="numeric" aria-label={label} name={name} value={draft}
               onBlur={() => setDraft(String(value))}
               onChange={event => {
                   setDraft(event.target.value);
                   const parsed = Number(event.target.value);
                   if (event.target.value.trim() !== "" && Number.isInteger(parsed)) onCommit(parsed);
               }}/>
    </label>;
}

interface QueryControlsProps {
    query: GridPoint;
    active: boolean;
    refused: boolean;
    coordinateLimit: number;
    onSelect: (on: boolean) => void;
    onMove: (point: GridPoint) => void;
    onLoadFigure: (figure: PointInPolygonFigure) => void;
}

function QueryControls({query, active, refused, coordinateLimit, onSelect, onMove, onLoadFigure}: QueryControlsProps) {
    const translate = useT();
    const button = "btn btn-outline-secondary btn-sm";
    return <>
        <div className="inspector-group" role="group" aria-label={translate("pointinpolygon_query_group")}>
            <button type="button" className={button} aria-pressed={active} onClick={() => onSelect(!active)}>{translate("pointinpolygon_query_select")}</button>
            <CoordinateField label={translate("pointinpolygon_query_x")} name="query-x" value={query.x} onCommit={x => onMove({x, y: query.y})}/>
            <CoordinateField label={translate("pointinpolygon_query_y")} name="query-y" value={query.y} onCommit={y => onMove({x: query.x, y})}/>
            <p className="inspector-help pointset-notice" role="status" aria-live="polite" data-pip-notice={refused ? "range" : ""}>
                {refused ? translate("pointset_out_of_range", {value0: coordinateLimit}) : ""}</p>
        </div>
        <div className="inspector-group" role="group" aria-label={translate("pointinpolygon_examples")}>
            <button type="button" className={button} onClick={() => onLoadFigure("notched")}>{translate("pointinpolygon_example_notched")}</button>
            <button type="button" className={button} onClick={() => onLoadFigure("pentagram")}>{translate("pointinpolygon_example_pentagram")}</button>
            <p className="inspector-help">{translate("pointinpolygon_pentagram_note")}</p>
        </div>
    </>;
}

export class PointInPolygonGraph extends PointSetGraph<PointInPolygonOverlayId> {
    private queryPoint?: JXG.Point;
    private inQuerySnap = false;
    /** Whether the arrow keys move q (transient, like the vertex selection); a selected vertex takes the keys instead. */
    private queryActive = false;
    /** The last move of q was refused beyond the coordinate limit; shown until the next move. */
    private queryRefused = false;

    // ---- State ---------------------------------------------------------------------------------------------------

    override getInitialState(): PointInPolygonGraphState {
        return {...super.getInitialState(), overlays: {ray: true, winding: false, values: true}, query: {...NOTCHED_QUERY}};
    }

    /** A patch with the query; `Partial<PointInPolygonGraphState>` is the one place that types it for the base store. */
    private patch(fields: Partial<PointInPolygonGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /** The query point q, in grid units. */
    get query(): GridPoint {
        return storedQuery("query" in this.state ? this.state.query : undefined);
    }

    get isQueryActive(): boolean {
        return this.queryActive && this.selectedIndex === undefined;
    }

    /** Places q at a grid point. False, and nothing changes, beyond the coordinate limit (a notice is shown until the next move). */
    setQuery(point: GridPoint): boolean {
        if (!isGridPoint(point) || Math.abs(point.x) > this.coordinateLimit || Math.abs(point.y) > this.coordinateLimit) {
            this.queryRefused = true;
            this.requestRender();
            return false;
        }
        this.queryRefused = false;
        const current = this.query;
        if (current.x === point.x && current.y === point.y && "query" in this.state && isGridPoint(this.state.query)) {
            this.requestRender();
            return true;
        }
        this.setState(this.patch({query: {x: point.x, y: point.y}}));
        this.requestRender();
        return true;
    }

    /** Moves q by whole grid steps (the arrow keys' step, the same as a vertex's). */
    moveQuery(dx: number, dy: number): boolean {
        const q = this.query;
        return this.setQuery({x: q.x + dx, y: q.y + dy});
    }

    /** Makes q (or, with false, nothing) the target of the arrow keys; selecting q clears the vertex selection. */
    selectQuery(on: boolean): void {
        this.queryActive = on;
        if (on) this.select(undefined);
        else this.requestRender();
    }

    override select(index: number | undefined): void {
        if (index !== undefined) this.queryActive = false;
        super.select(index);
    }

    /** Loads task 16's polygon with its query point and fits the view to it; the one place q changes together with the polygon. */
    loadFigure(figure: PointInPolygonFigure): void {
        const {model, query} = FIGURES[figure];
        this.queryRefused = false;
        this.loadModel(model);
        this.setState(this.patch({query: {...query}}));
        if (this.hasBoard) this.board.setBoundingBox(viewFor(model.points, query, model.gridStepExponent), this.equalAxisUnits);
        this.requestRender();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override defaultPreset(): PointSetModel {
        return {...NOTCHED_MODEL, points: copyPoints(NOTCHED_MODEL.points)};
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return pointInPolygonPresetCollection;
    }

    /** A Preset's query is checked on import; anything else a stored scene holds becomes the default query. */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const state: PointInPolygonGraphState = {...merged, query: storedQuery("query" in merged ? merged.query : undefined)};
        return state;
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), pointInPolygonQueryActive: this.queryActive};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.queryActive = saved?.pointInPolygonQueryActive === true && this.selectedIndex === undefined;
        this.queryRefused = false;
    }

    /** The view fitted to the polygon and q (the default example spans x 0 to 6, y 0 to 4). */
    protected override initialView(): [number, number, number, number] {
        const model = this.model;
        return viewFor(model.points, this.query, model.gridStepExponent);
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return POINT_IN_POLYGON_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | PointInPolygonOverlayId): string {
        if (id === "ray") return t("pointinpolygon_overlay_ray");
        if (id === "winding") return t("pointinpolygon_overlay_winding");
        if (id === "values") return t("pointinpolygon_overlay_values");
        return super.overlayLabel(id);
    }

    /** The ray and the winding labels follow q, which is not part of the model or of the shown set. */
    protected override overlayInputs(): unknown {
        return "query" in this.state ? this.state.query : undefined;
    }

    protected override drawOverlay(id: "grid" | PointInPolygonOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "ray") return this.drawRay(model);
        if (id === "winding") return this.drawWinding(model);
        if (id === "values") return [];
        return super.drawOverlay(id, model);
    }

    private drawRay(model: PointSetModel): JXG.GeometryElement[] {
        const query = this.query;
        const markers = rayMarkers(model, query);
        if (markers.kind !== "ray") return [];
        const exponent = model.gridStepExponent;
        const board = this.board;
        const q = gridToBoard(query, exponent);
        // A ray through q to the right edge of the board: the line is infinite one way, so panning and zooming need no redraw.
        const objects: JXG.GeometryElement[] = [board.create("line", [[q.x, q.y], [q.x + 1, q.y]], {
            straightFirst: false, straightLast: true, strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2,
            highlight: false, fixed: true, layer: 3, name: "ray-line", withLabel: false,
        }) as JXG.GeometryElement];
        for (const touch of markers.touches) {
            const at = gridToBoard(touch, exponent);
            objects.push(board.create("point", [at.x, at.y], {
                name: "ray-touch", withLabel: false, face: "<>", size: 7, fillColor: "none", strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
                highlight: false, fixed: true, showInfobox: false, layer: 4,
            }) as JXG.GeometryElement);
        }
        // Crossings at the same place (the ray passes through a vertex that two counted edges share) stack their numbers.
        const stacked = new Map<string, number>();
        for (const crossing of markers.crossings) {
            const x = crossing.x.toNumber() * 2 ** exponent;
            const place = crossing.x.format();
            const level = stacked.get(place) ?? 0;
            stacked.set(place, level + 1);
            objects.push(board.create("point", [x, q.y], {
                name: "ray-crossing", withLabel: false, face: "o", size: 4, fillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve,
                highlight: false, fixed: true, showInfobox: false, layer: 5,
            }) as JXG.GeometryElement);
            objects.push(board.create("text", [x, () => q.y + (14 + 14 * level) / board.unitY, String(crossing.number)], {
                anchorX: "middle", anchorY: "middle", fontSize: 13, strokeColor: GraphPalette.label, highlight: false, fixed: true,
                layer: 8, display: "html", name: "ray-number", cssStyle: "pointer-events:none;",
            }) as JXG.GeometryElement);
        }
        return objects;
    }

    private drawWinding(model: PointSetModel): JXG.GeometryElement[] {
        const markers = rayMarkers(model, this.query);
        if (markers.kind !== "ray") return [];
        const exponent = model.gridStepExponent;
        const n = model.points.length;
        const objects: JXG.GeometryElement[] = [];
        for (const crossing of markers.crossings) {
            const from = gridToBoard(model.points[crossing.edge], exponent);
            const to = gridToBoard(model.points[(crossing.edge + 1) % n], exponent);
            const color = crossing.direction > 0 ? GraphPalette.primaryCurve : GraphPalette.comparisonCurve;
            objects.push(this.board.create("segment", [[from.x, from.y], [to.x, to.y]], {
                strokeColor: color, strokeWidth: 6, strokeOpacity: 0.45, highlight: false, fixed: true, layer: 2,
                name: "winding-edge", withLabel: false,
            }) as JXG.GeometryElement);
            objects.push(this.board.create("text", [(from.x + to.x) / 2, (from.y + to.y) / 2, formatSigned(crossing.direction)], {
                anchorX: "middle", anchorY: "middle", fontSize: 13, strokeColor: GraphPalette.label, highlight: false, fixed: true,
                layer: 8, display: "html", name: "winding-label", cssStyle: "pointer-events:none;",
            }) as JXG.GeometryElement);
        }
        return objects;
    }

    // ---- The query point -----------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        container.addEventListener("keydown", this.onQueryKey);
        let language = currentLanguage();
        const unsubscribeLanguage = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            this.nameQueryPoint();
        });
        session.registerCleanup(() => {
            unsubscribeLanguage();
            container.removeEventListener("keydown", this.onQueryKey);
        });
    }

    /** Arrow keys move q while it is the target; the base graph's own listener moves a selected vertex, which then wins. */
    private readonly onQueryKey = (event: KeyboardEvent): void => {
        if (event.altKey || event.ctrlKey || event.metaKey || this.graphInteractionLocked || !this.queryActive) return;
        if (this.selectedIndex !== undefined) {
            this.queryActive = false;
            this.requestRender();
            return;
        }
        const step = ARROW_STEPS[event.key];
        if (step) {
            event.preventDefault();
            this.moveQuery(step[0], step[1]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            this.selectQuery(false);
        }
    };

    protected override syncScene(): void {
        super.syncScene();
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        this.syncQuery();
    }

    /** The query point: created once, moved with the state, removed with the scene. */
    private syncQuery(): void {
        const exponent = this.model.gridStepExponent;
        const target = gridToBoard(this.query, exponent);
        let point = this.queryPoint;
        if (point && !(this.board.objectsList as unknown[]).includes(point)) point = this.queryPoint = undefined;
        if (!point) {
            const created = this.board.create("point", [target.x, target.y], {
                name: "q", withLabel: true, face: "square", showInfobox: false, layer: 9,
                size: () => this.isQueryActive ? 7 : 6,
                fillColor: GraphPalette.derivedPoint,
                strokeColor: GraphPalette.selectedControlPointOutline,
                strokeWidth: () => this.isQueryActive ? 3 : 2,
                label: {visible: true, offset: [8, 8], strokeColor: GraphPalette.label},
            }) as JXG.Point;
            created.on("down", () => {
                this.queryActive = true;
                this.select(undefined);
                this.board.containerObj.focus({preventScroll: true});
            });
            created.on("drag", () => this.dragQuery(created));
            this.queryPoint = created;
            this.nameQueryPoint();
        } else if (point.X() !== target.x || point.Y() !== target.y) {
            this.inQuerySnap = true;
            try { point.moveTo([target.x, target.y], 0); } finally { this.inQuerySnap = false; }
        }
        this.boardUpdate();
    }

    /** The accessible name of q on the board: the point is a bare SVG element, so it gets its own label. */
    private nameQueryPoint(): void {
        const node = this.queryPoint?.rendNode;
        if (!node) return;
        node.setAttribute("role", "img");
        node.setAttribute("aria-label", t("pointinpolygon_query_group"));
    }

    private dragQuery(point: JXG.Point): void {
        if (this.inQuerySnap || this.graphInteractionLocked) return;
        const exponent = this.model.gridStepExponent;
        this.setQuery(snapToGrid(point.X(), point.Y(), exponent));
        const target = gridToBoard(this.query, exponent);
        this.queryActive = true;
        this.inQuerySnap = true;
        try {
            if (point.X() !== target.x || point.Y() !== target.y) point.moveTo([target.x, target.y], 0);
        } finally {
            this.inQuerySnap = false;
        }
    }

    private removeQueryPoint(): void {
        const point = this.queryPoint;
        this.queryPoint = undefined;
        if (point && this.hasBoard && (this.board.objectsList as unknown[]).includes(point)) this.board.removeObject(point);
    }

    protected override disposeFigureScene(): void {
        this.removeQueryPoint();
        super.disposeFigureScene();
    }

    /** The point goes before the board is freed: removing it needs that board. */
    override unmount(): void {
        this.removeQueryPoint();
        this.queryActive = false;
        this.queryRefused = false;
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <PointInPolygonStatus model={this.model} query={this.query} valuesShown={this.overlayShown("values")}/>
            <QueryControls query={this.query} active={this.isQueryActive} refused={this.queryRefused} coordinateLimit={this.coordinateLimit}
                           onSelect={on => this.selectQuery(on)} onMove={point => { this.setQuery(point); }} onLoadFigure={figure => this.loadFigure(figure)}/>
            {super.workspaceEdit()}
        </>;
    }
}
