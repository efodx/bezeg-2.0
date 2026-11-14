import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import {PointListInput} from "../../inputs/PointListInput";
import {StatusLive} from "../base/controls/StatusLive";
import {ExampleSelect, matchingExample} from "./ExampleSelect";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import type {PointSetExtension} from "./pointSetPersistence";
import {LessonAction} from "../../learning/model";
import {GraphSession} from "../base/GraphSession";
import {TransientState} from "../base/BaseGraph";
import {currentLanguage, onLanguageChange, t, useT} from "../../localization";
import {GridPoint, isGridPoint} from "../../compgeo/grid";
import {gridToBoard, PointSetModel, snapToGrid} from "../../compgeo/pointSetModel";
import {NOTCHED_PENTAGON, PENTAGRAM_VERTICES} from "../../compgeo/pointInPolygon";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {pointLabelMath} from "../styles/pointLabelMath";
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
 *   `graphState`. The collection is listed in `compgeoPresetCollections`.
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

/**
 * The one scene field beyond `initialized`, `model` and `overlays`: the query point q, as `pointInPolygonPresetCollection` permits
 * it (a grid point). An omitted or refused query is the notched default, never the preceding scene's; a bare data import keeps it.
 * `queryActive` is transient and not persisted.
 */
const QUERY_EXTENSION: PointSetExtension = Object.freeze({
    fields: [{
        name: "query", fallback: Object.freeze({...NOTCHED_QUERY}),
        parse: (value: unknown) => isGridPoint(value) ? {x: value.x, y: value.y} : undefined,
    }],
});

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
        return <><div className="inspector-help pointset-status" data-pip-readout="" data-pip-location="" data-pip-crossings="" data-pip-winding="">
            <p className="mb-1" data-pip-live="">{translate("pointinpolygon_values_hidden")}</p>
        </div><StatusLive text={translate("pointinpolygon_values_hidden")}/></>;
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
    return <><div className="inspector-help pointset-status" data-pip-readout={readout.kind}
                data-pip-location={readout.kind === "located" ? readout.location : readout.kind === "boundary" ? "boundary" : ""}
                data-pip-crossings={readout.kind === "located" ? String(readout.crossings) : ""}
                data-pip-winding={readout.kind === "located" ? String(readout.winding) : ""}>
        <p className="mb-1" data-pip-live="">{live}</p>
        {lines.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
    </div><StatusLive text={live}/></>;
}

interface QueryControlsProps {
    model: PointSetModel;
    query: GridPoint;
    active: boolean;
    coordinateLimit: number;
    onSelect: (on: boolean) => void;
    onMove: (point: GridPoint) => void;
    onLoadFigure: (figure: PointInPolygonFigure) => void;
}

function QueryControls({model, query, active, coordinateLimit, onSelect, onMove, onLoadFigure}: QueryControlsProps) {
    const translate = useT();
    return <>
        <div className="inspector-group">
            {/* A single-point list: no add or remove. Its name button selects q for the arrow keys; Escape and the keys are the graph's. */}
            <PointListInput title={translate("pointinpolygon_query_group")} points={[[query.x, query.y] as const]} pointLabel={() => "q"}
                            min={-coordinateLimit} max={coordinateLimit} integer selected={active ? 0 : undefined}
                            onSelect={index => onSelect(index === 0)}
                            onCommit={(_, [x, y]) => { onMove({x, y}); }}/>
        </div>
        <div className="inspector-group">
            <ExampleSelect<PointInPolygonFigure> label={translate("pointinpolygon_examples")} onChoose={onLoadFigure}
                           current={matchingExample(model, [{id: "notched", points: NOTCHED_MODEL.points}, {id: "pentagram", points: PENTAGRAM_MODEL.points}])}
                           options={[{id: "notched", text: translate("pointinpolygon_example_notched")}, {id: "pentagram", text: translate("pointinpolygon_example_pentagram")}]}/>
            <p className="inspector-help">{translate("pointinpolygon_pentagram_note")}</p>
        </div>
    </>;
}

export class PointInPolygonGraph extends PointSetGraph<PointInPolygonOverlayId> {
    private queryPoint?: JXG.Point;
    private inQuerySnap = false;
    /** Whether the arrow keys move q (transient, like the vertex selection); a selected vertex takes the keys instead. */
    private queryActive = false;

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

