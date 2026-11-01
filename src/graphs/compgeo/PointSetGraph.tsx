import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {LessonAction, UnsupportedLessonActionError} from "../../learning/model";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {GRID_COORD_LIMIT, GridPoint} from "../../compgeo/grid";
import {
    addInterval, addPoint, addSegment, clearPoints, DEFAULT_INTERVAL_LIMIT, DEFAULT_POINT_LIMIT, DEFAULT_SEGMENT_LIMIT, EMPTY_POINT_SET_MODEL, gridToBoard,
    intervalLetter, intervalRow, movePoint, nudgePoint, removeInterval,
    PointSetEditResult, PointSetMode, PointSetModel, PointSetOptions, removePoint, removeSegment, segmentsOf, serializePointSetModel, setClosed,
    parsePointSetModel, POINT_SET_OVERLAY_NAMES, setMode, snapToGrid,
} from "../../compgeo/pointSetModel";
import {polygonSimplicity, PolygonSimplicity} from "../../compgeo/predicates";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";
import {pointSetPresetCollection} from "./pointSetPresetCollection";
import {PointSetControlActions, PointSetControls, PointSetNotice} from "./PointSetControls";

/**
 * The shared point-set/polygon graph (spec convexity-hulls-lessons section 2, ADR 0021). It draws a `PointSetModel` on a
 * JSXGraph board and edits it; the scene store holds the model, so the board is always a function of the state.
 *
 * Public interface (everything else is private or a documented extension point):
 * - `new PointSetGraph(options?)`: `options.pointLimit` (default 40; the sweep family passes 12).
 * - Reads: `model`, `selectedIndex`, `isAddMode`, `simplicity()` (polygon mode only), `pointLimit`, `segmentLimit`, `intervalLimit`, `pendingEndpoint`.
 * - Intervals mode (opt-in like segments: a subclass overrides `allowsIntervals()`): `model.points` holds the endpoints as pairs, both
 *   endpoints of interval k on the row y = k + 1, rewritten by every edit (only x is editable; vertical drag and arrow keys do
 *   nothing). `addIntervalAt(a, b)`, `addDefaultInterval()` (keyboard), `removeIntervalAt(k)`; `options.intervalLimit` (default 10).
 *   Board objects: one horizontal JSXGraph segment per interval, its two endpoints and a text a, b, c, ... above it. Add mode
 *   works like segments: the first click places the pending left end, the second adds the interval.
 * - Edits (each is one synchronous scene write that returns whether it applied; a refusal sets a visible notice and
 *   changes nothing): `addPointAt(gridPoint)`, `addPointAtBoard(x, y)`, `movePointTo(i, gridPoint)`, `nudgeSelected(dx, dy)`,
 *   `removeSelected()`, `clear()`, `setPointSetMode(mode)`, `setPolygonClosed(closed)`, `loadModel(model)`.
 * - Segments mode (opt-in: a subclass overrides `allowsSegments()` to return true; the convexity graphs do not, so for them
 *   `setPointSetMode('segments')` is refused and a Preset in that mode is rejected): `model.points` holds the endpoints as pairs
 *   (p[2k], p[2k+1]) of segment s_(k+1); `addSegmentAt(a, b)`, `addDefaultSegment()` (a short horizontal segment near the
 *   origin for keyboard users), `removeSegmentAt(k)`. `removeSelected()` removes the selected endpoint's segment, and the
 *   selected endpoint's segment is highlighted. `options.segmentLimit` (default 12) and `options.coordinateLimit` (default the
 *   grid limit; the sweep family passes 2^10) bound edits and imports; nothing is clipped. In Add mode the first click sets
 *   `pendingEndpoint` (transient, not stored, cleared by Escape, Add mode off, a mode change, `loadModel` and a Preset replacement)
 *   and the second click adds the segment. Board objects: one JSXGraph segment per model segment and a text `s<k>` at its midpoint.
 * - Transient UI state (not stored in Presets; captured in checkpoints): `select(i | undefined)`, `setAddMode(on)`.
 * - Overlays: `setOverlay(id, shown)` and `overlayShown(id)`; shown ids live in the scene state (`state.overlays`) and
 *   in the Preset's `graphState.overlays`. Only `"grid"` exists now.
 * - Presets: `presetCollection()` (key `compgeo-point-set`), data is a `PointSetModel` checked by `parsePointSetModel`.
 *
 * Interaction: points are snapped to the grid on every drag move. A click on empty board adds a point only in Add mode, so
 * touch panning and dragging never add points. The board container is focusable: arrow keys move the selected point by one
 * grid step, Delete/Backspace removes it. The inspector offers the same actions without a pointer (numeric list, Add point).
 *
 * Overlay extension point (hull, turns, ray, trace in later lessons): a subclass `class HullGraph extends PointSetGraph<"hull">`
 * overrides `overlayIds()` to list its ids (spread `super.overlayIds()`), `overlayLabel(id)` for the switch text, and
 * `drawOverlay(id, model)` to create the board objects of an overlay from the current model (fall through to `super` for
 * `"grid"`). A subclass whose overlays also depend on other state overrides `overlayInputs()` (see its comment). The base calls `drawOverlay` for each shown id after every change of the model or of the shown set, owns the
 * returned objects and removes them before the next call, on scene replacement and on unmount. Create objects with fixed
 * data from `model` (not live point references), because they are rebuilt per change, not per frame.
 *
 * Lesson actions: `registerLessonActions` handles the `point-set` kind (`applyPointSetAction`). `set-points` replaces the
 * model through `parsePointSetModel` with this graph's limits and throws on any rejection (never snaps or clips);
 * `set-overlay` throws `UnsupportedLessonActionError` for an overlay this graph does not own. Subclasses inherit both.
 */
