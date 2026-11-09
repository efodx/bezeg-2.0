import React from "react";
import {t} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import {Rational, RationalPoint} from "../../compgeo/rational";
import {circumcentre} from "../../compgeo/triangle";
import type {Triangulation} from "../../compgeo/triangulation";
import {edges as triangulationEdges} from "../../compgeo/triangulation";
import {delaunayTriangulation} from "../../compgeo/delaunay";
import {dualEdges, nearestSites, type RationalBox, voronoiFromDelaunay, type VoronoiDiagram, type VoronoiOutcome} from "../../compgeo/voronoi";
import type {LessonAction} from "../../learning/model";
import {BaseGraphState} from "../base/BaseGraph";
import type {GraphSession} from "../base/GraphSession";
import type {AnimationScheduler} from "../../learning/runtime/animation";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset} from "../base/presets/Presets";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {CompgeoRegionPalette, voronoiCellFill} from "./CompgeoRegionPalette";
import {drawSelectableTriangles, sameTriple, sortedTriple, type TriangleSelectionNames} from "./circumcircleDrawing";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {VoronoiControlActions, VoronoiControls, VoronoiExampleId, VoronoiStatus, VoronoiTriangles} from "./VoronoiControls";
import {fourPointReadout} from "./degenerateSites";
import {bisectorOrder, constructionRegion, parseRationalText} from "./voronoiConstruction";
import {boardFrameOf, fitFrame} from "./frameFit";
import {TracePlayback} from "../base/tracePlayback";
import {followedGridBox, visibleGridBox} from "./followBox";
import {matchingExample} from "./ExampleSelect";
import {clipToBox, createVoronoiDrawing, frame, type VoronoiDrawingHandle, type VoronoiDrawingStats} from "./voronoiDrawing";
import {
    FOUR_POINT_SITES, isVoronoiMode, VORONOI_DEFAULT_QUERY, VORONOI_EXAMPLE, VORONOI_MAX_POINTS, VORONOI_OVERLAY_IDS, voronoiCollection,
    type VoronoiMode, type VoronoiQuery,
} from "./voronoiPresetCollection";

/** The scene: the points and overlays (`PointSetGraphState`), the chosen site, how many bisectors are shown and the query point. */
export interface VoronoiGraphState extends PointSetGraphState {
    /** The site whose cell is constructed, or null. */
    cellSite: number | null;
    /** Bisectors of `cellSite` shown, in construction order; 0 to (sites - 1). */
    construction: number;
    /** The query point, exact, grid units. */
    query: VoronoiQuery;
    /** `sites` (any number of sites, the default) or `four-point` (exactly four sites with the incircle readout). */
    mode: VoronoiMode;
}

/** A move of the query point by the arrow buttons, in grid units, and the grid it snaps to when dragged. */
const QUERY_STEP = Rational.of(1, 2);
const QUERY_SNAP = 4;
/** Time between two construction steps while it plays. */
const CONSTRUCTION_STEP_INTERVAL_MS = 800;

const NAMES: TriangleSelectionNames = {
    triangle: "voronoi-triangle", selectedTriangle: "voronoi-selected-triangle", selectedCircle: "voronoi-selected-circle",
};

const storedSite = (value: unknown, sites: number): number | null =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < sites ? value : null;
const storedCount = (value: unknown, total: number): number =>
    typeof value === "number" && Number.isInteger(value) ? Math.max(0, Math.min(total, value)) : 0;
const storedMode = (value: unknown): VoronoiMode => (isVoronoiMode(value) ? value : "sites");
const storedQuery = (value: unknown): VoronoiQuery => {
    const record: {x?: unknown; y?: unknown} = typeof value === "object" && value !== null ? value : {};
    const ok = typeof record.x === "string" && typeof record.y === "string"
        && parseRationalText(record.x) !== undefined && parseRationalText(record.y) !== undefined;
    return ok ? {x: String(record.x), y: String(record.y)} : VORONOI_DEFAULT_QUERY;
};

interface Derived {
    readonly points: readonly GridPoint[];
    readonly outcome: VoronoiOutcome;
    /** The Delaunay triangulation (the dual); undefined when there is none (fewer than three or collinear sites). */
    readonly tri?: Triangulation;
    readonly box?: RationalBox;
}

/**
 * The Voronoi diagram with the Delaunay duality overlay (task 19, spec B4). `VoronoiGraph extends PointSetGraph` in points
 * mode only. The diagram is derived from the points (`voronoiFromDelaunay`) and never stored; the scene keeps the points,
 * the overlay switches, the chosen site, the number of bisectors shown and the exact query point.
 *
 * Board: the diagram is drawn by `createVoronoiDrawing` (task 18) through one reused handle, updated when the points or the
 * highlighted cell change. The Delaunay overlay (switch `delaunay`, off by default) draws hull edges thick and solid and
 * interior edges thin and dashed, one clickable polygon per triangle (`circumcircleDrawing`, shared with `DelaunayGraph`) and,
 * for the selected triangle, its circumcircle with the circumcentre marked as the matching Voronoi vertex. The selected
 * triangle is transient and cleared by any edit and by switching the overlay off.
 *
 * Cell construction: for the chosen site, `construction` bisectors are shown in the decided order (other sites by increasing
 * distance, ties by index) with the region that remains after intersecting those half-planes with the view box. Any edit of
 * the points clears the chosen site and the count.
 *
 * Query point: a draggable point (snapped to quarters of a grid unit) with a numeric alternative and arrow moves; the panel
 * names the nearest site from `nearestSites`, every tied site when it lies on a bisector, and the cell of the first of
 * them is highlighted. It is not a site and does not count against the point limit.
 *
 * Ownership: the drawing handle, the construction objects and the query point are disposed with the figure scene and before
 * the board is freed.
 */