    /** Places q at a grid point. False, and nothing changes, beyond the coordinate limit (the move stops silently: decision 7). */
    setQuery(point: GridPoint): boolean {
        if (!isGridPoint(point) || Math.abs(point.x) > this.coordinateLimit || Math.abs(point.y) > this.coordinateLimit) {
            this.requestRender();
            return false;
        }
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
        this.loadModel(model);
        this.setState(this.patch({query: {...query}}));
        if (this.hasBoard) this.board.setBoundingBox(viewFor(model.points, query, model.gridStepExponent), this.equalAxisUnits);
        this.requestRender();
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------

    /** The figure q returns to on `set-query-point` `null`: the pentagram's centre while the polygon is the pentagram, else the notched default. */
    private defaultQuery(): GridPoint {
        const vertices = this.model.points;
        const pentagram = this.model.closed && vertices.length === PENTAGRAM_MODEL.points.length
            && vertices.every((p, i) => p.x === PENTAGRAM_MODEL.points[i].x && p.y === PENTAGRAM_MODEL.points[i].y);
        return {...(pentagram ? PENTAGRAM_QUERY : NOTCHED_QUERY)};
    }

    /**
     * Lesson actions: `set-polygon` is an example button (`loadFigure`); `set-query-point` places q on the grid a drag snaps to (whole grid
     * steps of the polygon) and `null` returns it to the current figure's default. A value off the grid or beyond the coordinate limit is a
     * lesson-content error and is never snapped. `set-overlay` for `ray`, `winding` and `values` is the base class's.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "set-polygon") {
            const polygon: unknown = action.polygon;
            if (polygon !== "notched" && polygon !== "pentagram") throw new Error(`point-set set-polygon: polygon must be "notched" or "pentagram", got ${JSON.stringify(polygon)}.`);
            this.loadFigure(polygon);
            return;
        }
        if (action.operation === "set-query-point") {
            const point: unknown = action.point;
            if (point === null) {
                this.setQuery(this.defaultQuery());
                return;
            }
            // The lesson gives board units; a grid point is a whole number of the polygon's grid steps.
            const scale = 2 ** -this.model.gridStepExponent;
            const limit = this.coordinateLimit;
            const onGrid = (v: unknown): v is number => typeof v === "number" && isFinite(v) && Number.isInteger(v * scale) && Math.abs(v * scale) <= limit;
            if (!Array.isArray(point) || point.length !== 2 || !onGrid(point[0]) || !onGrid(point[1])) {
                throw new Error(`point-set set-query-point: point must be null or [x, y], each a multiple of ${String(2 ** this.model.gridStepExponent)} within ${String(limit)} grid steps, got ${JSON.stringify(point)}.`);
            }
            this.setQuery({x: point[0] * scale + 0, y: point[1] * scale + 0});
            return;
        }
        super.applyPointSetAction(action);
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override defaultPreset(): PointSetModel {
        return {...NOTCHED_MODEL, points: copyPoints(NOTCHED_MODEL.points)};
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return pointInPolygonPresetCollection;
    }

    /** The declared query point (`QUERY_EXTENSION`): import, figure return and lesson default read it. */
    protected override persistenceExtension(): PointSetExtension {
        return QUERY_EXTENSION;
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), pointInPolygonQueryActive: this.queryActive};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.queryActive = saved?.pointInPolygonQueryActive === true && this.selectedIndex === undefined;
    }

    /**
     * The view fitted to the default example (x 0 to 6, y 0 to 4, q = (3, 1)). It is read before a reset replaces the scene, so it must
     * not depend on the current polygon or q; `loadFigure` fits the view to the figure it loads itself.
     */
    protected override initialView(): [number, number, number, number] {
        return viewFor(NOTCHED_MODEL.points, NOTCHED_QUERY, NOTCHED_MODEL.gridStepExponent);
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
            // Beside the crossing, not above it: a vertical edge runs through the point straight above it.
            objects.push(board.create("text", [() => x + 8 / board.unitX, () => q.y + (14 + 14 * level) / board.unitY, String(crossing.number)], {
                anchorX: "left", anchorY: "middle", fontSize: 13, strokeColor: GraphPalette.label, highlight: false, fixed: true,
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
                label: {...(this.styles.point.namedLabel as object), visible: true, offset: [8, 8], strokeColor: GraphPalette.label},
            }) as JXG.Point;
            created.label?.setText(pointLabelMath("q"));
            created.on("down", () => {
                this.queryActive = true;
                this.select(undefined);
                this.board.containerObj.focus({preventScroll: true});
            });
            bindMovablePointCursor(created, this.board);
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
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <PointInPolygonStatus model={this.model} query={this.query} valuesShown={this.overlayShown("values")}/>
            <QueryControls model={this.model} query={this.query} active={this.isQueryActive} coordinateLimit={this.coordinateLimit}
                           onSelect={on => this.selectQuery(on)} onMove={point => { this.setQuery(point); }} onLoadFigure={figure => this.loadFigure(figure)}/>
            {super.workspaceEdit()}
        </>;
    }
}