export type PointSetBaseOverlayId = "grid";

export interface PointSetGraphState extends BaseGraphState {
    model: PointSetModel;
    /** Shown overlays by id; an absent id is hidden. */
    overlays: Readonly<Record<string, boolean | undefined>>;
}

export const POINT_SET_PRESET_KEY = "compgeo-point-set";

/** Example points shown by a fresh graph: five points in general position, so every mode starts with something to move. */
export const DEFAULT_POINT_SET_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0,
    points: [{x: -3, y: -2}, {x: -1, y: 3}, {x: 2, y: 1}, {x: 3, y: -2}, {x: 0, y: -1}],
};

interface DrawnScene {
    readonly key: string;
    readonly points: readonly JXG.Point[];
    readonly edges: readonly JXG.GeometryElement[];
    /** Segments mode: one text per segment, at its midpoint. */
    readonly labels: readonly JXG.GeometryElement[];
}

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

export class PointSetGraph<Overlay extends string = never> extends BaseGraph<PointSetGraphState, PointSetModel> {
    private drawn?: DrawnScene;
    private overlayObjects: JXG.GeometryElement[] = [];
    private overlaysDrawnFor?: {model: PointSetModel; overlays: unknown; extra: unknown};
    private inDragSnap = false;
    private selected?: number;
    private addModeOn = false;
    private pending?: GridPoint;
    private pendingObjects: JXG.GeometryElement[] = [];
    private pendingDrawnFor?: {pending: GridPoint | undefined; exponent: number};
    private noticeValue?: PointSetNotice;

