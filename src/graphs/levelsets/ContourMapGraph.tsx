import React from "react";
import {prefersReducedMotion} from "../base/controls/reducedMotion";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import type {TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import type {ReadoutListRow} from "../base/controls/ReadoutParts";
import {SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import {CATALOGUE, CATALOGUE_IDS, type CatalogueId} from "../../levelsets/functions2";
import {DESCENT_MAX_STEPS} from "../../levelsets/descent";
import type {Rational} from "../../compgeo/rational";
import {
    CIRCLE_PARAM_RANGE, CIRCLE_STEPS, CONSTRAINT_IDS, CONTOUR_MODES, DEFAULT_CONTOUR_STATE, LEVEL_COUNT_RANGE, LEVEL_RANGE, LEVEL_SCALE, LINE_PARAM_RANGE,
    LINE_PARAM_SCALE, PROBE_RANGE, PROBE_SCALE, START_RANGE, START_SCALE, STEP_RANGE, STEP_SCALE, circleAngleOf, constraintAccepts, contourWindow,
    levelOf, lineParamOf, parseContourState, probeFits, probeOf, serializeContourState, startFits, startOf, stepOf, windowHalf, withFunction,
    type ConstraintId, type ContourMode, type ContourState,
} from "../../levelsets/contourModel";
import {
    GRID_N, SURFACE_N, arrowScale, buildSurfaceScene, circleParamNear, circleTangentCount, circleTangentParams, constraintPoly, descentInfo,
    emptyPoly, firstOutsideDrawing, gradientAt, joinCurves, lagrangeInfo, levelDrawings, levelValues, numericGradient, pathPoly, rationalText, snapGrid,
    surfaceMesh, totalLength, typedGrid, segmentsPoly, contourSegments,
    type DescentInfo, type GradientInfo, type LagrangeInfo, type LevelDrawing, type Poly, type SurfaceMeshData,
} from "./contourScene";
import {ContourPlayback, ContourReadout, ContourSurfacePanel} from "./ContourPanels";
import {legendRowOffset} from "./legendLines";
import {Memo} from "./Memo";
import {contourPresetCollection, type ContourPresetData} from "./contourPresetCollection";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset, StoredGraphState} from "../base/presets/Presets";
import {SurfaceCameraPanel, type SurfaceCameraActions} from "../patches/SurfaceCameraPanel";
import {CAMERA_PRESETS, clamp, presetCamera, type CameraPresetName} from "../patches/surface-view/surfaceMath";
import {createDefaultSurfaceView} from "../patches/surface-view/defaultSurfaceView";
import type {SurfaceCamera, SurfaceScene, SurfaceView} from "../patches/surface-view/surfaceScene";

/** The scene state: the stored fields of `ContourState`, nothing derived. The step counter and the playing flag are host state, never stored. */
export interface ContourMapGraphState extends BaseGraphState, ContourState {}

/** Pointer tolerance in screen pixels around a handle (as the phase-portrait graph). */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
/** One frame advances the playback clock by at most this many milliseconds, so a stalled tab does not jump. */
export const MAX_FRAME_MS = 100;
/** The playback shows one descent step per this many milliseconds. */
export const STEP_MS = 100;
/** The vectors are drawn so the longest is at most this fraction of the window half-width. */
export const ARROW_FRACTION = 0.4;
/** Half the length of the drawn tangent, in window half-widths. */
const TANGENT_HALF = 0.3;
/** The circle marks its tangent points only while they are few (they are all of the circle for the bowl). */
const TANGENT_MARKS = 8;
let helpInstances = 0;

/** Every stored field, derived from the defaults; a test compares it with the keys of `ContourState` so a new field cannot miss the pause rule. */
export const STORED_FIELDS = Object.keys(DEFAULT_CONTOUR_STATE) as (keyof ContourState)[];

const samePair = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((value, index) => value === b[index]);
const sameField = (key: keyof ContourState, a: ContourState, b: ContourState): boolean => {
    if (key === "probe" || key === "start") return samePair(a[key], b[key]);
    if (key === "camera") {
        return a.camera.az === b.camera.az && a.camera.el === b.camera.el && a.camera.distance === b.camera.distance && a.camera.projection === b.camera.projection
            && samePair(a.camera.target, b.camera.target);
    }
    return a[key] === b[key];
};
/** Content comparison of the stored fields, including the arrays and the camera. */
export const sameContent = (a: ContourState, b: ContourState): boolean => STORED_FIELDS.every(key => sameField(key, a, b));

/**
 * The line styles of the drawn elements, by legend row. The board and the legend test read this one table, so a legend text that names
 * a style (solid, dashed, thicker) can be checked against the attribute the element is drawn with. Dash 0 is solid, 2 and 3 are dashed.
 */
export const DRAWN_STYLE = {
    levels: {dash: 0, strokeWidth: 3},
    "levels-more": {dash: 0, strokeWidth: 1.5},
    through: {dash: 2, strokeWidth: 2},
    constraint: {dash: 0, strokeWidth: 5},
    path: {dash: 0, strokeWidth: 2.5},
    gradient: {dash: 0, strokeWidth: 3},
    tangent: {dash: 0, strokeWidth: 2},
    "grad-f": {dash: 0, strokeWidth: 3},
    "grad-g": {dash: 3, strokeWidth: 3},
} as const;

/** A whole number in Unicode subscript digits, for the index of a point. */
const subscript = (n: number): string => String(n).replace(/\d/g, digit => String.fromCharCode(0x2080 + Number(digit)));

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);
const point = (x: number, y: number, digits = 3): string => t("levelsets_graph_point_format", {value0: dec(x, digits), value1: dec(y, digits)});

export const FUNCTION_KEYS = {
    bowl: "levelsets_graph_fn_bowl", saddle: "levelsets_graph_fn_saddle", valley: "levelsets_graph_fn_valley", hills: "levelsets_graph_fn_hills",
    product: "levelsets_graph_fn_product",
} as const;
const MODE_KEYS = {
    "level-sets": "levelsets_graph_mode_level_sets", gradient: "levelsets_graph_mode_gradient", descent: "levelsets_graph_mode_descent",
    lagrange: "levelsets_graph_mode_lagrange",
} as const;
const MODE_HELP_KEYS = {
    "level-sets": "levelsets_graph_mode_help_level_sets", gradient: "levelsets_graph_mode_help_gradient", descent: "levelsets_graph_mode_help_descent",
    lagrange: "levelsets_graph_mode_help_lagrange",
} as const;
const CONSTRAINT_KEYS = {line: "levelsets_graph_constraint_line", circle: "levelsets_graph_constraint_circle"} as const;
const BEHAVIOUR_KEYS = {
    converges: "levelsets_graph_behaviour_converges", oscillates: "levelsets_graph_behaviour_oscillates", diverges: "levelsets_graph_behaviour_diverges",
} as const;

const viewKey = (box: readonly number[]): string => box.map(value => value.toFixed(6)).join(",");
const viewBox = (state: ContourState): [number, number, number, number] => {
    const w = contourWindow(state.fn, state.mode);
    const margin = 0.04 * (w.xMax - w.xMin);
    return [w.xMin - margin, w.yMax + margin, w.xMax + margin, w.yMin - margin];
};

/** One row of the legend: what an element of the board is, with its drawing style said in words. */
export interface LegendRow {
    readonly id: string;
    readonly text: string;
    readonly color: string;
}

