import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {logisticMapPresetCollection} from "./dynamicsPresetCollection";
import type {SceneStateUpdate} from "../base/SceneStore";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import {subscript} from "../recursion/cobwebScene";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController} from "../../learning/runtime/iterationController";
import {BIFURCATION_R_MAX, BIFURCATION_R_MIN, bifurcationRaster, columnR, nearestColumn} from "../../dynamics/bifurcation";
import {logisticMapAt} from "../../dynamics/logistic";
import {
    DEFAULT_LOGISTIC_STATE, deriveLogistic, LogisticDerived, LogisticState, parseLogisticState, R_RANGE, R_SCALE, rOf, serializeLogisticState, snapDragInteger, startOf, STEP_RANGE, typedInteger,
    X_RANGE, X_SCALE,
} from "../../dynamics/phaseModel";

/** The scene state: the stored fields of `LogisticState`, nothing derived and no playback. */
export interface LogisticMapGraphState extends BaseGraphState, LogisticState {}

/** Time between two playback steps. A playback setting, not stored: a reopened Preset is paused. */
export const STEP_INTERVAL_MS = 600;
export const HANDLE_SIZE = 6;
/** The bifurcation raster: columns across r in [2,5; 4] and bins across x in [0, 1]. Smaller than the 800 x 400 of the spec so that the drawn curve stays light. */
export const DIAGRAM_COLUMNS = 400;
export const DIAGRAM_BINS = 200;
/** Where the diagram sits on the board: x in [0, 1] is the cobweb panel, r in [2,5; 4] maps to [DIAGRAM_LEFT, DIAGRAM_LEFT + DIAGRAM_WIDTH]. */
export const DIAGRAM_LEFT = 1.3;
export const DIAGRAM_WIDTH = 1.5;
export const VIEW_BOX: readonly [number, number, number, number] = [-0.1, 1.2, 2.9, -0.55];
/** The onset of chaos near 3,56995, cited (not computed here): from this r on the period row makes no claim. */
export const CHAOS_ONSET = 3.56995;
export const SECOND_SPLIT = 1 + Math.sqrt(6);
const ROW_PX = 18;
/** The caption rows under the x axis start below the row of its tick numbers. */
const TICK_ROW_PX = 26;

const CAPTION_CHAR_PX = 7.5;
/** The lines a caption takes on a board `width` px wide (10 px margin each side): the browser wraps it at the edge of the board. */
const captionLines = (text: string, width: number): number => Math.max(1, Math.ceil((text.length * CAPTION_CHAR_PX) / Math.max(width - 20, 100)));

const dec = (value: number, digits = 6): string => formatNumber(value, currentLanguage(), digits);

/** The board x of a value of r. */
export const diagramX = (r: number): number => DIAGRAM_LEFT + ((r - BIFURCATION_R_MIN) * DIAGRAM_WIDTH) / (BIFURCATION_R_MAX - BIFURCATION_R_MIN);

interface Poly {
    readonly x: number[];
    readonly y: number[];
}

let diagramCache: Poly | undefined;

/**
 * The bifurcation diagram as one NaN-separated curve: per column one vertical segment for every run of occupied bins. Built once per
 * page from the memoised raster (a function of nothing in the scene), never per frame.
 */
export function diagramPolyline(): Poly {
    if (diagramCache) return diagramCache;
    const raster = bifurcationRaster(DIAGRAM_COLUMNS, DIAGRAM_BINS);
    const x: number[] = [];
    const y: number[] = [];
    for (let j = 0; j < raster.width; j++) {
        const at = diagramX(columnR(raster.width, j));
        let start = -1;
        for (let b = 0; b <= raster.bins; b++) {
            const occupied = b < raster.bins && raster.counts[j * raster.bins + b] > 0;
            if (occupied && start < 0) start = b;
            if (!occupied && start >= 0) {
                x.push(at, at, NaN);
                y.push(start / raster.bins, b / raster.bins, NaN);
                start = -1;
            }
        }
    }
    diagramCache = {x, y};
    return diagramCache;
}

const sameContent = (a: LogisticState, b: LogisticState): boolean => a.R === b.R && a.X === b.X && a.step === b.step;
/** The same fields except the step: what a playing iteration may not have changed under it. */
const sameParameters = (a: LogisticState, b: LogisticState): boolean => a.R === b.R && a.X === b.X;