    constructor(private readonly options: PointSetOptions = {}) {
        super();
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get model(): PointSetModel {
        return this.state.model;
    }

    get pointLimit(): number {
        return this.options.pointLimit ?? DEFAULT_POINT_LIMIT;
    }

    /** Segments mode: the placed first endpoint of a segment that waits for its second click. */
    get pendingEndpoint(): GridPoint | undefined {
        return this.pending;
    }

    get segmentLimit(): number {
        return this.options.segmentLimit ?? DEFAULT_SEGMENT_LIMIT;
    }

    get intervalLimit(): number {
        return this.options.intervalLimit ?? DEFAULT_INTERVAL_LIMIT;
    }

    get coordinateLimit(): number {
        return this.options.coordinateLimit ?? GRID_COORD_LIMIT;
    }

    get selectedIndex(): number | undefined {
        return this.selected;
    }

    get isAddMode(): boolean {
        return this.addModeOn;
    }

    get notice(): PointSetNotice | undefined {
        return this.noticeValue;
    }

    /** Exact simplicity of the polygon or polyline; undefined in points mode. */
    simplicity(): PolygonSimplicity | undefined {
        const model = this.model;
        if (model.mode !== "polygon") return undefined;
        return polygonSimplicity(model.points, model.closed);
    }

    override getInitialState(): PointSetGraphState {
        return {initialized: false, model: EMPTY_POINT_SET_MODEL, overlays: {}};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    /** Applies an edit result: commits the model, or shows why nothing changed. */
    private apply(result: PointSetEditResult): boolean {
        if (result.ok) {
            this.noticeValue = undefined;
            this.setState({model: result.model});
            this.requestRender();
            return true;
        }
        if (result.reason === "limit" || result.reason === "range") {
            this.noticeValue = {kind: result.reason === "limit" ? this.limitNoticeKind() : result.reason};
            this.requestRender();
        }
        return false;
    }

    private limitNoticeKind(): "limit" | "segment-limit" | "interval-limit" {
        return this.model.mode === "segments" ? "segment-limit" : this.model.mode === "intervals" ? "interval-limit" : "limit";
    }

    addPointAt(point: GridPoint): boolean {
        const added = this.apply(addPoint(this.model, point, this.options));
        if (added) this.selected = this.model.points.length - 1;
        return added;
    }

    /** Adds the grid point nearest to a board position. */
    addPointAtBoard(x: number, y: number): boolean {
        return this.addPointAt(snapToGrid(x, y, this.model.gridStepExponent));
    }

    /** Segments mode: adds the segment (a, b) and selects its second endpoint. */
    addSegmentAt(a: GridPoint, b: GridPoint): boolean {
        const added = this.apply(addSegment(this.model, a, b, this.options));
        if (added) this.selected = this.model.points.length - 1;
        return added;
    }

    /** Segments mode, for keyboard users: a horizontal segment of two grid steps near the origin, shifted up or down per segment. */
    addDefaultSegment(): boolean {
        const y = (segmentsOf(this.model).length % 5) - 2;
        return this.addSegmentAt({x: -1, y}, {x: 1, y});
    }

    /** Intervals mode: adds the interval with ends at x = a and x = b on the next row and selects its second endpoint. */
    addIntervalAt(a: number, b: number): boolean {
        const added = this.apply(addInterval(this.model, a, b, this.options));
        if (added) this.selected = this.model.points.length - 1;
        return added;
    }

    /** Intervals mode, for keyboard users: an interval of length four near the origin, shifted right per interval. */
    addDefaultInterval(): boolean {
        const lo = ((this.model.points.length >> 1) % 5) * 2 - 4;
        return this.addIntervalAt(lo, lo + 4);
    }

    removeIntervalAt(k: number): boolean {
        const removed = this.apply(removeInterval(this.model, k));
        if (removed) this.selected = undefined;
        return removed;
    }

    removeSegmentAt(k: number): boolean {
        const removed = this.apply(removeSegment(this.model, k));
        if (removed) this.selected = undefined;
        return removed;
    }

    movePointTo(index: number, point: GridPoint): boolean {
        return this.apply(movePoint(this.model, index, point, this.options));
    }

    nudgeSelected(dx: number, dy: number): boolean {
        // An interval endpoint moves along x only; a vertical key changes nothing (and shows no notice).
        if (this.model.mode === "intervals" && dx === 0) return false;
        return this.selected !== undefined && this.apply(nudgePoint(this.model, this.selected, dx, dy, this.options));
    }

    removeSelected(): boolean {
        const index = this.selected;
        if (index === undefined) return false;
        const removed = this.apply(removePoint(this.model, index));
        if (removed) {
            if (this.model.mode === "segments" || this.model.mode === "intervals") this.selected = undefined;
            else this.selected = this.model.points.length === 0 ? undefined : Math.min(index, this.model.points.length - 1);
        }
        return removed;
    }

    clear(): boolean {
        this.selected = undefined;
        this.pending = undefined;
        return this.apply({ok: true, model: clearPoints(this.model)});
    }

    /** Segments mode is refused (nothing changes) unless the subclass allows it. */
    setPointSetMode(mode: PointSetMode): boolean {
        if (mode === "segments" && !this.allowsSegments()) return false;
        if (mode === "intervals" && !this.allowsIntervals()) return false;
        this.pending = undefined;
        const next = setMode(this.model, mode);
        if (next.mode === "segments" && next.points.length > 2 * this.segmentLimit) {
            this.noticeValue = {kind: "segment-limit"};
            this.requestRender();
            return false;
        }
        if (next.mode === "intervals" && next.points.length > 2 * this.intervalLimit) {
            this.noticeValue = {kind: "interval-limit"};
            this.requestRender();
            return false;
        }
        if (next.mode === "intervals" && next.points.some(p => Math.abs(p.x) > this.coordinateLimit || Math.abs(p.y) > this.coordinateLimit)) {
            this.noticeValue = {kind: "range"};
            this.requestRender();
            return false;
        }
        const paired = (m: PointSetMode) => m === "segments" || m === "intervals";
        if (paired(mode) || paired(this.model.mode)) this.selected = undefined;
        return this.apply({ok: true, model: next});
    }

    setPolygonClosed(closed: boolean): boolean {
        return this.apply(setClosed(this.model, closed));
    }

    /** Replaces the whole model (an example or a validated import); the caller has validated it with `parsePointSetModel`. */
    loadModel(model: PointSetModel): void {
        this.selected = undefined;
        this.pending = undefined;
        this.noticeValue = undefined;
        this.setState({model: serializePointSetModel(model)});
        this.requestRender();
    }

    /** One `point-set` scene action; a rejected value is a lesson-content error and changes nothing. */
    applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        // The types are compile-time only and lesson content may be hand-written data, so the payload is re-checked.
        const payload = action as unknown as Record<string, unknown>;
        if (action.operation === "set-points") {
            const raw = payload.points;
            if (!Array.isArray(raw) || !raw.every(p => Array.isArray(p) && p.length === 2)) throw new Error("point-set set-points: points must be a list of [x, y] pairs.");
            const model = parsePointSetModel({
                mode: action.mode, closed: action.closed, gridStepExponent: 0,
                points: (raw as readonly (readonly unknown[])[]).map(([x, y]) => ({x, y})),
            }, {pointLimit: this.pointLimit, coordinateLimit: this.coordinateLimit});
            if (!model.ok) throw new Error(`point-set set-points: rejected (${model.reason}${model.limit !== undefined ? `, limit ${model.limit}` : ""}${model.bound !== undefined ? `, bound ${model.bound}` : ""}).`);
            this.loadModel(model.model);
            return;
        }
        if (action.operation === "set-overlay") {
            const id = payload.overlay;
            if (typeof payload.visible !== "boolean") throw new Error("point-set set-overlay: visible must be a boolean.");
            const owned = (POINT_SET_OVERLAY_NAMES as readonly unknown[]).includes(id) && (this.overlayIds() as readonly unknown[]).includes(id);
            if (!owned) throw new UnsupportedLessonActionError(action);
            this.setOverlay(id as Overlay | PointSetBaseOverlayId, action.visible);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("point-set", action => this.applyPointSetAction(action));
    }

    select(index: number | undefined): void {
        const valid = index !== undefined && Number.isInteger(index) && index >= 0 && index < this.model.points.length;
        this.selected = valid ? index : undefined;
        this.requestRender();
        this.boardUpdate();
    }

    setAddMode(on: boolean): void {
        this.addModeOn = on;
        const hadPending = this.pending !== undefined;
        if (!on) this.pending = undefined;
        this.requestRender();
        if (hadPending && !on) this.syncScene();
    }

    /** Segments mode: drops a waiting first endpoint. */
    cancelPending(): void {
        if (this.pending === undefined) return;
        this.pending = undefined;
        this.requestRender();
        this.syncScene();
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    /** The overlay ids this graph offers, in switch order. A subclass spreads `super.overlayIds()` and adds its own. */
    protected overlayIds(): readonly (Overlay | PointSetBaseOverlayId)[] {
        return ["grid"];
    }

    protected overlayLabel(id: Overlay | PointSetBaseOverlayId): string {
        return id === "grid" ? t("pointset_overlay_grid") : id;
    }

    /**
     * Creates the board objects of one shown overlay from the model. The base owns the returned objects. A subclass
     * handles its own ids and calls `super.drawOverlay` for the rest.
     */
    protected drawOverlay(id: Overlay | PointSetBaseOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id !== "grid") return [];
        const step = 2 ** model.gridStepExponent;
        const grid = this.board.create("grid", [], {
            gridX: step, gridY: step, strokeColor: GraphPalette.tick, strokeOpacity: 0.8, strokeWidth: 1, dash: 0,
            highlight: false, fixed: true, layer: 0, name: "pointset-grid",
        }) as JXG.GeometryElement;
        return [grid];
    }

    /**
     * Extension point for overlays that depend on more than the model and the shown set (the hull trace's step): return a
     * value that changes identity whenever such an input changes; the overlays are then redrawn. The base returns a constant.
     */
    protected overlayInputs(): unknown {
        return undefined;
    }

    /**
     * An id the scene state does not mention takes the graph's initial value, so a Preset saved before an overlay existed
     * (`values`, added with the lessons) restores it as a new scene would start; a stored `false` stays hidden.
     */
    overlayShown(id: Overlay | PointSetBaseOverlayId): boolean {
        const stored = this.state.overlays[id];
        return stored === undefined ? this.getInitialState().overlays[id] === true : stored;
    }

    setOverlay(id: Overlay | PointSetBaseOverlayId, shown: boolean): void {
        if (!this.overlayIds().includes(id)) throw new Error(`Unknown point-set overlay "${id}".`);
        if (this.overlayShown(id) === shown) return;
        this.setState({overlays: {...this.state.overlays, [id]: shown}});
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return pointSetPresetCollection(POINT_SET_PRESET_KEY, this.overlayIds(), {...this.options, allowSegments: this.allowsSegments(), allowIntervals: this.allowsIntervals()});
    }

    defaultPreset(): PointSetModel {
        return serializePointSetModel(DEFAULT_POINT_SET_MODEL);
    }

    override exportPresetData(): PointSetModel {
        return serializePointSetModel(this.model);
    }

    /**
     * A Preset carries the model once, as `data` (checked by `parsePointSetModel`); its `graphState` omits `model`, which the
     * collection's `checkGraphState` rejects. Lesson checkpoints keep the full scene state, so `sceneGraphState` is unchanged.
     */
    override exportPreset(): Preset<PointSetModel> {
        const preset = super.exportPreset();
        const {model: _model, ...graphState} = preset.graphState as PointSetGraphState;
        return {...preset, graphState};
    }

    override importPresetData(data: PointSetModel): void {
        this.pending = undefined;
        this.setState({model: serializePointSetModel(data)});
    }

    /** The scene state a Preset replacement starts from keeps the model that `importPresetData` just wrote. */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model};
    }