export class VoronoiGraph extends PointSetGraph<"delaunay" | "diagram"> {
    private derivedMemo?: Derived;
    private selectedTriangleValue?: readonly [number, number, number];
    private overlayMemo?: {base: unknown; triangle: string};
    private drawing?: {handle: VoronoiDrawingHandle; scale: number};
    private drawnFor?: {points: readonly GridPoint[]; highlight: number | undefined; box: RationalBox};
    /** The visible area of the board as an exact box (rounded inward to integers and inset for the markers) once the view has changed; undefined = `frame`. */
    private followBox?: RationalBox;
    /** The board's view when it was created (board coordinates, so independent of the grid step); a view that returns to it draws the exact `frame` again, as the first draw does. */
    private startView?: readonly number[];
    /** The grid step the `followBox` was measured at; a box in grid units is stale once the step changes. */
    private followScale?: number;
    /** Capture-only: the view the scaled `followBox` was kept for after the clip's fine grid rescale; while the view stays there, that box stays (see `finerGridPatch`). */
    private keptFollowView?: readonly number[];
    private statsValue?: VoronoiDrawingStats;
    private constructionObjects: JXG.GeometryElement[] = [];
    private constructionDrawnFor?: {points: readonly GridPoint[]; site: number | null; count: number; scale: number; box?: RationalBox};
    private queryPoint?: JXG.Point;
    private inQuerySnap = false;
    /** Playback of the cell construction: Next step, Play and Reset move the bisector count; the count stays in the scene store. */
    private playback: TracePlayback;
    /** The Preset's site, count and query, handed from `importPreset` to the import it triggers and consumed once. */
    private carried?: {cellSite: unknown; construction: unknown; query: unknown; mode: unknown};
    private readonly siteLimit: number;
    /** A switch to four-point mode was refused because there are not exactly four sites; shown until the next edit or switch. */
    private modeRefused = false;

    constructor(options: PointSetOptions = {}, scheduler?: AnimationScheduler) {
        const siteLimit = options.pointLimit ?? VORONOI_MAX_POINTS;
        // The base checks adds against its options object, so `pointLimit` reads the live mode through this holder (set below).
        const holder: {graph?: VoronoiGraph} = {};
        super({...options, get pointLimit() { return holder.graph?.pointLimit ?? siteLimit; }});
        holder.graph = this;
        this.siteLimit = siteLimit;
        this.playback = new TracePlayback({
            runLength: () => this.constructionLength(),
            step: () => this.construction,
            writeStep: count => this.setConstruction(count),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => CONSTRUCTION_STEP_INTERVAL_MS,
        }, scheduler);
    }

    /** The positions of the construction: 0 to the number of bisectors of the chosen cell; 0 (nothing to step) without a chosen site. */
    private constructionLength(): number {
        const site = this.cellSite;
        return site === null ? 0 : bisectorOrder(this.model.points, site).length + 1;
    }