/**
 * The logistic-map graph (phase-portraits spec PP4 and PP5, ADR 0054): the cobweb of y = r x (1 - x) on the left of the board and the
 * bifurcation diagram on its right, with a cursor at the column nearest to the stored r. The stored state is `LogisticState`
 * (r = R/100, x0 = X/100, the number of drawn steps); everything else is derived (`derived()`), keyed on the stored content.
 *
 * Exact statements (the fixed point and the 2-cycle, by the integer tests of the kernel) are labelled exact; periods, orbits and the
 * diagram are computed in double precision and labelled so; from the onset of chaos on no period is claimed.
 *
 * Ownership: every board object goes through `scene`, which removes the objects and the drag listeners with the scene. The playback
 * is an `IterationController` created on demand and disposed with the scene and on unmount; it is not stored.
 */
export class LogisticMapGraph extends BaseGraph<LogisticMapGraphState, LogisticState> {
    private readonly scene = new SceneObjects();
    private handle?: JXG.Point;
    private built = false;
    private cache?: {state: LogisticMapGraphState; value: LogisticDerived};
    private controller?: IterationController;
    private derivations = 0;
    private readonly status = new SettledReadout();

    override getInitialState(): LogisticMapGraphState {
        return {initialized: false, ...DEFAULT_LOGISTIC_STATE};
    }

