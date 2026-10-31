import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {GRID_COORD_LIMIT, GridPoint} from "../../compgeo/grid";
import {
    addPoint, clearPoints, DEFAULT_POINT_LIMIT, EMPTY_POINT_SET_MODEL, gridToBoard, movePoint, nudgePoint, PointSetEditResult, PointSetMode,
    PointSetModel, PointSetOptions, removePoint, serializePointSetModel, setClosed, setMode, snapToGrid,
} from "../../compgeo/pointSetModel";
import {polygonSimplicity, PolygonSimplicity} from "../../compgeo/predicates";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {pointSetPresetCollection} from "./pointSetPresetCollection";
import {PointSetControlActions, PointSetControls, PointSetNotice} from "./PointSetControls";

/**
 * The shared point-set/polygon graph (spec convexity-hulls-lessons section 2, ADR 0021). It draws a `PointSetModel` on a
 * JSXGraph board and edits it; the scene store holds the model, so the board is always a function of the state.
 *
 * Public interface (everything else is private or a documented extension point):
 * - `new PointSetGraph(options?)`: `options.pointLimit` (default 40; the sweep family passes 12).
 * - Reads: `model`, `selectedIndex`, `isAddMode`, `simplicity()` (polygon mode only), `pointLimit`.
 * - Edits (each is one synchronous scene write that returns whether it applied; a refusal sets a visible notice and
 *   changes nothing): `addPointAt(gridPoint)`, `addPointAtBoard(x, y)`, `movePointTo(i, gridPoint)`, `nudgeSelected(dx, dy)`,
 *   `removeSelected()`, `clear()`, `setPointSetMode(mode)`, `setPolygonClosed(closed)`, `loadModel(model)`.
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
 * Lesson actions are not implemented yet; they wait for the typed lesson vocabulary of the platform.
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
            this.noticeValue = {kind: result.reason};
            this.requestRender();
        }
        return false;
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

    movePointTo(index: number, point: GridPoint): boolean {
        return this.apply(movePoint(this.model, index, point));
    }

    nudgeSelected(dx: number, dy: number): boolean {
        return this.selected !== undefined && this.apply(nudgePoint(this.model, this.selected, dx, dy));
    }

    removeSelected(): boolean {
        const index = this.selected;
        if (index === undefined) return false;
        const removed = this.apply(removePoint(this.model, index));
        if (removed) this.selected = this.model.points.length === 0 ? undefined : Math.min(index, this.model.points.length - 1);
        return removed;
    }

    clear(): boolean {
        this.selected = undefined;
        return this.apply({ok: true, model: clearPoints(this.model)});
    }

    setPointSetMode(mode: PointSetMode): boolean {
        return this.apply({ok: true, model: setMode(this.model, mode)});
    }

    setPolygonClosed(closed: boolean): boolean {
        return this.apply(setClosed(this.model, closed));
    }

    /** Replaces the whole model (an example or a validated import); the caller has validated it with `parsePointSetModel`. */
    loadModel(model: PointSetModel): void {
        this.selected = undefined;
        this.noticeValue = undefined;
        this.setState({model: serializePointSetModel(model)});
        this.requestRender();
    }

    select(index: number | undefined): void {
        const valid = index !== undefined && Number.isInteger(index) && index >= 0 && index < this.model.points.length;
        this.selected = valid ? index : undefined;
        this.requestRender();
        this.boardUpdate();
    }

    setAddMode(on: boolean): void {
        this.addModeOn = on;
        this.requestRender();
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

    overlayShown(id: Overlay | PointSetBaseOverlayId): boolean {
        return this.state.overlays[id] === true;
    }

    setOverlay(id: Overlay | PointSetBaseOverlayId, shown: boolean): void {
        if (!this.overlayIds().includes(id)) throw new Error(`Unknown point-set overlay "${id}".`);
        if (this.overlayShown(id) === shown) return;
        this.setState({overlays: {...this.state.overlays, [id]: shown}});
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return pointSetPresetCollection(POINT_SET_PRESET_KEY, this.overlayIds(), this.options);
    }

    defaultPreset(): PointSetModel {
        return serializePointSetModel(DEFAULT_POINT_SET_MODEL);
    }

    override exportPresetData(): PointSetModel {
        return serializePointSetModel(this.model);
    }

    override importPresetData(data: PointSetModel): void {
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
        this.addPointAtBoard(x, y);
    }

    private dragPoint(index: number, point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const model = this.model;
        const exponent = model.gridStepExponent;
        const snapped = snapToGrid(point.X(), point.Y(), exponent);
        const result = movePoint(model, index, snapped);
        const target = gridToBoard(result.ok ? snapped : model.points[index], exponent);
        this.inDragSnap = true;
        try {
            if (point.X() !== target.x || point.Y() !== target.y) point.moveTo([target.x, target.y], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = index;
        const current = model.points[index];
        if (!result.ok) this.apply(result);
        else if (current.x !== snapped.x || current.y !== snapped.y) this.apply(result);
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
        if (this.overlaysDrawnFor?.model !== model || this.overlaysDrawnFor.overlays !== overlays || this.overlaysDrawnFor.extra !== this.overlayInputs()) this.redrawOverlays(model);
        this.boardUpdate();
    }

    private drawnObjectsAlive(): boolean {
        const list = this.board.objectsList as unknown[];
        return this.drawn === undefined || this.drawn.points.every(point => list.includes(point));
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
        if (model.mode === "polygon") {
            const pairs = points.slice(1).map((point, i) => [points[i], point] as const);
            if (model.closed && points.length >= 3) pairs.push([points[points.length - 1], points[0]]);
            for (const [from, to] of pairs) {
                edges.push(board.create("segment", [from, to], {
                    strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, highlight: false, fixed: true, layer: 5,
                }) as JXG.GeometryElement);
            }
        }
        return {key, points, edges};
    }

    private removeObjects(objects: readonly JXG.GeometryElement[]): void {
        if (!this.hasBoard) return;
        const list = this.board.objectsList as unknown[];
        const present = objects.filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
    }

    private removeDrawn(): void {
        if (this.drawn) this.removeObjects([...this.drawn.edges, ...this.drawn.points]);
        this.drawn = undefined;
    }

    private redrawOverlays(model: PointSetModel): void {
        this.removeObjects(this.overlayObjects);
        this.overlayObjects = [];
        const overlays = this.state.overlays;
        for (const id of this.overlayIds()) {
            if (overlays[id] !== true) continue;
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
        this.overlayObjects = [];
        this.overlaysDrawnFor = undefined;
    }

    override unmount(): void {
        this.drawn = undefined;
        this.overlayObjects = [];
        this.overlaysDrawnFor = undefined;
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly actions: PointSetControlActions = {
        addPoint: point => {this.addPointAt(point);},
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

    /** Whether the inspector offers the points/polygon choice; a subclass that only works on points returns false. */
    protected showsModeToggle(): boolean {
        return true;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <PointSetControls showModeToggle={this.showsModeToggle()} model={this.model} selected={this.selected} addMode={this.addModeOn} notice={this.noticeValue}
                                 pointLimit={this.pointLimit} coordinateLimit={GRID_COORD_LIMIT} simplicity={this.simplicity()}
                                 overlays={this.overlayIds().map(id => ({id, label: this.overlayLabel(id), shown: this.overlayShown(id)}))}
                                 actions={this.actions}/>;
    }
}