    get isPlaying(): boolean {
        return this.playback.isPlaying;
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The diagram, Delaunay triangulation and view box of the current points; recomputed only when the points change. */
    private derive(): Derived {
        const points = this.model.points;
        if (this.derivedMemo?.points === points) return this.derivedMemo;
        const outcome = voronoiFromDelaunay(points);
        const delaunay = outcome.ok && points.length >= 3 ? delaunayTriangulation(points) : undefined;
        const tri = delaunay?.ok ? delaunay.value : undefined;
        const box = outcome.ok && points.length >= 2 ? frame(outcome.value, points) : undefined;
        this.derivedMemo = {points, outcome, tri, box};
        return this.derivedMemo;
    }

    /** The box the diagram and the construction are clipped to: the board's visible area once it changed, else `frame`. */
    private drawBox(): RationalBox | undefined {
        const scale = 2 ** this.model.gridStepExponent;
        // A box measured at another grid step is stale (a scene replacement changes the step before the board is told): measure again.
        if (this.followBox && this.followScale !== scale && this.hasBoard) {
            this.followBox = this.measureFollow();
            this.followScale = scale;
        }
        return this.followBox ?? this.derive().box;
    }

    /** The diagram, or undefined while the sites allow none (fewer than two, or two that coincide). */
    diagram(): VoronoiDiagram | undefined {
        const {outcome} = this.derive();
        return outcome.ok && this.model.points.length >= 2 ? outcome.value : undefined;
    }

    /** The Delaunay triangulation shown by the duality overlay, if there is one. */
    delaunay(): Triangulation | undefined {
        return this.derive().tri;
    }

    /** What the last update of the drawing handle drew; undefined while nothing is drawn. */
    drawingStats(): VoronoiDrawingStats | undefined {
        return this.statsValue;
    }

    get cellSite(): number | null {
        return storedSite("cellSite" in this.state ? this.state.cellSite : undefined, this.model.points.length);
    }

    /** The number of bisectors shown for the chosen site. */
    get construction(): number {
        return this.cellSite === null ? 0 : storedCount("construction" in this.state ? this.state.construction : undefined, this.model.points.length - 1);
    }

    private get queryText(): VoronoiQuery {
        return storedQuery("query" in this.state ? this.state.query : undefined);
    }

    /** The query point (exact, grid units). */
    get query(): RationalPoint {
        const {x, y} = this.queryText;
        return new RationalPoint(parseRationalText(x) ?? Rational.ZERO, parseRationalText(y) ?? Rational.ZERO);
    }

    /** Every site at the least distance from the query point, ascending (more than one when it lies on a bisector). */
    queryNearest(): number[] {
        return nearestSites(this.model.points, this.query);
    }

    /** The region left after the shown bisectors of the chosen site, clipped to the view box; empty when none is chosen. */
    constructionPolygon(): RationalPoint[] {
        const site = this.cellSite;
        const box = this.drawBox();
        if (site === null || !box || !this.diagram()) return [];
        const points = this.model.points;
        return constructionRegion(points, site, bisectorOrder(points, site), this.construction, box);
    }

    /** The index in the Delaunay triangulation of the selected triangle, while the overlay is on and the triangle exists. */
    selectedTriangle(): number | undefined {
        const tri = this.delaunay();
        const chosen = this.selectedTriangleValue;
        if (!tri || !chosen || !this.overlayShown("delaunay")) return undefined;
        const index = tri.triangles.findIndex(corners => sameTriple(sortedTriple(corners), chosen));
        return index < 0 ? undefined : index;
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    override getInitialState(): VoronoiGraphState {
        return {...super.getInitialState(), overlays: {diagram: true}, cellSite: null, construction: 0, query: VORONOI_DEFAULT_QUERY, mode: this.defaultMode()};
    }

    /** The mode a fresh scene starts in; a subclass fixes it. */
    protected defaultMode(): VoronoiMode {
        return "sites";
    }

    /** The mode: `sites` unless the scene says `four-point`. */
    get mode(): VoronoiMode {
        return storedMode("mode" in this.state ? this.state.mode : undefined);
    }

    /** Exactly four sites in four-point mode, else the point-set limit. */
    override get pointLimit(): number {
        return this.mode === "four-point" ? FOUR_POINT_SITES : this.siteLimit;
    }

    /** Four-point mode keeps exactly four sites: removing one is refused (the panel says why). */
    override removeSelected(): boolean {
        return this.mode !== "four-point" && super.removeSelected();
    }

    override clear(): boolean {
        return this.mode !== "four-point" && super.clear();
    }

    /**
     * Switches the mode and keeps the sites. Four-point mode needs exactly four sites; with any other count the switch is
     * refused, the mode stays and the panel says how many sites there are. No site is ever moved, added or removed.
     */
    setMode(mode: VoronoiMode): boolean {
        if (!isVoronoiMode(mode)) return false;
        if (mode === "four-point" && this.model.points.length !== FOUR_POINT_SITES) {
            this.modeRefused = true;
            this.requestRender();
            return false;
        }
        this.modeRefused = false;
        if (mode !== this.mode) this.setState(this.patch({mode}));
        this.requestRender();
        return true;
    }

    private patch(fields: Partial<VoronoiGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /** Any write of a new model clears the chosen site, the count and the selected triangle (C1), unless the write names them. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const before = this.state.model;
        let named = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            named = "cellSite" in raw || "construction" in raw;
            const edit = raw.model !== undefined && raw.model !== state.model;
            return edit && !named ? this.patch({...raw, cellSite: null, construction: 0}) : raw;
        };
        super.setState(wrapped, callback);
        if (this.state.model !== before) {
            this.selectedTriangleValue = undefined;
            this.modeRefused = false;
        }
        // The playback does not exist yet while the base class is being constructed.
        this.playback?.settle(this.state.model !== before, named);
    }

    /** Chooses the site whose cell is constructed (null or an invalid index clears it); the count returns to 0. */
    selectSite(site: number | null): void {
        this.setState(this.patch({cellSite: storedSite(site, this.model.points.length), construction: 0}));
        this.requestRender();
    }

    private setConstruction(count: number): void {
        if (this.cellSite === null) return;
        this.setState(this.patch({construction: storedCount(count, this.model.points.length - 1)}));
        this.requestRender();
    }

    constructNext(): void { this.playback.nextStep(); }

    constructBack(): void { this.setConstruction(this.construction - 1); }

    constructReset(): void { this.playback.resetTrace(); }

    playPauseConstruction(): void { if (this.playback.isPlaying) this.playback.pause(); else this.playback.play(); }

    /** Places the query point at an exact position (grid units). False, and nothing changes, beyond the coordinate limit. */
    setQueryPoint(point: RationalPoint): boolean {
        const limit = Rational.fromInt(this.coordinateLimit);
        const inRange = (v: Rational) => v.compare(limit) <= 0 && v.compare(limit.neg()) >= 0;
        if (!inRange(point.x) || !inRange(point.y)) {
            return false;
        }
        this.setState(this.patch({query: {x: point.x.format(), y: point.y.format()}}));
        this.requestRender();
        return true;
    }

    /** The numeric alternative to dragging: typed integer, fraction or decimal. False when the text is not valid or is out of range. */
    setQueryText(x: string, y: string): boolean {
        const px = parseRationalText(x);
        const py = parseRationalText(y);
        return px !== undefined && py !== undefined && this.setQueryPoint(new RationalPoint(px, py));
    }

    /** Keyboard move of the query point by `steps` of half a grid unit in each direction. */
    moveQuery(dx: number, dy: number): boolean {
        const q = this.query;
        const step = (steps: number) => QUERY_STEP.mul(Rational.fromInt(steps));
        return this.setQueryPoint(new RationalPoint(q.x.add(step(dx)), q.y.add(step(dy))));
    }

    /** Selects the triangle at `index` of `delaunay().triangles` (the board click and the panel list), or clears the selection. */
    selectTriangle(index: number | undefined): void {
        const corners = index === undefined ? undefined : this.delaunay()?.triangles[index];
        this.selectedTriangleValue = corners && this.overlayShown("delaunay") ? sortedTriple(corners) : undefined;
        this.requestRender();
        this.syncScene();
    }

    /**
     * Lesson actions of this graph (any other point-set graph, including `DelaunayGraph`, throws `UnsupportedLessonActionError`
     * for the first three): `select-site` is the site button (`null` clears), `set-construction` sets how many bisectors of the
     * chosen site are shown (`'end'` is all of them), `set-query-point` places the query point on a quarter of a grid unit (`null`
     * returns it to its default) and `select-triangle` is the click on a triangle of the Delaunay overlay (`null` clears; the
     * overlay must be shown) and `set-mode` is the mode control (four-point needs exactly four sites). An out-of-range index or count, a position beyond the coordinate limit or off the quarter grid,
     * and a missing site or overlay are lesson-content errors that change nothing.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "select-site") {
            const site: unknown = action.site;
            const sites = this.model.points.length;
            if (site !== null && !(typeof site === "number" && Number.isInteger(site) && site >= 0 && site < sites)) {
                throw new Error(`point-set select-site: site must be null or an integer from 0 to ${String(sites - 1)}, got ${String(site)}.`);
            }
            this.selectSite(site);
            return;
        }
        if (action.operation === "set-construction") {
            const count: unknown = action.count;
            const site = this.cellSite;
            if (site === null) throw new Error("point-set set-construction: choose a site first (select-site).");
            const total = this.model.points.length - 1;
            if (count !== "end" && !(typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= total)) {
                throw new Error(`point-set set-construction: count must be "end" or an integer from 0 to ${String(total)} (the half-planes of this cell), got ${String(count)}.`);
            }
            this.setConstruction(count === "end" ? total : count);
            return;
        }
        if (action.operation === "set-query-point") {
            const point: unknown = action.point;
            if (point === null) {
                this.setQueryText(VORONOI_DEFAULT_QUERY.x, VORONOI_DEFAULT_QUERY.y);
                return;
            }
            const limit = this.coordinateLimit;
            const quarter = (v: unknown): v is number => typeof v === "number" && isFinite(v) && Math.abs(v) <= limit && Number.isInteger(v * QUERY_SNAP);
            if (!Array.isArray(point) || point.length !== 2 || !quarter(point[0]) || !quarter(point[1])) {
                throw new Error(`point-set set-query-point: point must be null or [x, y], each a multiple of 1/4 within ${String(limit)}, got ${JSON.stringify(point)}.`);
            }
            this.setQueryPoint(new RationalPoint(Rational.of(point[0] * QUERY_SNAP, QUERY_SNAP), Rational.of(point[1] * QUERY_SNAP, QUERY_SNAP)));
            return;
        }
        if (action.operation === "set-mode") {
            const mode: unknown = action.mode;
            if (!isVoronoiMode(mode)) throw new Error(`point-set set-mode: mode must be "sites" or "four-point", got ${String(mode)}.`);
            if (mode === "four-point" && this.model.points.length !== FOUR_POINT_SITES) {
                throw new Error(`point-set set-mode: four-point mode needs exactly ${String(FOUR_POINT_SITES)} sites, there are ${String(this.model.points.length)}.`);
            }
            this.setMode(mode);
            return;
        }
        if (action.operation === "select-triangle") {
            const index: unknown = action.triangle;
            if (index === null) {
                this.selectTriangle(undefined);
                return;
            }
            const count = this.delaunay()?.triangles.length ?? 0;
            if (!this.overlayShown("delaunay")) throw new Error("point-set select-triangle: show the delaunay overlay first (set-overlay).");
            if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= count) {
                throw new Error(`point-set select-triangle: triangle must be null or an integer from 0 to ${String(count - 1)} (the Delaunay triangles), got ${String(index)}.`);
            }
            this.selectTriangle(index);
            return;
        }
        super.applyPointSetAction(action);
    }

    /** The sites Reset example restores. */
    protected exampleModel(): PointSetModel {
        return VORONOI_EXAMPLE;
    }

    /** Restores the example, the overlay off, no selection, the starting query point and the default mode (C2). */
    resetExample(): void {
        this.importPresetData(serializePointSetModel(this.exampleModel()));
        this.selectedTriangleValue = undefined;
        this.modeRefused = false;
        this.setState(this.patch({overlays: {}, cellSite: null, construction: 0, query: VORONOI_DEFAULT_QUERY, mode: this.defaultMode()}));
        this.requestRender();
        this.syncScene();
    }

    /**
     * Host Fit shows the box of the drawing's `frame` (the sites and the diagram's vertices), not just the sites; the drawing follows
     * the new view like any other.
     */
    protected override fitView(_points: readonly [number, number][], width: number, height: number): [number, number, number, number] | undefined {
        return fitFrame(this.viewBox(), width, height);
    }

    /** The board's visible area as integer grid units (see `visibleGridBox`). */
    private visibleBox(): RationalBox | undefined {
        return visibleGridBox(this.board, 2 ** this.model.gridStepExponent);
    }

    /** The visible box the drawing follows, or undefined while the board shows its starting view (see `followedGridBox`). */
    private measureFollow(): RationalBox | undefined {
        return followedGridBox(this.board, 2 ** this.model.gridStepExponent, this.startView);
    }

    /** The drawing follows the view: a changed visible area re-clips the diagram and the construction through the same handles. */
    private followView(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        // Capture-only: after the fine grid rescale the kept box stands for as long as the view does not change; measuring it again at the finer step would round it differently and redraw the outer cells.
        const view = this.board.getBoundingBox();
        if (this.keptFollowView && this.followBox && view.every((v, i) => Math.abs(v - this.keptFollowView![i]) <= 1e-9 * Math.max(1, Math.abs(v)))) return;
        this.keptFollowView = undefined;
        const measured = this.visibleBox();
        const next = this.measureFollow();
        if (!next) {
            if (measured && this.followBox) {
                this.followBox = undefined;
                if ([this.syncDiagram(), this.syncConstruction()].some(Boolean)) this.boardUpdate();
            }
            return;
        }
        const current = this.followBox;
        if (!next || (current && this.followScale === 2 ** this.model.gridStepExponent && ["minX", "maxX", "minY", "maxY"].every(k => current[k as keyof RationalBox].equals(next[k as keyof RationalBox])))) return;
        this.followBox = next;
        this.followScale = 2 ** this.model.gridStepExponent;
        const changed = [this.syncDiagram(), this.syncConstruction()];
        if (changed.some(Boolean)) this.boardUpdate();
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.followBox = undefined;
        this.startView = [...this.board.getBoundingBox()];
        session.on("boundingbox", () => this.followView());
    }

    /** `frame` of the current diagram (or of the example when there is none) as a board box [left, top, right, bottom]. */
    private viewBox(): [number, number, number, number] {
        const derived = this.derive();
        const box = derived.box ?? frame(voronoiExample().diagram, VORONOI_EXAMPLE.points);
        return boardFrameOf(box, this.model.gridStepExponent);
    }

    /** A new board and a reload start on the example's `frame`, never on the sites of the scene being replaced. */
    protected override initialView(): [number, number, number, number] {
        const example = this.exampleModel();
        const outcome = voronoiFromDelaunay(example.points);
        const box = outcome.ok && example.points.length >= 2 ? frame(outcome.value, example.points) : frame(voronoiExample().diagram, VORONOI_EXAMPLE.points);
        const scale = 2 ** example.gridStepExponent;
        return [box.minX.toNumber() * scale, box.maxY.toNumber() * scale, box.maxX.toNumber() * scale, box.minY.toNumber() * scale];
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds(): readonly ("delaunay" | "diagram" | "grid")[] {
        return VORONOI_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "delaunay" | "diagram" | "grid"): string {
        return id === "delaunay" ? t("vor_overlay_delaunay") : id === "diagram" ? t("vor_overlay_diagram") : super.overlayLabel(id);
    }

    override setOverlay(id: "delaunay" | "diagram" | "grid", shown: boolean): void {
        super.setOverlay(id, shown);
        if (id === "delaunay" && !shown && this.selectedTriangleValue) {
            this.selectedTriangleValue = undefined;
            this.requestRender();
            this.syncScene();
        }
    }

    /** The overlay follows the selected triangle as well as the points and the switches. */
    protected override overlayInputs(): unknown {
        const base = super.overlayInputs();
        const triangle = String(this.selectedTriangle() ?? "");
        const memo = this.overlayMemo;
        if (memo && memo.base === base && memo.triangle === triangle) return memo;
        this.overlayMemo = {base, triangle};
        return this.overlayMemo;
    }

    protected override drawOverlay(id: "delaunay" | "diagram" | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "diagram") return []; // the diagram is drawn by its own handle (`syncDiagram`), the switch only gates it
        if (id !== "delaunay") return super.drawOverlay(id, model);
        const tri = this.delaunay();
        if (!tri) return [];
        const at = (index: number) => gridToBoard(tri.points[index], model.gridStepExponent);
        const objects: JXG.GeometryElement[] = [];
        // Hull edges are thick and solid, interior edges thin and dashed: told apart without colour.
        for (const edge of triangulationEdges(tri)) {
            const from = at(edge.a);
            const to = at(edge.b);
            objects.push(this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name: edge.interior ? "voronoi-delaunay-interior" : "voronoi-delaunay-hull", highlight: false, fixed: true, layer: 3,
                strokeColor: GraphPalette.constructionAccent, strokeWidth: edge.interior ? 1.5 : 4.5, dash: edge.interior ? 3 : 0,
            }) as JXG.GeometryElement);
        }
        objects.push(...drawSelectableTriangles(this.board, tri, model, this.selectedTriangle(), NAMES,
            index => this.afterBoardPress(() => this.selectTriangle(this.selectedTriangle() === index ? undefined : index))));
        const selected = this.selectedTriangle();
        const corners = selected === undefined ? undefined : tri.triangles[selected];
        const centre = corners && circumcentre(tri.points[corners[0]], tri.points[corners[1]], tri.points[corners[2]]);
        if (centre?.kind === "point") {
            const scale = 2 ** model.gridStepExponent;
            objects.push(this.board.create("point", [centre.point.x.toNumber() * scale, centre.point.y.toNumber() * scale], {
                name: "voronoi-selected-vertex", withLabel: false, size: 9, face: "square", fixed: true, showInfobox: false, highlight: false,
                fillColor: GraphPalette.warningText, strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 2, layer: 8,
            }) as JXG.GeometryElement);
        }
        return objects;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The sites and overlays (base), then the diagram, the construction and the query point. */
    protected override syncScene(): void {
        super.syncScene();
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const changed = [this.syncDiagram(), this.syncConstruction(), this.syncQuery()];
        if (changed.some(Boolean)) this.boardUpdate();
    }

    private removeOwned(objects: readonly JXG.GeometryElement[]): void {
        if (!this.hasBoard) return;
        const list = this.board.objectsList as unknown[];
        const present = objects.filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
    }

    /** Redraws the diagram through the reused handle when the points or the highlighted cell changed. */
    private syncDiagram(): boolean {
        const points = this.model.points;
        const diagram = this.diagram();
        const box = this.drawBox();
        const scale = 2 ** this.model.gridStepExponent;
        if (!diagram || !box || !this.overlayShown("diagram")) return this.disposeDiagram();
        if (this.drawing && this.drawing.scale !== scale) this.disposeDiagram();
        const highlight = this.queryNearest()[0];
        const drawn = this.drawnFor;
        if (this.drawing && drawn?.points === points && drawn.highlight === highlight && drawn.box === box && this.diagramObjectsAlive()) return false;
        this.drawing ??= {handle: createVoronoiDrawing(this.board, scale), scale};
        this.statsValue = this.drawing.handle.update(diagram, points, box, {cells: true, edges: true, vertices: true, highlightCell: highlight});
        this.drawnFor = {points, highlight, box};
        return true;
    }

    private diagramObjectsAlive(): boolean {
        // The drawing owns its objects; a cleared board (scene replacement) leaves the handle pointing at removed ones.
        return this.board.objectsList.some(object => (object as {name?: string}).name === "voronoi-cell" || (object as {name?: string}).name === "voronoi-edges");
    }

    private disposeDiagram(): boolean {
        const had = this.drawing !== undefined;
        this.drawing?.handle.dispose();
        this.drawing = undefined;
        this.drawnFor = undefined;
        this.statsValue = undefined;
        return had;
    }

    /** The shown bisectors of the chosen site (dashed, the latest thicker) and the region that remains. */
    private syncConstruction(): boolean {
        const points = this.model.points;
        const site = this.diagram() ? this.cellSite : null;
        const count = this.construction;
        const scale = 2 ** this.model.gridStepExponent;
        const drawn = this.constructionDrawnFor;
        const alive = this.constructionObjects.every(object => (this.board.objectsList as unknown[]).includes(object));
        if (drawn && drawn.points === points && drawn.site === site && drawn.count === count && drawn.scale === scale && drawn.box === this.drawBox() && alive) return false;
        this.removeOwned(this.constructionObjects);
        this.constructionObjects = [];
        this.constructionDrawnFor = {points, site, count, scale, box: this.drawBox()};
        const box = this.drawBox();
        if (site === null || !box) return true;
        // A ring round the chosen site: told apart from the other sites by shape, already at count 0.
        this.constructionObjects.push(this.board.create("point", [points[site].x * scale, points[site].y * scale], {
            name: "voronoi-chosen-site", withLabel: false, face: "circle", size: 12, fixed: true, showInfobox: false, highlight: false,
            fillOpacity: 0, highlightFillOpacity: 0, strokeColor: GraphPalette.warningText, strokeWidth: 3, layer: 5,
        }) as JXG.GeometryElement);
        const order = bisectorOrder(points, site);
        const half = Rational.of(1, 2);
        order.slice(0, count).forEach((other, k) => {
            const s = points[site];
            const o = points[other];
            const middle = new RationalPoint(Rational.of(s.x + o.x).mul(half), Rational.of(s.y + o.y).mul(half));
            const direction = new RationalPoint(Rational.fromInt(-(o.y - s.y)), Rational.fromInt(o.x - s.x));
            const piece = clipToBox(middle, direction, undefined, undefined, box);
            if (!piece) return;
            const latest = k === count - 1;
            this.constructionObjects.push(this.board.create("curve", [
                [piece[0].x.toNumber() * scale, piece[1].x.toNumber() * scale], [piece[0].y.toNumber() * scale, piece[1].y.toNumber() * scale],
            ], {
                name: latest ? "voronoi-bisector-latest" : "voronoi-bisector", highlight: false, fixed: true, layer: 3,
                strokeColor: GraphPalette.warningText, strokeWidth: latest ? 4 : 1.5, dash: latest ? 0 : 2,
            }) as JXG.GeometryElement);
        });
        const region = this.constructionPolygon();
        if (region.length >= 3) {
            const xs = region.map(p => p.x.toNumber() * scale);
            const ys = region.map(p => p.y.toNumber() * scale);
            this.constructionObjects.push(this.board.create("curve", [[...xs, xs[0]], [...ys, ys[0]]], {
                name: "voronoi-construction-region", highlight: false, fixed: true, layer: 1,
                fillColor: voronoiCellFill(site), fillOpacity: 0.5,
                strokeColor: CompgeoRegionPalette.highlightedCellBoundary, strokeWidth: 2.5,
            }) as JXG.GeometryElement);
        }
        return true;
    }

    /** The query point: created once, moved with the state, removed with the scene. */
    private syncQuery(): boolean {
        const scale = 2 ** this.model.gridStepExponent;
        const q = this.query;
        const target = [q.x.toNumber() * scale, q.y.toNumber() * scale];
        let point = this.queryPoint;
        if (point && !(this.board.objectsList as unknown[]).includes(point)) point = this.queryPoint = undefined;
        if (!point) {
            const created = this.board.create("point", target, {
                name: "voronoi-query", withLabel: false, size: 6, face: "square", showInfobox: false,
                fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 2, layer: 9,
                // Capture-only: the pointer-down highlight would change the marker's fill and outline in one frame step; the clip keeps its look.
                ...(this.clipCapture() ? {highlightFillColor: GraphPalette.derivedPoint, highlightStrokeColor: GraphPalette.selectedControlPointOutline} : {}),
            }) as JXG.Point;
            created.on("drag", () => this.dragQuery(created));
            this.queryPoint = created;
            return true;
        }
        if (point.X() === target[0] && point.Y() === target[1]) return false;
        // Capture-only: on the clip's fine grid the marker stays under the pointer, as the sites do; only the stored query is snapped.
        if (this.onClipFineGrid()) return true;
        this.inQuerySnap = true;
        try { point.moveTo(target, 0); } finally { this.inQuerySnap = false; }
        return true;
    }

    /**
     * Capture-only: the query point and the followed drawing box are in grid units, so they scale with the sites and stay where they
     * were on the board; the box is kept for the current view, because measuring it again at the finer step rounds it differently and redraws the outer cells.
     */
    protected override finerGridPatch(factor: number): Partial<PointSetGraphState> {
        const scale = Rational.fromInt(factor);
        const box = this.followBox;
        if (box && this.followScale !== undefined) {
            this.followBox = {minX: box.minX.mul(scale), maxX: box.maxX.mul(scale), minY: box.minY.mul(scale), maxY: box.maxY.mul(scale)};
            this.followScale = this.followScale / factor;
            this.keptFollowView = [...this.board.getBoundingBox()];
        }
        const q = this.query;
        return this.patch({query: {x: q.x.mul(scale).format(), y: q.y.mul(scale).format()}});
    }

    private dragQuery(point: JXG.Point): void {
        if (this.inQuerySnap || this.graphInteractionLocked) return;
        this.applyClipFineGrid();
        const scale = 2 ** this.model.gridStepExponent;
        const snap = (v: number) => Rational.of(Math.round((v / scale) * QUERY_SNAP), QUERY_SNAP);
        const wanted = new RationalPoint(snap(point.X()), snap(point.Y()));
        if (!this.setQueryPoint(wanted)) {
            // Beyond the coordinate limit: the point returns to its stored place.
            const q = this.query;
            this.inQuerySnap = true;
            try { point.moveTo([q.x.toNumber() * scale, q.y.toNumber() * scale], 0); } finally { this.inQuerySnap = false; }
        }
    }

    /** Removes the drawing, the construction and the query point; the next sync rebuilds them. */
    protected override beforeFigureCapture(): void {
        this.playback.pause();
    }

    protected override disposeFigureScene(): void {
        this.playback?.halt();
        this.disposeOwned();
        this.selectedTriangleValue = undefined;
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        this.playback?.halt();
        this.selectedTriangleValue = undefined;
        super.syncReplacedScene();
    }

    private disposeOwned(): void {
        this.disposeDiagram();
        this.removeOwned(this.constructionObjects);
        this.constructionObjects = [];
        this.constructionDrawnFor = undefined;
        if (this.queryPoint) this.removeOwned([this.queryPoint]);
        this.queryPoint = undefined;
    }

    /** The handle must go before the board is freed: disposing removes its objects from that board. */
    override mount(container: HTMLElement): void {
        this.playback.mount();
        super.mount(container);
    }

    override unmount(): void {
        this.playback.unmount();
        this.disposeOwned();
        this.overlayMemo = undefined;
        super.unmount();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return voronoiCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(VORONOI_EXAMPLE);
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: VoronoiGraphState = {...super.sceneGraphState(), cellSite: this.cellSite, construction: this.construction, query: this.queryText, mode: this.mode};
        return state;
    }

    /** A Preset that names no site, count or query starts without them: nothing stale survives from the previous scene. */
    override importPreset(preset: Preset): void {
        const graphState = preset.graphState && {cellSite: null, construction: 0, query: VORONOI_DEFAULT_QUERY, mode: "sites", ...preset.graphState};
        this.carried = graphState && {cellSite: graphState.cellSite, construction: graphState.construction, query: graphState.query, mode: graphState.mode};
        try {
            super.importPreset(graphState ? {...preset, graphState} : preset);
        } finally {
            this.carried = undefined;
        }
    }

    /** An imported model takes the site, count and query that `importPreset` handed over, clamped to the new points; a bare import has none. */
    override importPresetData(data: PointSetModel): void {
        const raw: {cellSite?: unknown; construction?: unknown; query?: unknown; mode?: unknown} = this.carried
            ?? {cellSite: null, construction: 0, query: VORONOI_DEFAULT_QUERY, mode: this.mode};
        this.carried = undefined;
        super.importPresetData(data);
        const sites = this.model.points.length;
        const site = storedSite(raw.cellSite, sites);
        // Backward compatibility: a four-point Preset with a site count other than 4 loads in `sites` mode. Four-point mode needs exactly four sites; otherwise the sites stay as imported and the mode falls back to `sites`.
        const mode = storedMode(raw.mode) === "four-point" && sites === FOUR_POINT_SITES ? "four-point" : "sites";
        this.modeRefused = false;
        this.setState(this.patch({cellSite: site, construction: site === null ? 0 : storedCount(raw.construction, sites - 1), query: storedQuery(raw.query), mode}));
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const sites = merged.model.points.length;
        const site = storedSite("cellSite" in merged ? merged.cellSite : undefined, sites);
        const state: VoronoiGraphState = {
            ...merged, cellSite: site,
            construction: site === null ? 0 : storedCount("construction" in merged ? merged.construction : undefined, sites - 1),
            query: storedQuery("query" in merged ? merged.query : undefined),
            mode: storedMode("mode" in merged ? merged.mode : undefined) === "four-point" && sites === FOUR_POINT_SITES ? "four-point" : "sites",
        };
        return state;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly voronoiActions: VoronoiControlActions = {
        resetExample: () => this.resetExample(),
        selectSite: site => this.selectSite(site),
        constructNext: () => this.constructNext(),
        constructBack: () => this.constructBack(),
        constructReset: () => this.constructReset(),
        constructPlayPause: () => this.playPauseConstruction(),
        setQuery: (x, y) => { this.setQueryPoint(new RationalPoint(Rational.of(Math.round(x * QUERY_SNAP), QUERY_SNAP), Rational.of(Math.round(y * QUERY_SNAP), QUERY_SNAP))); },
        moveQuery: (dx, dy) => { this.moveQuery(dx, dy); },
        selectTriangle: index => this.selectTriangle(index),
        setMode: mode => { this.setMode(mode); },
        loadExample: id => this.loadExample(id),
    };

    /** Whether the panel offers the mode switch; only the degenerate-sites graph does. */
    protected showsModeSwitch(): boolean {
        return false;
    }

    /** The named examples the panel offers (none here); a subclass lists them and loads one by id. */
    protected exampleIds(): readonly VoronoiExampleId[] {
        return [];
    }

    /** The named example the sites show now, or undefined for a custom set (none here). */
    protected currentExampleId(): VoronoiExampleId | undefined {
        return undefined;
    }

    protected loadExample(_id: VoronoiExampleId): void {
        // no examples in the base graph
    }

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    /** Whether the scene already is what Reset example restores: the example's sites, no triangle or cell chosen, the starting query point and mode, and every overlay at the value `overlays: {}` yields (its initial one). */
    private atExample(): boolean {
        const query = this.queryText;
        const initial = this.getInitialState().overlays;
        return matchingExample(this.model, [{id: "example", ...this.exampleModel()}]) !== undefined
            && this.overlayIds().every(id => this.overlayShown(id) === (initial[id] === true))
            && this.cellSite === null && this.construction === 0 && this.selectedTriangleValue === undefined && this.mode === this.defaultMode()
            && query.x === VORONOI_DEFAULT_QUERY.x && query.y === VORONOI_DEFAULT_QUERY.y;
    }

    private status(): VoronoiStatus {
        const points = this.model.points;
        const {outcome} = this.derive();
        const diagram = this.diagram();
        const query = this.queryText;
        const base = {
            collinear: false,
            counts: {sites: points.length, vertices: 0, finite: 0, rays: 0, lines: 0, bounded: 0, unbounded: 0},
            vertices: [], cellSite: null,
            query: {x: query.x, y: query.y, value: [this.query.x.toNumber(), this.query.y.toNumber()] as const, nearest: this.queryNearest()},
            coordinateLimit: this.coordinateLimit, overlayShown: this.overlayShown("delaunay"), diagramShown: this.overlayShown("diagram"), triangles: [],
            mode: this.mode, modeSwitch: this.showsModeSwitch(), modeRefused: this.modeRefused, atExample: this.atExample(), examples: this.exampleIds(), exampleId: this.currentExampleId(),
        } satisfies VoronoiStatus;
        if (!diagram) {
            const duplicate = !outcome.ok && outcome.refusal.kind === "duplicate-point" ? outcome.refusal.indices : undefined;
            return {...base, refusal: duplicate ? {kind: "duplicate", sites: duplicate} : {kind: "few"}};
        }
        const dual = dualEdges(diagram);
        const rays = diagram.edges.filter(edge => edge.kind === "ray").length;
        const lines = diagram.edges.filter(edge => edge.kind === "line").length;
        const bounded = diagram.cells.filter(cell => cell.bounded).length;
        const tri = this.delaunay();
        const site = this.cellSite;
        const count = this.construction;
        const order = site === null ? [] : bisectorOrder(points, site);
        const selectedIndex = this.selectedTriangle();
        const corners = selectedIndex === undefined ? undefined : tri?.triangles[selectedIndex];
        const centre = corners && circumcentre(points[corners[0]], points[corners[1]], points[corners[2]]);
        const vertex = centre?.kind === "point" ? diagram.vertices.find(v => v.point.equals(centre.point)) : undefined;
        return {
            ...base,
            collinear: tri === undefined,
            fourPoint: this.mode === "four-point" ? fourPointReadout(points, diagram) : undefined,
            counts: {sites: points.length, vertices: diagram.vertices.length, finite: dual.finite.length, rays, lines, bounded, unbounded: points.length - bounded},
            vertices: diagram.vertices.map(v => ({x: v.point.x.format(), y: v.point.y.format(), sites: v.sites})),
            cellSite: site,
            construction: site === null ? undefined : {count, total: order.length, other: count > 0 ? order[count - 1] : undefined, done: order.length > 0 && count === order.length},
            triangles: tri?.triangles ?? [],
            selectedTriangle: selectedIndex,
            selectedVertex: corners && centre?.kind === "point" && vertex
                ? {corners: sortedTriple(corners), x: centre.point.x.format(), y: centre.point.y.format(), sites: vertex.sites}
                : undefined,
        };
    }

    protected override workspaceEdit(): React.ReactNode {
        const status = this.status();
        return <>
            <VoronoiControls status={status} actions={this.voronoiActions} playing={this.playback.isPlaying}/>
            {super.workspaceEdit()}
            <VoronoiTriangles status={status} actions={this.voronoiActions}/>
        </>;
    }
}

/** The B4 example's diagram, for the view of a graph that has no diagram of its own yet. */
function voronoiExample(): {diagram: VoronoiDiagram} {
    const outcome = voronoiFromDelaunay(VORONOI_EXAMPLE.points);
    if (!outcome.ok) throw new Error("internal error: the Voronoi example has no diagram");
    return {diagram: outcome.value};
}