    protected override lessonDefaultState(): LogisticMapGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`. Playback is not stored.

    override defaultPreset(): LogisticState {
        return serializeLogisticState(DEFAULT_LOGISTIC_STATE);
    }

    override presetCollection(): PresetCollection<LogisticState> {
        return logisticMapPresetCollection();
    }

    override exportPreset(): Preset<LogisticState> {
        const preset = super.exportPreset();
        const {R: _R, X: _X, step: _step, ...graphState} = preset.graphState as LogisticMapGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): LogisticState {
        return serializeLogisticState(this.state);
    }

    override importPresetData(data: LogisticState): void {
        this.setState(serializeLogisticState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): LogisticMapGraphState {
        const parsed = parseLogisticState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The cobweb panel and the bifurcation diagram use different units (x against r), so the window is applied exactly, never widened to the canvas aspect. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** A reset shows the exact opening window: the base passes `keepaspect` to `setBoundingBox`, which would widen it. */
    protected override showInitialView(): void {
        this.board.setBoundingBox(this.openingWindow(), false);
    }

    protected override initialView(): [number, number, number, number] {
        return [...VIEW_BOX];
    }

    // ---- Derived numbers: a cache keyed by the stored content ----------------------------------------------------------------

    derived(): LogisticDerived {
        const state = this.state;
        if (this.cache && this.cache.state === state) return this.cache.value;
        if (this.cache && sameContent(this.cache.state, state)) {
            this.cache = {state, value: this.cache.value};
            return this.cache.value;
        }
        this.derivations++;
        this.cache = {state, value: deriveLogistic(state)};
        return this.cache.value;
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    derivationCount(): number { return this.derivations; }
    dragHandle(): JXG.Point | undefined { return this.handle; }
    isPlaying(): boolean { return this.controller?.isPlaying() ?? false; }

    /** The column of the diagram nearest to the stored r and its r (not R/100). */
    cursor(): {column: number; r: number} {
        const column = nearestColumn(DIAGRAM_COLUMNS, this.derived().r);
        return {column, r: columnR(DIAGRAM_COLUMNS, column)};
    }

    /** Whether the period row makes no claim: r is past the (cited) onset of chaos. */
    private claimless(): boolean {
        return this.derived().r > CHAOS_ONSET;
    }

    // ---- Board ----------------------------------------------------------------------------------------------------------------

    /** The y axis has no numbers below 0: the caption rows under the x axis use that space (x and the map live on [0, 1]). */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        const labelOf = axis.defaultY.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const aboveZero = function (this: object, ...label: unknown[]): string {
            const tick = label[0] as {usrCoords?: number[]} | undefined;
            if (tick?.usrCoords && tick.usrCoords[2] < -1e-9) return "";
            return labelOf ? labelOf.apply(this, label) : "";
        };
        return {x: axis.defaultX, y: {...axis.defaultY, ticks: {...axis.defaultY.ticks, generateLabelText: aboveZero}}};
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("phase_graph_logistic_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A new board is created with keepaspect, which widens this window; the opening view is the exact window, as after a reset.
        if (this.hasBoard) this.showInitialView();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => { this.disposeController(); this.status.cancel(); });
            session.registerCleanup(onLanguageChange(() => {
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    /** True while the playback's own tick writes the step; a write at any other time while playing came from outside. */
    private ticking = false;
    private outsideWrite = false;

    override setState(update: SceneStateUpdate<LogisticMapGraphState>, callback?: () => void): void {
        if (!this.ticking && this.isPlaying()) this.outsideWrite = true;
        super.setState(update, callback);
    }

    protected override onStateChange(previous: Readonly<LogisticMapGraphState>): void {
        // A playing iteration changes the step by exactly one and nothing else, written by its own tick; any other write (a lesson action, a restore), even of step + 1, pauses it.
        // A write that changes no stored field (the host's `initialized`) leaves a playing run alone.
        const outside = this.outsideWrite;
        this.outsideWrite = false;
        const changed = !sameContent(previous, this.state);
        if (this.isPlaying() && changed && (outside || !(sameParameters(previous, this.state) && this.state.step === previous.step + 1))) this.pausePlayback();
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (!this.built) this.buildScene();
        this.placeHandle();
        this.board.update();
        this.status.report(this.statusText());
    }

    private placeHandle(): void {
        const x0 = startOf(this.state.X);
        if (this.handle && (this.handle.X() !== x0 || this.handle.Y() !== x0)) this.handle.setPosition(JXG.COORDS_BY_USER, [x0, x0]);
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    private curve(data: () => Poly, color: string, width: number, dash: number, still = false): JXG.Curve {
        const element = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash, needsRegularUpdate: !still,
        }));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
        // A still curve is skipped by every board update: draw it once now (otherwise it stays empty).
        if (still) {
            element.needsUpdate = true;
            element.update().updateRenderer();
        }
        return element;
    }

    /** A caption at a board point plus a pixel offset (up is positive); `dy` below the point is negative. */
    private caption(x: () => number, y: () => number, dx: number, dy: number | (() => number), text: () => string, color: string, options: {
        visible?: () => boolean; anchorX?: "left" | "right"; anchorY?: "top" | "bottom";
    } = {}): void {
        this.scene.own(this.board.create("text", [
            () => x() + dx / this.scaleOf().ux, () => y() + (typeof dy === "number" ? dy : dy()) / this.scaleOf().uy, text,
        ], {
            strokeColor: color, fontSize: 14, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "bottom", fixed: true, highlight: false, withLabel: false,
            visible: options.visible ?? (() => true),
        }));
    }

    /** A fixed marker on the diagonal at (value, value). */
    private marker(value: () => number, visible: () => boolean, face: string, color: string): JXG.Point {
        return this.scene.own(this.board.create("point", [value, value], {
            fixed: true, highlight: false, withLabel: false, name: "", face, size: 5, fillColor: color, strokeColor: GraphPalette.pointOutline, visible,
        }));
    }

    /** The captions of the column under the x axis, in order: the map, the diagonal, the cobweb, the diagram, the second split, the onset of chaos. */
    private columnTexts(): Array<() => string> {
        const derived = () => this.derived();
        return [
            () => t("phase_graph_logistic_cap_map", {value0: dec(derived().r, 2)}),
            () => t("phase_graph_logistic_cap_diagonal"),
            () => t("phase_graph_logistic_cap_cobweb"),
            () => t("phase_graph_logistic_cap_diagram", {value0: dec(BIFURCATION_R_MIN, 1), value1: dec(BIFURCATION_R_MAX, 0)}),
            () => t("phase_graph_logistic_cap_mark_second", {value0: dec(SECOND_SPLIT)}),
            () => t("phase_graph_logistic_cap_onset", {value0: dec(CHAOS_ONSET, 5)}),
        ];
    }

    /** The opening window for this board: `VIEW_BOX`, lowered and raised where the caption column and the cursor caption need more pixels than the box leaves. */
    private openingWindow(): [number, number, number, number] {
        const [left, top, right, bottom] = VIEW_BOX;
        const height = this.board.canvasHeight;
        const width = this.board.canvasWidth;
        const needed = TICK_ROW_PX + ROW_PX * (1 + this.columnTexts().reduce((sum, text) => sum + captionLines(text(), width), 0)) + ROW_PX / 2;
        const cursor = t("phase_graph_logistic_cap_cursor", {value0: dec(this.cursor().r, 4), value1: this.periodText()});
        const neededTop = 8 + ROW_PX * captionLines(cursor, width) + 4;
        if (!(height > needed + neededTop)) return [left, top, right, bottom];
        // A span of `px` pixels is px / unit board units, with unit = height / (top + depth): solved by iteration (it settles in a few steps).
        let upper = top;
        let depth = -bottom;
        for (let i = 0; i < 12; i++) {
            const unit = height / (upper + depth);
            depth = Math.max(-bottom, needed / unit);
            upper = Math.max(top, 1 + neededTop / unit);
        }
        return [left, upper, right, -depth];
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        this.built = true;
        const derived = () => this.derived();
        const f = () => logisticMapAt(derived().r);
        const hasCycle = () => this.state.R > 300;

        // The frames of the two panels, the diagram (static: computed once), its marks and the cursor, then the map, the diagonal and the steps.
        // Each is told apart by width and dash as well as colour.
        const frameBox = (xMin: number, xMax: number): number[][] => [[xMin, 0], [xMax, 0], [xMax, 1], [xMin, 1], [xMin, 0]];
        this.curve(() => {
            const x: number[] = [];
            const y: number[] = [];
            for (const box of [frameBox(0, 1), frameBox(diagramX(BIFURCATION_R_MIN), diagramX(BIFURCATION_R_MAX))]) {
                if (x.length > 0) { x.push(NaN); y.push(NaN); }
                for (const [px, py] of box) { x.push(px); y.push(py); }
            }
            return {x, y};
        }, GraphPalette.tick, 1, 0, true);
        this.curve(diagramPolyline, GraphPalette.primaryCurve, 1, 0, true);
        this.curve(() => {
            const x: number[] = [];
            const y: number[] = [];
            for (const r of [3, SECOND_SPLIT, CHAOS_ONSET]) {
                if (x.length > 0) { x.push(NaN); y.push(NaN); }
                x.push(diagramX(r), diagramX(r));
                y.push(0, 1);
            }
            return {x, y};
        }, GraphPalette.referenceCurve, 1, 3, true);
        this.curve(() => {
            const at = diagramX(this.cursor().r);
            return {x: [at, at], y: [0, 1]};
        }, GraphPalette.constructionAccent, 3, 0);
        this.curve(() => {
            const x: number[] = [];
            const y: number[] = [];
            const map = f();
            for (let i = 0; i <= 120; i++) { x.push(i / 120); y.push(map(i / 120)); }
            return {x, y};
        }, GraphPalette.comparisonCurve, 3, 0);
        this.curve(() => ({x: [0, 1], y: [0, 1]}), GraphPalette.referenceCurve, 2, 2);
        this.curve(() => {
            const {iterates} = derived();
            const x = [iterates[0]];
            const y = [iterates[0]];
            for (let i = 0; i + 1 < iterates.length; i++) {
                x.push(iterates[i], iterates[i + 1]);
                y.push(iterates[i + 1], iterates[i + 1]);
            }
            return {x, y};
        }, GraphPalette.label, 2, 0);
        this.marker(() => derived().fixedPoint, () => true, "square", GraphPalette.comparisonCurve);
        this.marker(() => derived().twoCycle?.[0] ?? 0, hasCycle, "triangleup", GraphPalette.additionalCurves[1]);
        this.marker(() => derived().twoCycle?.[1] ?? 0, hasCycle, "triangleup", GraphPalette.additionalCurves[1]);
        this.marker(() => derived().iterates[this.state.step], () => this.state.step > 0, "diamond", GraphPalette.label);
        const handle = this.scene.own(board.create("point", [startOf(this.state.X), startOf(this.state.X)], {
            withLabel: false, name: "", size: HANDLE_SIZE, fillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
        }));
        this.handle = handle;
        this.wireDrag(handle);

        // A caption for every element a readout names: the map, the diagonal, the cobweb, the start, the fixed point, the 2-cycle, the
        // iterate, the diagram, the cursor (with its column's r and the period) and the marks.
        // Under the x axis: the row of the r marks, then the long captions in one column, each as tall as its wrapped lines (the browser wraps a
        // caption at the edge of the board, so on a narrow board a row takes several lines and the next row starts below them).
        const below = (row: number) => -(TICK_ROW_PX + row * ROW_PX);
        const column = this.columnTexts();
        const columnRow = (index: number) => () => -(TICK_ROW_PX + ROW_PX * (1 + column.slice(0, index).reduce((sum, text) => sum + captionLines(text(), this.board.canvasWidth), 0)));
        const columnColors = [GraphPalette.comparisonCurve, GraphPalette.label, GraphPalette.label, GraphPalette.label, GraphPalette.label, GraphPalette.label];
        column.forEach((text, index) => this.caption(() => -0.1, () => 0, 4, columnRow(index), text, columnColors[index], {anchorY: "top"}));
        this.caption(() => startOf(this.state.X), () => 0, 6, 8, () => t("phase_graph_logistic_cap_start", {value0: dec(startOf(this.state.X), 2)}), GraphPalette.constructionAccent);
        this.caption(() => derived().fixedPoint, () => derived().fixedPoint, 8, -14, () => t("phase_graph_logistic_cap_fixed", {value0: dec(derived().fixedPoint)}),
            GraphPalette.comparisonCurve, {anchorY: "top"});
        this.caption(() => 1, () => 0.55, 6, 0, () => {
            const cycle = derived().twoCycle;
            return cycle ? t("phase_graph_logistic_cap_cycle", {value0: dec(cycle[0]), value1: dec(cycle[1])}) : "";
        }, GraphPalette.additionalCurves[1], {visible: hasCycle, anchorX: "right"});
        this.caption(() => derived().iterates[this.state.step], () => derived().iterates[this.state.step], 8, 8,
            () => t("phase_graph_logistic_cap_iterate", {value0: subscript(this.state.step), value1: dec(derived().iterates[this.state.step])}), GraphPalette.label,
            {visible: () => this.state.step > 0});
        const base = () => diagramX(BIFURCATION_R_MIN);
        this.caption(base, () => 0, 0, below(0), () => t("phase_graph_logistic_cap_r", {value0: dec(BIFURCATION_R_MIN, 1)}), GraphPalette.label, {anchorY: "top"});
        this.caption(() => diagramX(BIFURCATION_R_MAX), () => 0, 0, below(0), () => t("phase_graph_logistic_cap_r", {value0: dec(BIFURCATION_R_MAX, 0)}),
            GraphPalette.label, {anchorY: "top", anchorX: "right"});
        this.caption(() => diagramX(3), () => 0, 3, below(0), () => t("phase_graph_logistic_cap_r", {value0: dec(3, 0)}), GraphPalette.label, {anchorY: "top"});
        this.caption(() => diagramX(BIFURCATION_R_MAX), () => 1, 0, 8, () => t("phase_graph_logistic_cap_cursor", {value0: dec(this.cursor().r, 4), value1: this.periodText()}),
            GraphPalette.constructionAccent, {anchorX: "right"});
        // The still curves are skipped by every regular update, so their visibility is only computed by a full one; once per build.
        board.fullUpdate();
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.handle = undefined;
        this.built = false;
    }

    // ---- Dragging: the handle moves along the diagonal and snaps to the start grid ---------------------------------------------

    private wireDrag(point: JXG.Point): void {
        const onDrag = () => this.dragTo(point);
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("over", onOver);
        point.on("out", onOut);
        this.scene.listen(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
    }

    /** Drag only: the start snaps to the nearest grid value strictly inside (0, 1) (typed values are refused instead). */
    private dragTo(point: JXG.Point): void {
        const X = snapDragInteger(point.X(), X_SCALE, X_RANGE);
        if (X === undefined) {
            this.placeHandle();
            return;
        }
        this.pausePlayback();
        if (X !== this.state.X) this.setState({X});
        const x0 = startOf(X);
        point.setPosition(JXG.COORDS_BY_USER, [x0, x0]);
    }

    // ---- Playback -------------------------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private disposeController(): void {
        this.controller?.dispose();
        this.controller = undefined;
    }

    /** The controller, created on demand and kept in step with the stored step count (a write from outside moved it). */
    private syncedController(): IterationController {
        this.controller ??= new IterationController({
            transition: () => {
                const step = this.state.step + 1;
                this.ticking = true;
                try { this.setState({step}); } finally { this.ticking = false; }
                this.requestRender();
                return step >= STEP_RANGE.max ? "complete" : "continue";
            },
            stepIntervalMs: STEP_INTERVAL_MS,
            maxIterations: STEP_RANGE.max,
            onComplete: () => this.requestRender(),
            scheduler: this.animationScheduler(),
        });
        if (this.controller.iteration !== this.state.step) this.controller.reset(this.state.step);
        return this.controller;
    }

    /** A figure export captures the paused step, not a frame of a running cobweb. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; the step stays where it is. */
    override pausePlayback(): void {
        if (!this.controller?.isPlaying()) return;
        this.controller.pause();
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the step on; at the end there is nothing to play (Reset goes back). Under reduced motion nothing plays: the Play button says so and Next step stays available. */
    play(): void {
        if (this.isPlaying() || !this.hasBoard || !this.graphSession?.isAlive || this.state.step >= STEP_RANGE.max) return;
        if (this.reducedMotion()) return;
        this.syncedController().play();
        this.requestRender();
    }

    stepOnce(): void {
        this.pausePlayback();
        if (this.state.step >= STEP_RANGE.max) return;
        this.syncedController().nextStep();
        this.requestRender();
    }

    resetRun(): void {
        this.pausePlayback();
        this.setState({step: 0});
        this.controller?.reset(0);
        this.requestRender();
    }

    // ---- Editing from the panel: typed values are refused when invalid; only the drag snaps ------------------------------------

    /** Every edit pauses the playback first, then writes the patch; the step count stays, so the picture follows the parameter. */
    private edit(patch: Partial<LogisticState>): void {
        this.pausePlayback();
        this.setState(patch);
        this.requestRender();
    }

    /** A typed or slider r: on the grid of 1/100 from 2,5 to 4, otherwise refused (false), never rounded or clamped. */
    editR(value: number): boolean {
        const checked = typedInteger(value, R_SCALE, R_RANGE, "R");
        if (!checked.ok) return false;
        if (checked.value !== this.state.R) this.edit({R: checked.value});
        return true;
    }

    /** A typed start: on the grid of 1/100, strictly between 0 and 1, otherwise refused. */
    editStart(value: number): boolean {
        const checked = typedInteger(value, X_SCALE, X_RANGE, "X");
        if (!checked.ok) return false;
        if (checked.value !== this.state.X) this.edit({X: checked.value});
        return true;
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------

    /** The period as computed text, or that no claim is made past the onset of chaos. */
    private periodText(): string {
        if (this.claimless()) return t("phase_graph_logistic_period_claimless_value", {value0: dec(CHAOS_ONSET, 5)});
        const {period} = this.derived();
        return period.kind === "computed" ? t("phase_graph_logistic_period_value", {value0: String(period.period)})
            : t("phase_graph_logistic_period_none_value", {value0: String(period.maxPeriod)});
    }

    private noteText(): string {
        return t("phase_graph_logistic_note_precision", {value0: dec(CHAOS_ONSET, 5)});
    }

    private kindSentence(): string {
        const d = this.derived();
        const star = dec(d.fixedPoint);
        const multiplier = dec(d.fixedMultiplier, 4);
        switch (d.kind) {
            case "fixed-attracting": return t("phase_graph_logistic_kind_fixed", {value0: star, value1: multiplier});
            case "neutral-at-3": return t("phase_graph_logistic_kind_neutral", {value0: star});
            case "two-cycle-attracting": {
                const cycle = d.twoCycle ?? [NaN, NaN];
                return t("phase_graph_logistic_kind_two", {value0: star, value1: multiplier, value2: dec(cycle[0]), value3: dec(cycle[1]), value4: dec(d.twoCycleMultiplier ?? NaN, 4)});
            }
            case "beyond-two-cycle": return t("phase_graph_logistic_kind_beyond");
        }
    }

    private kindRow(): string {
        switch (this.derived().kind) {
            case "fixed-attracting": return t("phase_graph_logistic_row_kind_fixed");
            case "neutral-at-3": return t("phase_graph_logistic_row_kind_neutral");
            case "two-cycle-attracting": return t("phase_graph_logistic_row_kind_two");
            case "beyond-two-cycle": return t("phase_graph_logistic_row_kind_beyond");
        }
    }

    /** The status sentence: where the iteration is, what the parameter means (exact), and the computed period. */
    statusText(): string {
        const d = this.derived();
        const {step} = this.state;
        return [t("phase_graph_logistic_status", {value0: dec(d.r, 2), value1: dec(d.x0, 2), value2: String(step), value3: String(STEP_RANGE.max),
            value4: subscript(step), value5: dec(d.iterates[step])}),
            this.kindSentence(), t("phase_graph_logistic_period_sentence", {value0: this.periodText()}), this.claimless() ? this.noteText() : ""].filter(Boolean).join(" ");
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.derived();
        const {step} = this.state;
        const cursor = this.cursor();
        const cycle = d.twoCycle;
        const rows: ReadoutListRow[] = [
            {id: "r", label: t("phase_graph_logistic_r_r"), value: dec(d.r, 2)},
            {id: "x0", label: t("phase_graph_logistic_r_x0"), value: dec(d.x0, 2)},
            {id: "steps", label: t("phase_graph_logistic_r_steps"), value: t("phase_graph_logistic_steps_value", {value0: String(step), value1: String(STEP_RANGE.max)})},
            {id: "iterate", label: t("phase_graph_logistic_r_iterate", {value0: subscript(step)}), value: dec(d.iterates[step])},
            {id: "kind", label: t("phase_graph_logistic_r_kind"), value: this.kindRow()},
            {id: "fixed", label: t("phase_graph_logistic_r_fixed"), value: dec(d.fixedPoint)},
            {id: "fixed-multiplier", label: t("phase_graph_logistic_r_fixed_mult"), value: dec(d.fixedMultiplier, 4)},
            {id: "cycle", label: t("phase_graph_logistic_r_cycle"), value: cycle ? t("phase_graph_logistic_cycle_value", {value0: dec(cycle[0]), value1: dec(cycle[1])})
                : t("phase_graph_logistic_cycle_none")},
        ];
        if (cycle) rows.push({id: "cycle-multiplier", label: t("phase_graph_logistic_r_cycle_mult"), value: dec(d.twoCycleMultiplier ?? NaN, 4)});
        rows.push(
            {id: "period", label: t("phase_graph_logistic_r_period"), value: this.periodText()},
            {id: "column", label: t("phase_graph_logistic_r_column"), value: t("phase_graph_logistic_column_value",
                {value0: dec(cursor.r, 4), value1: String(cursor.column + 1), value2: String(DIAGRAM_COLUMNS)})},
        );
        if (this.claimless()) rows.push({id: "note", label: t("phase_graph_logistic_r_note"), value: this.noteText()});
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------------

    private range(min: number, max: number, scale: number) {
        return {value0: dec(min / scale, 2), value1: dec(max / scale, 2), value2: dec(1 / scale, 2)};
    }

    override getGraphCommands(): JSX.Element[] {
        const rArgs = this.range(R_RANGE.min, R_RANGE.max, R_SCALE);
        const xArgs = this.range(X_RANGE.min, X_RANGE.max, X_SCALE);
        return [
            <Slider key="r" customText={t("phase_graph_logistic_r_label")} min={R_RANGE.min / R_SCALE} max={R_RANGE.max / R_SCALE} step={1 / R_SCALE} bigStep={0.1}
                    value={rOf(this.state.R)} decimals={2} help={t("phase_graph_logistic_r_help", rArgs)} rejectedHint={t("phase_graph_logistic_r_rejected", rArgs)}
                    onChange={value => this.editR(value)}/>,
            <NumberInput key="x" label={t("phase_graph_logistic_x_label")} value={startOf(this.state.X)} step={1 / X_SCALE} bigStep={0.1} min={X_RANGE.min / X_SCALE}
                         max={X_RANGE.max / X_SCALE} decimals={2} help={t("phase_graph_logistic_x_help", xArgs)} rejectedHint={t("phase_graph_logistic_x_rejected", xArgs)}
                         onChange={value => this.editStart(value)}/>,
        ];
    }

    protected override workspaceEdit(): React.ReactNode {
        const {step} = this.state;
        const playing = this.isPlaying();
        const blocks = playbackBlocks({atStart: step === 0, atEnd: step >= STEP_RANGE.max, playing});
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReducedMotion>{() =>
                    <PlaybackButtons placement="graph" groupLabel={t("phase_graph_logistic_playback_group")} nextLabel={t("next_step")} resetLabel={t("reset")}
                                     playing={playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...blocks} playBlock={blocks.playBlock ?? (!playing && this.reducedMotion() ? "reduced-motion" : undefined)}
                                     reducedMotionReason={t("playback_block_reduced_motion_next_step")}/>}
                </ReducedMotion>
                <p data-step-counter="">{t("step_counter", {value0: step, value1: STEP_RANGE.max})}</p>
                <ReadoutHeading>{t("phase_graph_logistic_readout_title")}</ReadoutHeading>
                <p data-logistic-status="">{this.statusText()}</p>
                <ReadoutList label={t("phase_graph_logistic_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status} muted={playing}/>
            </div>
        </>;
    }
}

export default LogisticMapGraph;