    protected override lessonDefaultState(): PointSetGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model};
    }

    // ---- Transient state -----------------------------------------------------------------------------------------

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), pointSetSelected: this.selected, pointSetAddMode: this.addModeOn};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const index = saved?.pointSetSelected;
        const inRange = typeof index === "number" && Number.isInteger(index) && index >= 0 && index < this.model.points.length;
        this.selected = inRange ? index : undefined;
        this.addModeOn = saved?.pointSetAddMode === true;
        this.pending = undefined;
        this.noticeValue = undefined;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        // JSXGraph writes an empty aria-label of its own on the container, so the host's value is read before it is created.
        const hadLabel = container.getAttribute("aria-label");
        super.createMainView(session, container);
        this.bindInteraction(session, container, hadLabel);
    }

    /** Every listener and attribute set here is undone by the session cleanup. */
    private bindInteraction(session: GraphSession, container: HTMLElement, hadLabel: string | null): void {
        const hadTabIndex = container.getAttribute("tabindex");
        container.setAttribute("tabindex", "0");
        const label = () => container.setAttribute("aria-label", t("pointset_board_label"));
        label();
        let language = currentLanguage();
        const unsubscribeLanguage = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            label();
        });
        container.addEventListener("keydown", this.onKeyDown);
        session.on("down", event => this.onBoardDown(event));
        session.registerCleanup(() => {
            unsubscribeLanguage();
            container.removeEventListener("keydown", this.onKeyDown);
            if (hadTabIndex === null) container.removeAttribute("tabindex"); else container.setAttribute("tabindex", hadTabIndex);
            if (hadLabel === null) container.removeAttribute("aria-label"); else container.setAttribute("aria-label", hadLabel);
        });
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.altKey || event.ctrlKey || event.metaKey || this.graphInteractionLocked) return;
        const step = ARROW_STEPS[event.key];
        if (step) {
            if (this.selected !== undefined) {
                event.preventDefault();
                this.nudgeSelected(step[0], step[1]);
            }
        } else if (event.key === "Escape") {
            if (this.pending !== undefined) {
                event.preventDefault();
                this.cancelPending();
            }
        } else if (event.key === "Delete" || event.key === "Backspace") {
            if (this.selected !== undefined) {
                event.preventDefault();
                this.removeSelected();
            }
        }
    };

    private onBoardDown(event: unknown): void {
        if (!this.addModeOn || this.graphInteractionLocked || !this.hasBoard) return;
        if (this.board.getAllObjectsUnderMouse(event).some(object => (object as {elType?: string}).elType === "point")) return;
        const [x, y] = this.board.getUsrCoordsOfMouse(event);
        if (this.model.mode !== "segments" && this.model.mode !== "intervals") {
            this.addPointAtBoard(x, y);
            return;
        }
        const snapped = snapToGrid(x, y, this.model.gridStepExponent);
        // An interval has no y of its own: the waiting marker sits on the row the new interval will get.
        const here = this.model.mode === "intervals" ? {x: snapped.x, y: intervalRow(this.model.points.length >> 1)} : snapped;
        const first = this.pending;
        if (first === undefined) {
            this.pending = here;
            this.requestRender();
            this.syncScene();
            return;
        }
        this.pending = undefined;
        if (this.model.mode === "intervals") this.addIntervalAt(first.x, here.x);
        else this.addSegmentAt(first, here);
        this.syncScene();
    }

    private dragPoint(index: number, point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const model = this.model;
        const exponent = model.gridStepExponent;
        const snapped = snapToGrid(point.X(), point.Y(), exponent);
        const result = movePoint(model, index, snapped, this.options);
        // The edit decides the stored point (an interval endpoint keeps its row), so the board follows its result.
        const stored = result.ok ? result.model.points[index] : model.points[index];
        const target = gridToBoard(stored, exponent);
        this.inDragSnap = true;
        try {
            if (point.X() !== target.x || point.Y() !== target.y) point.moveTo([target.x, target.y], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = index;
        const current = model.points[index];
        if (!result.ok) this.apply(result);
        else if (current.x !== stored.x || current.y !== stored.y) this.apply(result);
    }

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<PointSetGraphState>): void {
        super.onStateChange(previous);
        this.syncScene();
    }

    protected override syncReplacedScene(): void {
        this.syncScene();
    }

    /** Brings the board in line with the state. Idempotent: it moves, rebuilds or leaves objects as the state requires. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const {model, overlays} = this.state;
        if (this.selected !== undefined && this.selected >= model.points.length) this.selected = model.points.length === 0 ? undefined : model.points.length - 1;
        const key = `${model.mode}|${model.closed}|${model.points.length}`;
        if (this.drawn?.key !== key || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn(key, model);
        } else {
            const scale = model.gridStepExponent;
            this.drawn.points.forEach((point, i) => {
                const target = gridToBoard(model.points[i], scale);
                if (point.X() !== target.x || point.Y() !== target.y) point.moveTo([target.x, target.y], 0);
            });
        }
        this.syncPending(model);
        if (this.overlaysDrawnFor?.model !== model || this.overlaysDrawnFor.overlays !== overlays || this.overlaysDrawnFor.extra !== this.overlayInputs()) this.redrawOverlays(model);
        this.boardUpdate();
    }

    private drawnObjectsAlive(): boolean {
        const list = this.board.objectsList as unknown[];
        return this.drawn === undefined || [...this.drawn.points, ...this.drawn.edges, ...this.drawn.labels].every(object => list.includes(object));
    }

    /** The marker of a waiting first endpoint; rebuilt only when the pending point or the grid step changes. */
    private syncPending(model: PointSetModel): void {
        const pending = model.mode === "segments" || model.mode === "intervals" ? this.pending : undefined;
        const exponent = model.gridStepExponent;
        const drawnFor = this.pendingDrawnFor;
        const objectsAlive = this.pendingObjects.every(object => (this.board.objectsList as unknown[]).includes(object));
        if (drawnFor && drawnFor.pending === pending && drawnFor.exponent === exponent && objectsAlive) return;
        this.removeObjects(this.pendingObjects);
        this.pendingObjects = [];
        if (pending) {
            const at = gridToBoard(pending, exponent);
            this.pendingObjects.push(this.board.create("point", [at.x, at.y], {
                name: "pending", withLabel: false, size: 6, face: "x", fixed: true, showInfobox: false, highlight: false,
                strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 2, layer: 8,
            }) as JXG.GeometryElement);
        }
        this.pendingDrawnFor = {pending, exponent};
    }

    private createDrawn(key: string, model: PointSetModel): DrawnScene {
        const board = this.board;
        const scale = model.gridStepExponent;
        const points = model.points.map((gridPoint, i) => {
            const at = gridToBoard(gridPoint, scale);
            const point = board.create("point", [at.x, at.y], {
                name: `P${i + 1}`, withLabel: true, size: () => this.selected === i ? 7 : 5, face: "o", showInfobox: false,
                fillColor: () => this.selected === i ? GraphPalette.selectedControlPoint : GraphPalette.controlPoint,
                strokeColor: () => this.selected === i ? GraphPalette.selectedControlPointOutline : GraphPalette.pointOutline,
                strokeWidth: () => this.selected === i ? 3 : 1, highlightFillColor: GraphPalette.selectedControlPoint,
                label: {visible: () => this.displaySettings.pointLabelsVisible, offset: [8, 8], strokeColor: GraphPalette.label},
                layer: 7,
            }) as JXG.Point;
            point.on("down", () => {
                this.selected = i;
                this.requestRender();
                this.board.containerObj.focus({preventScroll: true});
            });
            point.on("drag", () => this.dragPoint(i, point));
            return point;
        });
        const edges: JXG.GeometryElement[] = [];
        const labels: JXG.GeometryElement[] = [];
        if (model.mode === "segments") {
            for (let k = 0; 2 * k + 1 < points.length; k++) {
                const [from, to] = [points[2 * k], points[2 * k + 1]];
                const on = () => this.selected !== undefined && this.selected >> 1 === k;
                edges.push(board.create("segment", [from, to], {
                    name: `seg${k + 1}`, withLabel: false, strokeColor: () => on() ? GraphPalette.selectedControlPoint : GraphPalette.primaryCurve,
                    strokeWidth: () => this.displaySettings.strokeWidth + (on() ? 2 : 0), highlight: false, fixed: true, layer: 5,
                }) as JXG.GeometryElement);
                labels.push(board.create("text", [() => (from.X() + to.X()) / 2, () => (from.Y() + to.Y()) / 2, `s${k + 1}`], {
                    name: `s${k + 1}`, anchorX: "left", anchorY: "bottom", fixed: true, highlight: false, display: "internal", fontSize: 14,
                    strokeColor: GraphPalette.label, layer: 6,
                }) as JXG.GeometryElement);
            }
        }
        if (model.mode === "intervals") {
            for (let k = 0; 2 * k + 1 < points.length; k++) {
                const [from, to] = [points[2 * k], points[2 * k + 1]];
                const on = () => this.selected !== undefined && this.selected >> 1 === k;
                edges.push(board.create("segment", [from, to], {
                    name: `int${k + 1}`, withLabel: false, strokeColor: () => on() ? GraphPalette.selectedControlPoint : GraphPalette.primaryCurve,
                    strokeWidth: () => this.displaySettings.strokeWidth + (on() ? 2 : 0), highlight: false, fixed: true, layer: 5,
                }) as JXG.GeometryElement);
                labels.push(board.create("text", [() => (from.X() + to.X()) / 2, () => (from.Y() + to.Y()) / 2, intervalLetter(k)], {
                    name: intervalLetter(k), anchorX: "middle", anchorY: "bottom", fixed: true, highlight: false, display: "internal", fontSize: 14,
                    strokeColor: GraphPalette.label, layer: 6,
                }) as JXG.GeometryElement);
            }
        }
        if (model.mode === "polygon") {
            const pairs = points.slice(1).map((point, i) => [points[i], point] as const);
            if (model.closed && points.length >= 3) pairs.push([points[points.length - 1], points[0]]);
            for (const [from, to] of pairs) {
                edges.push(board.create("segment", [from, to], {
                    strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, highlight: false, fixed: true, layer: 5,
                }) as JXG.GeometryElement);
            }
        }
        return {key, points, edges, labels};
    }

    private removeObjects(objects: readonly JXG.GeometryElement[]): void {
        if (!this.hasBoard) return;
        const list = this.board.objectsList as unknown[];
        const present = objects.filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
    }

    private removeDrawn(): void {
        if (this.drawn) this.removeObjects([...this.drawn.labels, ...this.drawn.edges, ...this.drawn.points]);
        this.drawn = undefined;
    }

    private redrawOverlays(model: PointSetModel): void {
        this.removeObjects(this.overlayObjects);
        this.overlayObjects = [];
        const overlays = this.state.overlays;
        for (const id of this.overlayIds()) {
            if (!this.overlayShown(id)) continue;
            // Some board elements (the grid) create helper objects of their own; the base owns every object a draw added.
            const before = new Set<unknown>(this.board.objectsList as unknown[]);
            const drawn = this.drawOverlay(id, model);
            const created = (this.board.objectsList as JXG.GeometryElement[]).filter(object => !before.has(object) && !drawn.includes(object));
            this.overlayObjects.push(...drawn, ...created);
        }
        this.overlaysDrawnFor = {model, overlays, extra: this.overlayInputs()};
    }

    /** The board removes every scene object during a Preset replacement; drop the references so the next sync rebuilds. */
    protected override disposeFigureScene(): void {
        this.drawn = undefined;
        this.pendingObjects = [];
        this.pendingDrawnFor = undefined;
        this.overlayObjects = [];
        this.overlaysDrawnFor = undefined;
    }

    override unmount(): void {
        this.drawn = undefined;
        this.pendingObjects = [];
        this.pendingDrawnFor = undefined;
        this.pending = undefined;
        this.overlayObjects = [];
        this.overlaysDrawnFor = undefined;
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly actions: PointSetControlActions = {
        addPoint: point => {this.addPointAt(point);},
        addSegment: () => {this.addDefaultSegment();},
        addInterval: () => {this.addDefaultInterval();},
        removeInterval: k => {this.removeIntervalAt(k);},
        removeSegment: k => {this.removeSegmentAt(k);},
        removeSelected: () => {this.removeSelected();},
        clear: () => {this.clear();},
        select: index => this.select(index),
        movePoint: (index, point) => {this.movePointTo(index, point);},
        setAddMode: on => this.setAddMode(on),
        setMode: mode => {this.setPointSetMode(mode);},
        setClosed: closed => {this.setPolygonClosed(closed);},
        setOverlay: (id, shown) => {
            const known = this.overlayIds().find(candidate => candidate === id);
            if (known !== undefined) this.setOverlay(known, shown);
        },
    };

    /** Segments mode is opt-in: a sweep-family subclass returns true to offer it (inspector, Preset parsing, `setPointSetMode`). */
    // A subclass with showsModeToggle() false and allowsSegments() true reaches segments mode only through its default or imported Preset.
    protected allowsSegments(): boolean {
        return false;
    }

    /** Intervals mode is opt-in like segments mode: a subclass returns true to offer it (inspector, Preset parsing, `setPointSetMode`). */
    protected allowsIntervals(): boolean {
        return false;
    }

    /** Whether the inspector offers the points/polygon choice; a subclass that only works on points returns false. */
    protected showsModeToggle(): boolean {
        return true;
    }

    /** Whether the inspector offers the closed-polygon checkbox; a subclass that only works on closed polygons returns false. */
    protected showsClosedToggle(): boolean {
        return true;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <PointSetControls showModeToggle={this.showsModeToggle()} showClosedToggle={this.showsClosedToggle()} allowsSegments={this.allowsSegments()} allowsIntervals={this.allowsIntervals()} pending={this.pending}
                                 segmentLimit={this.segmentLimit} intervalLimit={this.intervalLimit} model={this.model} selected={this.selected} addMode={this.addModeOn} notice={this.noticeValue}
                                 pointLimit={this.pointLimit} coordinateLimit={this.coordinateLimit} simplicity={this.simplicity()}
                                 overlays={this.overlayIds().map(id => ({id, label: this.overlayLabel(id), shown: this.overlayShown(id)}))}
                                 actions={this.actions}/>;
    }
}