type LevelCurves = {readonly chosen: Poly; readonly others: Poly; readonly length: number};

/**
 * The contour graph (level-sets spec LS1 to LS4, ADR 0053): contours of a function of two variables beside its surface, the
 * gradient and the tangent of the contour at a probe, a gradient descent with a step counter, and a point on a constraint with
 * the tangency test. The stored state is `ContourState`; the contours are marching-squares illustrations, the gradient, the
 * descent path and the tangency come from the kernels, and the exact statuses are integer or `Rational` tests (labelled so).
 *
 * Ownership: every board object is created by `buildScene` and recorded in `scene`; `disposeScene` removes them with their
 * listeners. The playback driver is created by `play`, stopped by every stored change and by disposal. The surface view belongs
 * to the surface panel, which creates it per mount and disposes it. Derived data is cached on the stored values it depends on.
 */
export class ContourMapGraph extends BaseGraph<ContourMapGraphState, ContourPresetData> implements SurfaceCameraActions {
    private readonly scene = new SceneObjects();
    /** Per instance, so two mounted graphs never share the id that `aria-describedby` points at. */
    readonly helpId = `contour-input-help-${++helpInstances}`;
    private probeHandle?: JXG.Point;
    private startHandle?: JXG.Point;
    private pointHandle?: JXG.Point;
    private readonly drawingsMemo = new Memo<LevelDrawing[]>();
    private readonly curvesMemo = new Memo<LevelCurves>();
    private readonly throughMemo = new Memo<Poly>();
    private readonly descentMemo = new Memo<DescentInfo>();
    private readonly lagrangeMemo = new Memo<LagrangeInfo>();
    private readonly constraintMemo = new Memo<Poly>();
    private readonly tangentMemo = new Memo<readonly number[]>();
    private readonly surfaceMemo = new Memo<SurfaceMeshData>();
    private sceneCache?: {state: ContourMapGraphState; scene: SurfaceScene};
    private sceneKey?: readonly unknown[];
    private sceneRevision = 0;
    private drawnView = "";
    private driver?: AnimationDriver;
    private notice?: {readonly state: ContourMapGraphState; readonly text: () => string};
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    // ---- Host state: not in the model, not in a Preset ------------------------------------------------------------------
    private stepValue = 0;
    private clock = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): ContourMapGraphState {
        return {initialized: false, ...serializeContourState(DEFAULT_CONTOUR_STATE)};
    }

    protected override lessonDefaultState(): ContourMapGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    override presetCollection(): PresetCollection<ContourPresetData> {
        return contourPresetCollection;
    }

    override defaultPreset(): ContourPresetData {
        return [["Contour", serializeContourState(DEFAULT_CONTOUR_STATE)]];
    }

    override exportPresetData(): ContourPresetData {
        return [["Contour", serializeContourState(this.state)]];
    }

    /**
     * A Preset keeps the whole state in `data`, so its `graphState` only marks it initialized: the collection refuses any other
     * field. Checkpoints still capture the full state (`savedGraphState`).
     */
    override exportPreset(): Preset<ContourPresetData> {
        return {...super.exportPreset(), graphState: {initialized: true}};
    }

    /** A figure scene, Preset selection and Reset take the state from the data just imported, not from the stored `graphState`. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined, data?: unknown): ContourMapGraphState {
        return {...super.figurePresetGraphState(graphState, data), ...serializeContourState(this.state), initialized: true};
    }

    override importPresetData(data: ContourPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "Contour") return;
        const parsed = parseContourState(entry[1]);
        if (!parsed.ok) return;
        const imported = serializeContourState(parsed.value);
        // The host commits the state later and its sync would reframe: mark the imported data's view as drawn so the stored view stays.
        if (this.keepImportedView) this.drawnView = viewKey(viewBox(imported));
        this.setState(imported);
    }

    protected override initialView(): [number, number, number, number] {
        return viewBox(DEFAULT_CONTOUR_STATE);
    }

    // ---- Host state -----------------------------------------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    /** The descent step shown (0 is the start). */
    get step(): number { return this.stepValue; }
    get playing(): boolean { return this.playingValue; }
    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    computationCounts(): Record<string, number> {
        return {
            drawings: this.drawingsMemo.computations, through: this.throughMemo.computations, descent: this.descentMemo.computations,
            lagrange: this.lagrangeMemo.computations, surface: this.surfaceMemo.computations,
        };
    }
    handles(): {probe?: JXG.Point; start?: JXG.Point; point?: JXG.Point} { return {probe: this.probeHandle, start: this.startHandle, point: this.pointHandle}; }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    private window() { return contourWindow(this.state.fn, this.state.mode); }
    private half(): number { return this.window().xMax; }

    /** The constraint the point is on: a line the function cannot test exactly (`hills`) is the circle (state set without the model's check). */
    private constraint(): ConstraintId { return constraintAccepts(this.state.fn, this.state.constraint) ? this.state.constraint : "circle"; }

    probePoint(): {x: number; y: number} { return {x: probeOf(this.state.probe[0]), y: probeOf(this.state.probe[1])}; }

    private drawings(): LevelDrawing[] {
        const {fn, level, levelCount} = this.state;
        return this.drawingsMemo.get([fn, this.half(), level, levelCount], () => levelDrawings(fn, this.window(), levelOf(level), levelCount));
    }

    private levelCurves(): LevelCurves {
        const drawings = this.drawings();
        return this.curvesMemo.get([drawings], () => ({
            chosen: segmentsPoly(drawings[0].segments), others: joinCurves(drawings.slice(1)), length: totalLength(drawings),
        }));
    }

    /** The point the dashed contour passes through: the probe, or the point on the constraint; none while descending. */
    private focus(): {x: number; y: number} | undefined {
        const {mode} = this.state;
        if (mode === "level-sets" || mode === "gradient") return this.probePoint();
        if (mode === "lagrange") { const info = this.lagrange(); return {x: info.x, y: info.y}; }
        return undefined;
    }

    private through(): Poly {
        const focus = this.focus();
        const {fn} = this.state;
        return this.throughMemo.get([fn, this.half(), focus?.x, focus?.y], () => focus === undefined ? emptyPoly()
            : segmentsPoly(contourSegments(fn, this.window(), CATALOGUE[fn].value(focus.x, focus.y))));
    }

    gradient(): GradientInfo {
        const {x, y} = this.probePoint();
        return gradientAt(this.state.fn, x, y);
    }

    descent(): DescentInfo {
        const {fn, start, step} = this.state;
        return this.descentMemo.get([fn, start[0], start[1], step], () => descentInfo({fn, start, step}));
    }

    lastStep(): number { return this.descent().result.path.length - 1; }

    lagrange(): LagrangeInfo {
        const {fn, lineParam, circleParam} = this.state;
        const constraint = this.constraint();
        return this.lagrangeMemo.get([fn, constraint, lineParam, circleParam], () => lagrangeInfo({fn, constraint, lineParam, circleParam}));
    }

    private tangentParams(): readonly number[] {
        return this.tangentMemo.get([this.state.fn], () => circleTangentParams(this.state.fn));
    }

    private constraintCurve(): Poly {
        return this.constraintMemo.get([this.constraint()], () => constraintPoly(this.constraint()));
    }

    /** The point of the descent at the shown step, or undefined when it is not drawn. */
    private stepPoint(): {x: number; y: number} | undefined {
        const path = this.descent().result.path;
        const p = path[Math.min(this.stepValue, path.length - 1)];
        const limit = 4 * this.half();
        return p !== undefined && Math.abs(p.x) <= limit && Math.abs(p.y) <= limit ? p : undefined;
    }

    /** The vector scale: the longest of the vectors fits in ARROW_FRACTION of the half-width. */
    arrowFactor(): number {
        if (this.state.mode === "gradient") return arrowScale(this.half(), [this.gradient().norm], ARROW_FRACTION);
        if (this.state.mode === "lagrange") {
            const info = this.lagrange();
            return arrowScale(this.half(), [Math.hypot(info.gradF[0], info.gradF[1]), Math.hypot(info.gradG[0], info.gradG[1])], ARROW_FRACTION);
        }
        return 1;
    }

    // ---- The surface ----------------------------------------------------------------------------------------------------

    createSurfaceView(): SurfaceView { return createDefaultSurfaceView(); }

    private surfaceData(): SurfaceMeshData {
        const {fn} = this.state;
        return this.surfaceMemo.get([fn, this.half()], () => surfaceMesh(fn, this.window()));
    }

    private surfaceMarker(): {x: number; y: number; f: number} | undefined {
        const {fn, mode} = this.state;
        const f = CATALOGUE[fn].value;
        const half = this.half();
        let p: {x: number; y: number} | undefined;
        if (mode === "level-sets" || mode === "gradient") p = this.probePoint();
        else if (mode === "descent") p = this.stepPoint();
        else p = this.lagrange();
        if (p === undefined || Math.abs(p.x) > half || Math.abs(p.y) > half) return undefined;
        return {x: p.x, y: p.y, f: f(p.x, p.y)};
    }

    /** The scene of the surface view: rebuilt for another function, window, level or marker; a camera edit only changes the camera. */
    surfaceScene(): SurfaceScene {
        const state = this.state;
        if (this.sceneCache?.state === state) return this.sceneCache.scene;
        const data = this.surfaceData();
        const marker = this.surfaceMarker();
        // levelCount is not in the key: only drawings()[0] (the chosen level) is drawn on the surface.
        const key = [state.fn, this.half(), state.level, marker?.x, marker?.y];
        if (this.sceneKey === undefined || key.length !== this.sceneKey.length || key.some((item, index) => item !== this.sceneKey?.[index])) {
            this.sceneRevision++;
            this.sceneKey = key;
        }
        const scene = buildSurfaceScene({data, camera: this.surfaceCamera(), contour: this.drawings()[0].segments, level: levelOf(state.level), marker}, this.sceneRevision);
        this.sceneCache = {state, scene};
        return scene;
    }

    zScale(): number { return this.surfaceData().zScale; }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("levelsets_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A new board (also the second mount of StrictMode) starts unframed, whatever an earlier board drew.
        this.drawnView = "";
        this.applyView();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => {
                this.stopDriver();
                this.playingValue = false;
                this.status.cancel();
                this.hostListeners.clear();
            });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(previous: Readonly<ContourMapGraphState>): void {
        // Every edit of the scene pauses, whoever made it (a control, a drag, a lesson action, a restore): a stored field changed.
        if (!sameContent(previous, this.state)) this.halt();
        const path = this.state.fn !== previous.fn || !samePair(this.state.start, previous.start) || this.state.step !== previous.step;
        if (path) this.stepValue = 0;
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the view as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.scene.objectCount() === 0) this.buildScene();
            this.drawnView = viewKey(viewBox(this.state));
        }
        this.halt();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.halt();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) {
            this.notifyHost();
            return;
        }
        if (this.scene.objectCount() === 0) this.buildScene();
        this.applyView();
        this.placeHandles();
        this.board.update();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the view of the imported data is only marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    /** Frames the board once per view key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyView(): void {
        const box = viewBox(this.state);
        const key = viewKey(box);
        if (key === this.drawnView) return;
        this.drawnView = key;
        this.board.setBoundingBox([...box], true);
    }

    /** Moves every handle to the stored value (idempotent). */
    private placeHandles(): void {
        const move = (handle: JXG.Point | undefined, x: number, y: number) => {
            if (handle && (handle.X() !== x || handle.Y() !== y)) handle.setPosition(JXG.COORDS_BY_USER, [x, y]);
        };
        const probe = this.probePoint();
        move(this.probeHandle, probe.x, probe.y);
        move(this.startHandle, startOf(this.state.start[0]), startOf(this.state.start[1]));
        const info = this.lagrange();
        move(this.pointHandle, info.x, info.y);
    }

    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    private curve(data: () => Poly, attributes: Partial<JXG.CurveAttributes>): JXG.Curve {
        const element = this.scene.own(this.board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes}));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
        return element;
    }

    private hidden(x: () => number, y: () => number): JXG.Point {
        return this.scene.own(this.board.create("point", [x, y], {name: "", withLabel: false, fixed: true, highlight: false, visible: false, size: 1}));
    }

    /** A segment between two computed points, with an arrowhead when it is a vector. */
    private vector(from: () => readonly [number, number], to: () => readonly [number, number], attributes: Partial<JXG.SegmentAttributes>): void {
        const a = this.hidden(() => from()[0], () => from()[1]);
        const b = this.hidden(() => to()[0], () => to()[1]);
        this.scene.own(this.board.create("segment", [a, b], {fixed: true, highlight: false, withLabel: false, ...attributes}));
    }

    private pixelText(x: () => number, y: () => number, dx: number, dy: number, text: () => string, color: string, visible: () => boolean = () => true): void {
        this.scene.own(this.board.create("text", [
            () => x() + dx / this.scaleOf().ux, () => y() + dy / this.scaleOf().uy, text,
        ], {strokeColor: color, fontSize: 14, anchorX: "left", fixed: true, highlight: false, withLabel: false, visible}));
    }

    private showsProbe(): boolean { return this.state.mode === "level-sets" || this.state.mode === "gradient"; }
    private showsGradient(): boolean { return this.state.mode === "gradient"; }
    private showsDescent(): boolean { return this.state.mode === "descent"; }
    private showsLagrange(): boolean { return this.state.mode === "lagrange"; }

    /** The legend: one row for every element the readouts name, the drawing style in words. Used by the board and by the panel list. */
    legend(): LegendRow[] {
        const rows: LegendRow[] = [{id: "levels", text: t("levelsets_graph_cap_levels"), color: GraphPalette.primaryCurve}];
        if (this.state.levelCount > 1) rows.push({id: "levels-more", text: t("levelsets_graph_cap_levels_more"), color: GraphPalette.comparisonCurve});
        if (this.showsProbe()) rows.push({id: "probe", text: t("levelsets_graph_cap_probe"), color: GraphPalette.controlPoint});
        if (this.state.mode !== "descent") rows.push({id: "through", text: t("levelsets_graph_cap_through"), color: GraphPalette.constructionAccent});
        if (this.showsGradient()) {
            rows.push({id: "gradient", text: t("levelsets_graph_cap_gradient"), color: GraphPalette.additionalCurves[1]});
            if (!this.gradient().stationary) rows.push({id: "tangent", text: t("levelsets_graph_cap_tangent"), color: GraphPalette.additionalCurves[3]});
        }
        if (this.showsDescent()) {
            rows.push({id: "start", text: t("levelsets_graph_cap_start"), color: GraphPalette.controlPoint});
            rows.push({id: "path", text: t("levelsets_graph_cap_path"), color: GraphPalette.additionalCurves[1]});
            rows.push({id: "current", text: t("levelsets_graph_cap_current"), color: GraphPalette.label});
            if (firstOutsideDrawing(this.descent(), this.half()) !== null) rows.push({id: "cut", text: t("levelsets_graph_cap_cut"), color: GraphPalette.warningText});
        }
        if (this.showsLagrange()) {
            rows.push({id: "constraint", text: t("levelsets_graph_cap_constraint"), color: GraphPalette.additionalCurves[3]});
            rows.push({id: "point", text: t("levelsets_graph_cap_point"), color: GraphPalette.controlPoint});
            rows.push({id: "grad-f", text: t("levelsets_graph_cap_grad_f"), color: GraphPalette.additionalCurves[1]});
            rows.push({id: "grad-g", text: t("levelsets_graph_cap_grad_g"), color: GraphPalette.additionalCurves[4]});
            if (this.marksTangency()) rows.push({id: "tangency", text: t("levelsets_graph_cap_tangency"), color: GraphPalette.label});
        }
        if (this.arrowFactor() !== 1) rows.push({id: "scale", text: t("levelsets_graph_cap_scale", {value0: dec(this.arrowFactor(), 3)}), color: GraphPalette.label});
        return rows;
    }

    private marksTangency(): boolean { return this.tangentMarks().length > 0; }

    /** The points of tangency that are marked: the one point of the line, or the few approximately tangent points of the circle. */
    private tangentMarks(): readonly (readonly [number, number])[] {
        if (!this.showsLagrange()) return [];
        if (this.constraint() === "line") {
            const info = this.lagrange();
            return info.tangency.kind === "exact" && info.tangency.points.kind === "point"
                ? [[info.tangency.points.point.x.toNumber(), info.tangency.points.point.y.toNumber()]] : [];
        }
        const params = this.tangentParams();
        if (params.length === 0 || params.length > TANGENT_MARKS) return [];
        return params.map((k): readonly [number, number] => [Math.sqrt(2) * Math.cos(circleAngleOf(k)), Math.sqrt(2) * Math.sin(circleAngleOf(k))]);
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const state = () => this.state;

        // Contours: the extra levels, the chosen level, then the dashed contour through the probe or the constrained point.
        this.curve(() => this.levelCurves().others, {strokeColor: GraphPalette.comparisonCurve, ...DRAWN_STYLE["levels-more"]});
        this.curve(() => this.levelCurves().chosen, {strokeColor: GraphPalette.primaryCurve, ...DRAWN_STYLE.levels});
        this.curve(() => this.through(), {strokeColor: GraphPalette.constructionAccent, ...DRAWN_STYLE.through, visible: () => state().mode !== "descent"});
        this.curve(() => this.constraintCurve(), {strokeColor: GraphPalette.additionalCurves[3], ...DRAWN_STYLE.constraint, visible: () => this.showsLagrange()});
        this.curve(() => (this.showsDescent() ? pathPoly(this.descent(), this.stepValue, this.half()) : emptyPoly()),
            {strokeColor: GraphPalette.additionalCurves[1], ...DRAWN_STYLE.path, visible: () => this.showsDescent()});

        // Gradient and tangent at the probe (LS2): one common arrow scale, stated in the legend and in a readout.
        const probe = (): readonly [number, number] => { const p = this.probePoint(); return [p.x, p.y]; };
        this.vector(probe, () => { const g = this.gradient(); const p = this.probePoint(); const s = this.arrowFactor(); return [p.x + s * g.gradient[0], p.y + s * g.gradient[1]]; },
            {strokeColor: GraphPalette.additionalCurves[1], ...DRAWN_STYLE.gradient, lastArrow: true, visible: () => this.showsGradient() && !this.gradient().stationary});
        const tangentEnd = (sign: 1 | -1) => (): readonly [number, number] => {
            const p = this.probePoint();
            const u = this.gradient().tangent ?? [0, 0];
            return [p.x + sign * TANGENT_HALF * this.half() * u[0], p.y + sign * TANGENT_HALF * this.half() * u[1]];
        };
        this.vector(tangentEnd(-1), tangentEnd(1),
            {strokeColor: GraphPalette.additionalCurves[3], ...DRAWN_STYLE.tangent, visible: () => this.showsGradient() && !this.gradient().stationary});

        // The two gradients at the constrained point (LS4).
        const onConstraint = (): readonly [number, number] => { const info = this.lagrange(); return [info.x, info.y]; };
        this.vector(onConstraint, () => { const i = this.lagrange(); const s = this.arrowFactor(); return [i.x + s * i.gradF[0], i.y + s * i.gradF[1]]; },
            {strokeColor: GraphPalette.additionalCurves[1], ...DRAWN_STYLE["grad-f"], lastArrow: true, visible: () => this.showsLagrange()});
        this.vector(onConstraint, () => { const i = this.lagrange(); const s = this.arrowFactor(); return [i.x + s * i.gradG[0], i.y + s * i.gradG[1]]; },
            {strokeColor: GraphPalette.additionalCurves[4], ...DRAWN_STYLE["grad-g"], lastArrow: true, visible: () => this.showsLagrange()});

        // Tangency marks (LS4): the exact point of the line, or the few approximately tangent points of the circle.
        for (let i = 0; i < TANGENT_MARKS; i++) {
            this.scene.own(board.create("point", [() => this.tangentMarks()[i]?.[0] ?? 0, () => this.tangentMarks()[i]?.[1] ?? 0], {
                name: "", withLabel: false, fixed: true, highlight: false, size: 5, face: "x", strokeColor: GraphPalette.label, fillColor: GraphPalette.label,
                visible: () => i < this.tangentMarks().length,
            }));
        }

        // The shown descent step (hollow square) and the handles (draggable, snapped; typed values are refused instead).
        this.scene.own(board.create("point", [() => this.stepPoint()?.x ?? 0, () => this.stepPoint()?.y ?? 0], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 5, face: "[]", strokeColor: GraphPalette.label, fillColor: "none",
            visible: () => this.showsDescent() && this.stepPoint() !== undefined,
        }));
        const makeHandle = (x: number, y: number, visible: () => boolean, onDrag: (handle: JXG.Point) => void): JXG.Point => {
            const handle: JXG.Point = this.scene.own(board.create("point", [x, y], {
                name: "", withLabel: false, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
                highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false, visible,
                precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
            }));
            this.wireDrag(handle, () => onDrag(handle));
            return handle;
        };
        const p0 = this.probePoint();
        this.probeHandle = makeHandle(p0.x, p0.y, () => this.showsProbe(), handle => this.dragProbe(handle));
        this.startHandle = makeHandle(startOf(this.state.start[0]), startOf(this.state.start[1]), () => this.showsDescent(), handle => this.dragStart(handle));
        const c0 = this.lagrange();
        this.pointHandle = makeHandle(c0.x, c0.y, () => this.showsLagrange(), handle => this.dragPoint(handle));
        const probeHandle = this.probeHandle, startHandle = this.startHandle, pointHandle = this.pointHandle;
        this.pixelText(() => probeHandle.X(), () => probeHandle.Y(), 10, 10, () => t("levelsets_graph_label_probe", {value0: point(probeHandle.X(), probeHandle.Y())}),
            GraphPalette.controlPoint, () => this.showsProbe());
        this.pixelText(() => startHandle.X(), () => startHandle.Y(), 10, 10, () => t("levelsets_graph_label_start", {value0: point(startHandle.X(), startHandle.Y())}),
            GraphPalette.controlPoint, () => this.showsDescent());
        this.pixelText(() => pointHandle.X(), () => pointHandle.Y(), 10, 10, () => t("levelsets_graph_label_point", {value0: point(pointHandle.X(), pointHandle.Y())}),
            GraphPalette.controlPoint, () => this.showsLagrange());

        // The legend: stacked from the top left. It names every element the readout names.
        const MAX_ROWS = 12;
        for (let index = 0; index < MAX_ROWS; index++) {
            this.scene.own(board.create("text", [
                () => { const {left, ux} = this.scaleOf(); return left + 10 / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - legendRowOffset(this.legend().map(row => row.text), index, board.canvasWidth) / uy; },
                () => this.legend()[index]?.text ?? "",
            ], {strokeColor: GraphPalette.label, fontSize: 14, anchorX: "left", anchorY: "top", fixed: true, highlight: false,
                withLabel: false, visible: () => index < this.legend().length}));
        }
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.probeHandle = undefined;
        this.startHandle = undefined;
        this.pointHandle = undefined;
    }

    // ---- Dragging: snapping for the handles; typed values are refused instead -------------------------------------------------

    private wireDrag(handle: JXG.Point, onDrag: () => void): void {
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        handle.on("drag", onDrag);
        handle.on("over", onOver);
        handle.on("out", onOut);
        this.scene.listen(() => { handle.off("drag", onDrag); handle.off("over", onOver); handle.off("out", onOut); });
    }

    /** The coordinate pair a drag snapped to, clamped to the grid range and to the window of the function (like the LP handle), or undefined for a non-finite drag. */
    private snapPair(handle: JXG.Point, scale: number, limit: number): [number, number] | undefined {
        const edge = Math.min(limit, Math.floor(windowHalf(this.state.fn) * scale + 1e-9));
        const range = {min: -edge, max: edge};
        const x = snapGrid(handle.X(), scale, range);
        const y = snapGrid(handle.Y(), scale, range);
        return x === undefined || y === undefined ? undefined : [x, y];
    }

    private dragProbe(handle: JXG.Point): void {
        const snapped = this.snapPair(handle, PROBE_SCALE, PROBE_RANGE.max);
        if (snapped === undefined) { this.placeHandles(); return; }
        if (!samePair(snapped, this.state.probe)) this.edit({probe: snapped});
        handle.setPosition(JXG.COORDS_BY_USER, [probeOf(snapped[0]), probeOf(snapped[1])]);
    }

    private dragStart(handle: JXG.Point): void {
        const snapped = this.snapPair(handle, START_SCALE, START_RANGE.max);
        if (snapped === undefined) { this.placeHandles(); return; }
        if (!samePair(snapped, this.state.start)) this.edit({start: snapped});
        handle.setPosition(JXG.COORDS_BY_USER, [startOf(snapped[0]), startOf(snapped[1])]);
    }

    /** The point stays on the constraint: a line takes the nearest quarter of its x, a circle the nearest of its 48 angles. */
    private dragPoint(handle: JXG.Point): void {
        if (this.constraint() === "line") {
            const T = snapGrid(handle.X(), LINE_PARAM_SCALE, LINE_PARAM_RANGE);
            if (T === undefined) { this.placeHandles(); return; }
            if (T !== this.state.lineParam) this.edit({lineParam: T});
        } else {
            const K = circleParamNear(handle.X(), handle.Y(), CIRCLE_STEPS);
            if (K === undefined) { this.placeHandles(); return; }
            if (K !== this.state.circleParam) this.edit({circleParam: K});
        }
        this.placeHandles();
    }

    // ---- Playback and the step -------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private stopDriver(): void {
        this.driver?.dispose();
        this.driver = undefined;
    }

    /** Stops the frame loop; the step stays where it is. */
    private halt(): void {
        this.stopDriver();
        if (!this.playingValue) return;
        this.playingValue = false;
        this.notifyHost();
    }

    override pausePlayback(): void {
        this.halt();
        if (this.hasBoard && this.graphSession?.isAlive) this.status.report(this.statusText());
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the current step (from 0 at the end). Under reduced motion nothing moves; the step controls still work. */
    play(): void {
        if (this.playingValue || this.reducedMotion() || this.state.mode !== "descent" || !this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.stepValue >= this.lastStep()) this.stepValue = 0;
        this.playingValue = true;
        this.clock = 0;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
    }

    private advance(delta: number): void {
        if (!this.playingValue || !this.graphSession?.isAlive) return;
        this.clock += Math.min(Math.max(delta, 0), MAX_FRAME_MS);
        const last = this.lastStep();
        while (this.clock >= STEP_MS && this.stepValue < last) {
            this.clock -= STEP_MS;
            this.stepValue++;
        }
        const finished = this.stepValue >= last;
        if (finished) this.halt();
        this.boardUpdate();
        // While playing only a change of the wording is announced; the moment the run stops the full sentence is.
        this.status.report(finished ? this.statusText() : this.sentence());
        this.notifyHost();
    }

    /** The step slider and the lesson actions: a whole step of the path; anything else is refused. Setting it pauses the playback. */
    setStepIndex(value: number): boolean {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > this.lastStep()) return false;
        this.halt();
        this.stepValue = value;
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
        return true;
    }

    nextStep(): void {
        if (this.stepValue < this.lastStep()) this.setStepIndex(this.stepValue + 1);
    }

    resetSteps(): void {
        this.halt();
        this.stepValue = 0;
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
    }

    /** The step of a lesson checkpoint; playback is never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), contourStep: this.stepValue};
    }

    /** Every scene replacement lands stopped, at the saved step when it is valid and at step 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const step = saved?.contourStep;
        this.halt();
        this.notice = undefined;
        const valid = typeof step === "number" && Number.isInteger(step) && step >= 0 && step <= this.lastStep();
        // A saved step outside the path is refused, not clamped (restored values are never changed); the step is 0 and the status says so.
        this.stepValue = valid ? step : 0;
        if (step !== undefined && !valid) this.notice = {state: this.state, text: () => t("levelsets_graph_notice_step_refused")};
        this.notifyHost();
    }

    protected override stopLessonAnimations(): void { this.halt(); }

    protected override beforeFigureCapture(): void { this.halt(); }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<ContourState>): void {
        this.halt();
        this.setState(patch);
        this.requestRender();
    }

    setMode(mode: ContourMode): void {
        if (CONTOUR_MODES.includes(mode) && mode !== this.state.mode) this.edit({mode});
    }

    setFunction(fn: CatalogueId): void {
        if (!CATALOGUE_IDS.includes(fn) || fn === this.state.fn) return;
        const next = withFunction(this.state, fn);
        this.edit({fn: next.fn, probe: next.probe, start: next.start, constraint: next.constraint});
    }

    /** A typed level: on the 1/8 grid inside the range, otherwise refused (false), never rounded or clamped. */
    setLevel(value: number): boolean {
        const L = typedGrid(value, LEVEL_SCALE, LEVEL_RANGE);
        if (L === undefined) return false;
        if (L !== this.state.level) this.edit({level: L});
        return true;
    }

    setLevelCount(count: number): boolean {
        if (!Number.isInteger(count) || count < LEVEL_COUNT_RANGE.min || count > LEVEL_COUNT_RANGE.max) return false;
        if (count !== this.state.levelCount) this.edit({levelCount: count});
        return true;
    }

    /** A typed probe coordinate: on the 1/20 grid inside the window of the function, otherwise refused. */
    setProbe(axis: 0 | 1, value: number): boolean {
        const P = typedGrid(value, PROBE_SCALE, PROBE_RANGE);
        if (P === undefined || !probeFits(this.state.fn, P)) return false;
        if (P !== this.state.probe[axis]) this.edit({probe: axis === 0 ? [P, this.state.probe[1]] : [this.state.probe[0], P]});
        return true;
    }

    setNumeric(numeric: boolean): void {
        if (numeric !== this.state.numeric) this.edit({numeric});
    }

    /** A typed start coordinate: on the 1/4 grid inside the window of the function, otherwise refused. */
    setStart(axis: 0 | 1, value: number): boolean {
        const S = typedGrid(value, START_SCALE, START_RANGE);
        if (S === undefined || !startFits(this.state.fn, S)) return false;
        if (S !== this.state.start[axis]) this.edit({start: axis === 0 ? [S, this.state.start[1]] : [this.state.start[0], S]});
        return true;
    }

    /** The step number H, a whole number from 1 to 30 (h = H/100). */
    setStep(H: number): boolean {
        const checked = typedGrid(H, 1, STEP_RANGE);
        if (checked === undefined) return false;
        if (checked !== this.state.step) this.edit({step: checked});
        return true;
    }

    setConstraint(constraint: ConstraintId): boolean {
        if (!CONSTRAINT_IDS.includes(constraint) || !constraintAccepts(this.state.fn, constraint)) return false;
        if (constraint !== this.state.constraint) this.edit({constraint});
        return true;
    }

    /** A typed x of the point on the line: on the 1/4 grid inside the range, otherwise refused. */
    setLineX(value: number): boolean {
        const T = typedGrid(value, LINE_PARAM_SCALE, LINE_PARAM_RANGE);
        if (T === undefined) return false;
        if (T !== this.state.lineParam) this.edit({lineParam: T});
        return true;
    }

    setCircleStep(K: number): boolean {
        const checked = typedGrid(K, 1, CIRCLE_PARAM_RANGE);
        if (checked === undefined) return false;
        if (checked !== this.state.circleParam) this.edit({circleParam: checked});
        return true;
    }

    // ---- The camera of the surface (stored) -------------------------------------------------------------------------------

    setCamera(camera: SurfaceCamera): void {
        const next = {az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [camera.target[0], camera.target[1], camera.target[2]] as const};
        if (![next.az, next.el, next.distance, ...next.target].every(Number.isFinite) || next.distance <= 0) return;
        this.edit({camera: next});
    }

    private surfaceCamera(): SurfaceCamera {
        const {az, el, distance, projection, target} = this.state.camera;
        return {az, el, distance, projection, target: [target[0], target[1], target[2]]};
    }

    setCameraAngle(angle: "az" | "el", degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        const radians = degrees * Math.PI / 180;
        const camera = this.surfaceCamera();
        this.setCamera(angle === "az" ? {...camera, az: radians} : {...camera, el: clamp(radians, -CAMERA_PRESETS.top.el, CAMERA_PRESETS.top.el)});
    }

    applyCameraPreset(name: CameraPresetName): void {
        this.setCamera(presetCamera(name, this.surfaceCamera()));
    }

    resetView(): void {
        const {az, el, distance, projection, target} = DEFAULT_CONTOUR_STATE.camera;
        this.setCamera({az, el, distance, projection, target: [target[0], target[1], target[2]]});
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    fnName(): string { return t(FUNCTION_KEYS[this.state.fn]); }

    private behaviourText(): string {
        const info = this.descent();
        return info.behaviour === undefined ? t("levelsets_graph_claim_none") : t(BEHAVIOUR_KEYS[info.behaviour]);
    }

    /** The exact line test or the approximate circle test, in words. */
    tangencyText(): string {
        const info = this.lagrange();
        const tangency = info.tangency;
        if (tangency.kind === "exact") {
            return tangency.tangency.tangent
                ? t("levelsets_graph_tangency_line_yes", {value0: tangency.tangency.lambda === null ? "0" : rationalText(tangency.tangency.lambda)})
                : t("levelsets_graph_tangency_line_no", {value0: rationalText(tangency.tangency.determinant)});
        }
        const circle = tangency.tangency;
        if (circle.status === "stationary") return t("levelsets_graph_tangency_circle_stationary");
        return t(circle.status === "approximately-tangent" ? "levelsets_graph_tangency_circle_yes" : "levelsets_graph_tangency_circle_no", {value0: dec(circle.sin, 4)});
    }

    /** The wording without the step: what the picture shows in the current mode, and the notice. */
    sentence(): string {
        const state = this.state;
        let text: string;
        if (state.mode === "level-sets") {
            text = t("levelsets_graph_status_level_sets", {value0: this.fnName(), value1: dec(levelOf(state.level)), value2: String(state.levelCount)});
        } else if (state.mode === "gradient") {
            const g = this.gradient();
            const p = this.probePoint();
            text = g.stationary
                ? t("levelsets_graph_status_stationary", {value0: point(p.x, p.y)})
                : t("levelsets_graph_status_gradient", {value0: point(p.x, p.y), value1: point(g.gradient[0], g.gradient[1], 4), value2: dec(g.norm, 4)});
            if (state.numeric && !g.stationary) text += " " + t("levelsets_graph_status_numeric", {value0: dec(numericGradient(state.fn, p.x, p.y).error, 7)});
        } else if (state.mode === "descent") {
            text = t("levelsets_graph_status_descent", {
                value0: this.fnName(), value1: point(startOf(state.start[0]), startOf(state.start[1])), value2: dec(stepOf(state.step), 2), value3: this.behaviourText()});
        } else {
            const info = this.lagrange();
            text = t("levelsets_graph_status_lagrange", {value0: t(CONSTRAINT_KEYS[this.constraint()]), value1: point(info.x, info.y), value2: dec(info.f, 4), value3: this.tangencyText()});
        }
        return this.notice && this.notice.state === state ? `${text} ${this.notice.text()}` : text;
    }

    /** The status sentence; while descending it begins with the step. */
    statusText(): string {
        if (this.state.mode !== "descent") return this.sentence();
        return `${t("levelsets_graph_status_step", {value0: String(this.stepValue), value1: String(this.lastStep())})} ${this.sentence()}`;
    }

    readoutRows(): ReadoutListRow[] {
        const state = this.state;
        const rows: ReadoutListRow[] = [{id: "function", label: t("levelsets_graph_r_function"), value: this.fnName()}];
        const curves = this.levelCurves();
        const c = levelOf(state.level);
        const values = levelValues(c, state.levelCount, state.fn);
        rows.push({id: "level", label: t("levelsets_graph_r_level"), value: state.levelCount === 1 ? dec(c)
            : t("levelsets_graph_levels_value", {value0: dec(values[0]), value1: dec(values[values.length - 1]), value2: dec(values[1] - values[0])})});
        rows.push({id: "length", label: t("levelsets_graph_r_length"), value: dec(curves.length, 4)});
        rows.push({id: "window", label: t("levelsets_graph_r_window"), value: t("levelsets_graph_window_value", {value0: dec(this.half(), 0), value1: String(GRID_N), value2: String(SURFACE_N)})});
        rows.push({id: "zscale", label: t("levelsets_graph_r_zscale"), value: t("levelsets_graph_zscale_value", {value0: dec(this.zScale(), 6)})});
        if (this.showsProbe()) this.probeRows(rows);
        if (this.showsDescent()) this.descentRows(rows);
        if (this.showsLagrange()) this.lagrangeRows(rows);
        return rows;
    }

    private probeRows(rows: ReadoutListRow[]): void {
        const state = this.state;
        const p = this.probePoint();
        const g = this.gradient();
        rows.push({id: "probe", label: t("levelsets_graph_r_probe"), value: point(p.x, p.y)});
        rows.push({id: "probe-f", label: t("levelsets_graph_r_probe_f"), value: dec(CATALOGUE[state.fn].value(p.x, p.y), 6)});
        if (state.mode !== "gradient") return;
        rows.push({id: "gradient", label: t("levelsets_graph_r_gradient"), value: g.stationary ? t("levelsets_graph_gradient_zero") : point(g.gradient[0], g.gradient[1], 7)});
        rows.push({id: "norm", label: t("levelsets_graph_r_norm"), value: dec(g.norm, 7)});
        rows.push({id: "tangent", label: t("levelsets_graph_r_tangent"), value: g.tangent === null ? t("levelsets_graph_tangent_none") : point(g.tangent[0], g.tangent[1], 7)});
        rows.push({id: "dot", label: t("levelsets_graph_r_dot"), value: g.dot === null ? t("levelsets_graph_tangent_none") : dec(g.dot, 7)});
        rows.push({id: "scale", label: t("levelsets_graph_r_scale"), value: this.arrowFactor() === 1 ? t("levelsets_graph_scale_full") : t("levelsets_graph_scale_value", {value0: dec(this.arrowFactor(), 3)})});
        if (state.numeric) {
            const n = numericGradient(state.fn, p.x, p.y);
            rows.push({id: "numeric", label: t("levelsets_graph_r_numeric"), value: point(n.estimate[0], n.estimate[1], 7)});
            rows.push({id: "numeric-error", label: t("levelsets_graph_r_numeric_error"), value: dec(n.error, 7)});
        }
    }

    private descentRows(rows: ReadoutListRow[]): void {
        const state = this.state;
        const info = this.descent();
        const path = info.result.path;
        const here = path[Math.min(this.stepValue, path.length - 1)];
        const outside = firstOutsideDrawing(info, this.half());
        rows.push({id: "start", label: t("levelsets_graph_r_start"), value: point(startOf(state.start[0]), startOf(state.start[1]))});
        rows.push({id: "step", label: t("levelsets_graph_r_step"), value: t("levelsets_graph_step_value", {value0: String(state.step), value1: dec(stepOf(state.step), 2)})});
        rows.push({id: "steps", label: t("levelsets_graph_r_steps"), value: t("levelsets_graph_steps_value", {value0: String(this.stepValue), value1: String(this.lastStep())})});
        rows.push({id: "iterate", label: t("levelsets_graph_r_iterate", {value0: subscript(this.stepValue)}), value: point(here.x, here.y, 6)});
        rows.push({id: "iterate-f", label: t("levelsets_graph_r_iterate_f"), value: dec(CATALOGUE[state.fn].value(here.x, here.y), 6)});
        rows.push({id: "settled", label: t("levelsets_graph_r_settled"), value: info.settledAt === null ? t("levelsets_graph_settled_never", {value0: String(DESCENT_MAX_STEPS)}) : String(info.settledAt)});
        rows.push({id: "claim", label: t("levelsets_graph_r_claim"), value: this.behaviourText()});
        rows.push({id: "stop", label: t("levelsets_graph_r_stop"), value: info.result.stop === "cap"
            ? t("levelsets_graph_stop_cap", {value0: String(path.length - 1)}) : t("levelsets_graph_stop_escaped", {value0: String(path.length - 1)})});
        if (outside !== null) rows.push({id: "drawn", label: t("levelsets_graph_r_drawn"), value: t("levelsets_graph_drawn_value", {value0: String(outside - 1)})});
    }

    private lagrangeRows(rows: ReadoutListRow[]): void {
        const info = this.lagrange();
        rows.push({id: "constraint", label: t("levelsets_graph_r_constraint"), value: t(CONSTRAINT_KEYS[this.constraint()])});
        rows.push({id: "point", label: t("levelsets_graph_r_point"), value: point(info.x, info.y, 4)});
        rows.push({id: "point-f", label: t("levelsets_graph_r_point_f"), value: dec(info.f, 6)});
        rows.push({id: "grad-f", label: t("levelsets_graph_r_grad_f"), value: point(info.gradF[0], info.gradF[1], 5)});
        rows.push({id: "grad-g", label: t("levelsets_graph_r_grad_g"), value: point(info.gradG[0], info.gradG[1], 5)});
        rows.push({id: "tangency", label: t("levelsets_graph_r_tangency"), value: this.tangencyText()});
        rows.push({id: "scale", label: t("levelsets_graph_r_scale"), value: this.arrowFactor() === 1 ? t("levelsets_graph_scale_full") : t("levelsets_graph_scale_value", {value0: dec(this.arrowFactor(), 3)})});
        if (info.tangency.kind === "exact") {
            const points = info.tangency.points;
            const text = points.kind === "point" ? this.exactPointText(points.point.x, points.point.y)
                : points.kind === "none" ? t("levelsets_graph_tangent_points_none") : t("levelsets_graph_tangent_points_everywhere");
            rows.push({id: "tangent-points", label: t("levelsets_graph_r_tangent_points"), value: text});
        } else {
            rows.push({id: "tangent-points", label: t("levelsets_graph_r_tangent_count"),
                value: t("levelsets_graph_tangent_count_value", {value0: String(circleTangentCount(this.state.fn)), value1: String(CIRCLE_STEPS)})});
        }
    }

    /** An exact point as fractions, with the decimals beside it when either coordinate is a fraction (as the linear program does). */
    private exactPointText(x: Rational, y: Rational): string {
        const exact = t("levelsets_graph_point_format", {value0: rationalText(x), value1: rationalText(y)});
        return x.den === 1n && y.den === 1n ? exact
            : t("levelsets_graph_lp_exact_decimal", {value0: exact, value1: point(x.toNumber(), y.toNumber(), 4)});
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private inputHelp(): JSX.Element {
        const half = dec(this.half(), 0);
        return <p key="help" id={this.helpId} className="form-text">{t("levelsets_graph_input_help", {
            value0: dec(LEVEL_RANGE.min / LEVEL_SCALE, 0), value1: dec(LEVEL_RANGE.max / LEVEL_SCALE, 0), value2: dec(1 / LEVEL_SCALE, 3),
            value3: half, value4: dec(1 / PROBE_SCALE, 2), value5: dec(1 / START_SCALE, 2),
            value6: dec(STEP_RANGE.min, 0), value7: dec(STEP_RANGE.max, 0),
            value8: dec(lineParamOf(LINE_PARAM_RANGE.min), 0), value9: dec(lineParamOf(LINE_PARAM_RANGE.max), 0),
        })}</p>;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const describedBy = this.helpId;
        const axisField = (axis: 0 | 1, label: string, value: number, scale: number, edit: (axis: 0 | 1, value: number) => boolean) =>
            <NumberInput key={`${label}`} label={label} value={value} step={1 / scale} bigStep={1} min={-this.half()} max={this.half()} decimals={2} describedBy={describedBy}
                         onChange={next => edit(axis, next)}/>;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("levelsets_graph_mode")} value={state.mode} help={t(MODE_HELP_KEYS[state.mode])}
                          options={CONTOUR_MODES.map(value => ({value, text: t(MODE_KEYS[value])}))}
                          onChange={value => { const mode = CONTOUR_MODES.find(candidate => candidate === value); if (mode) this.setMode(mode); }}/>,
            <ChoiceSelect key="fn" label={t("levelsets_graph_fn")} value={state.fn} help={t("levelsets_graph_fn_help")}
                          options={CATALOGUE_IDS.map(value => ({value, text: t(FUNCTION_KEYS[value])}))}
                          onChange={value => { const fn = CATALOGUE_IDS.find(candidate => candidate === value); if (fn) this.setFunction(fn); }}/>,
            <Slider key="level" customText={t("levelsets_graph_level")} min={LEVEL_RANGE.min / LEVEL_SCALE} max={LEVEL_RANGE.max / LEVEL_SCALE} step={1 / LEVEL_SCALE}
                    bigStep={1} decimals={3} value={levelOf(state.level)} help={t("levelsets_graph_level_help", {value0: dec(LEVEL_RANGE.min / LEVEL_SCALE, 0), value1: dec(LEVEL_RANGE.max / LEVEL_SCALE, 0), value2: dec(1 / LEVEL_SCALE, 3)})}
                    rejectedHint={t("levelsets_graph_level_rejected", {value0: dec(LEVEL_RANGE.min / LEVEL_SCALE, 0), value1: dec(LEVEL_RANGE.max / LEVEL_SCALE, 0), value2: dec(1 / LEVEL_SCALE, 3)})}
                    valueText={value => t("levelsets_graph_level_value", {value0: dec(value, 3)})} onChange={value => this.setLevel(value)}/>,
            <CountSetter key="count" label={t("levelsets_graph_count")} n={state.levelCount} min={LEVEL_COUNT_RANGE.min} max={LEVEL_COUNT_RANGE.max} bigStep={1}
                         minusLabel={t("levelsets_graph_count_minus")} plusLabel={t("levelsets_graph_count_plus")}
                         help={t("levelsets_graph_count_help", {value0: String(LEVEL_COUNT_RANGE.min), value1: String(LEVEL_COUNT_RANGE.max)})}
                         onPlus={() => this.setLevelCount(state.levelCount + 1)} onMinus={() => this.setLevelCount(state.levelCount - 1)}
                         onSet={value => this.setLevelCount(value)}/>,
        ];
        if (this.showsProbe()) {
            const p = this.probePoint();
            commands.push(axisField(0, t("levelsets_graph_probe_x"), p.x, PROBE_SCALE, (axis, value) => this.setProbe(axis, value)),
                axisField(1, t("levelsets_graph_probe_y"), p.y, PROBE_SCALE, (axis, value) => this.setProbe(axis, value)));
        }
        if (this.showsGradient()) {
            commands.push(<BooleanField key="numeric" variant="checkbox" label={t("levelsets_graph_numeric")} help={t("levelsets_graph_numeric_help")} checked={state.numeric}
                                        describedBy={describedBy} onChange={checked => this.setNumeric(checked)}/>);
        }
        if (this.showsDescent()) {
            commands.push(axisField(0, t("levelsets_graph_start_x"), startOf(state.start[0]), START_SCALE, (axis, value) => this.setStart(axis, value)),
                axisField(1, t("levelsets_graph_start_y"), startOf(state.start[1]), START_SCALE, (axis, value) => this.setStart(axis, value)),
                <Slider key="step" customText={t("levelsets_graph_step")} min={STEP_RANGE.min} max={STEP_RANGE.max} step={1} grid={1} bigStep={1} decimals={0} value={state.step}
                        help={t("levelsets_graph_step_help", {value0: String(STEP_RANGE.min), value1: String(STEP_RANGE.max), value2: dec(STEP_RANGE.min / STEP_SCALE, 2), value3: dec(STEP_RANGE.max / STEP_SCALE, 2)})}
                        rejectedHint={t("levelsets_graph_step_rejected", {value0: String(STEP_RANGE.min), value1: String(STEP_RANGE.max)})}
                        valueText={value => t("levelsets_graph_step_value", {value0: dec(value, 0), value1: dec(stepOf(Math.round(value)), 2)})}
                        onChange={value => this.setStep(value)}/>);
        }
        if (this.showsLagrange()) {
            const hills = !constraintAccepts(state.fn, "line");
            commands.push(<ChoiceSelect key="constraint" label={t("levelsets_graph_constraint")} value={this.constraint()} help={t("levelsets_graph_constraint_help")}
                                        options={CONSTRAINT_IDS.filter(id => constraintAccepts(state.fn, id)).map(value => ({value, text: t(CONSTRAINT_KEYS[value])}))}
                                        reason={hills ? t("levelsets_graph_constraint_hills_reason") : undefined}
                                        onChange={value => { const id = CONSTRAINT_IDS.find(candidate => candidate === value); if (id) this.setConstraint(id); }}/>);
            if (this.constraint() === "line") {
                commands.push(<NumberInput key="line-x" label={t("levelsets_graph_line_x")} value={lineParamOf(state.lineParam)} step={1 / LINE_PARAM_SCALE} bigStep={1}
                                           min={lineParamOf(LINE_PARAM_RANGE.min)} max={lineParamOf(LINE_PARAM_RANGE.max)} decimals={2} describedBy={describedBy}
                                           onChange={value => this.setLineX(value)}/>);
            } else {
                commands.push(<Slider key="circle" customText={t("levelsets_graph_circle_angle")} min={CIRCLE_PARAM_RANGE.min} max={CIRCLE_PARAM_RANGE.max} step={1} grid={1} bigStep={6}
                                      decimals={0} value={state.circleParam}
                                      help={t("levelsets_graph_circle_help", {value0: String(CIRCLE_PARAM_RANGE.min), value1: String(CIRCLE_PARAM_RANGE.max), value2: dec(360 / CIRCLE_STEPS, 1)})}
                                      rejectedHint={t("levelsets_graph_circle_rejected", {value0: String(CIRCLE_PARAM_RANGE.min), value1: String(CIRCLE_PARAM_RANGE.max)})}
                                      valueText={value => t("levelsets_graph_circle_value", {value0: dec((value * 360) / CIRCLE_STEPS, 1)})}
                                      onChange={value => this.setCircleStep(value)}/>);
            }
        }
        commands.push(this.inputHelp());
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <ContourPlayback graph={this}/>
            <ContourSurfacePanel graph={this}/>
            <ContourReadout graph={this}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <SurfaceCameraPanel camera={this.state.camera} actions={this}/>;
    }
}

export default ContourMapGraph;
