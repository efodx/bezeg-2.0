import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {SceneStateUpdate} from "../base/SceneStore";
import {currentLanguage, message, onLanguageChange, renderMessage, t, type Message} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned} from "../base/controls/PuckOwnership";
import {DomainError} from "../functions/BaseFunctionGraph";
import type {FormattedValue, GraphDeclaration, ParameterDeclaration, ReadoutRow as DeclaredRow, ViewMark, ViewMarks} from "../base/declare/graphDeclaration";
import {formatNumber, formatScientific} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {recursionCobwebPresetCollection} from "./recursionPresetCollection";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController} from "../../learning/runtime/iterationController";
import {ITERATION_MAX_STEPS} from "../../recursion/iteration";
import {
    C_RANGE, C_SCALE, CobwebDerived, COBWEB_MAPS, CobwebMap, CobwebState, DEFAULT_COBWEB_STATE, deriveCobweb, M_RANGE, M_SCALE, R_RANGE, R_SCALE,
    parseCobwebState, serializeCobwebState, snapDragInteger, startOf, startRange, typedInteger, withMap, X_SCALE,
} from "../../recursion/recursionModel";
import {clearOfYAxis, focusFrame, legendInFrame, openingFrame} from "./cobwebFocus";
import {affineEquation, captionPlace, CaptionScale, cobwebPath, inView, mapSamples, Polyline, subscript, VIEW_BOXES} from "./cobwebScene";
import {SceneObjects} from "./SceneObjects";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The scene state: the stored cobweb fields (`CobwebState`), nothing derived and no playback. */
export interface RecursionCobwebGraphState extends BaseGraphState, CobwebState {}

/** Time between two playback steps (the speed slider writes the graph field, not the stored state: a reopened Preset is paused). */
export const SPEED_MIN = 200;
export const SPEED_MAX = 2000;
export const SPEED_STEP = 100;
export const SPEED_DEFAULT = 600;
export const HANDLE_SIZE = 6;
/** The first steps of the cobweb the view director keeps visible. */
const VIEW_MARK_STEPS = 6;
/** The share of the frame width, on each side, that captions keep clear of. */
const CAPTION_INSET = 0.13;

const dec = (value: number, digits = 6): string => formatNumber(value, currentLanguage(), digits);
/** A number of the iteration: decimal comma, up to 6 decimals, scientific from a million on (never an overflowing string). */
const num = (value: number): string => (Math.abs(value) >= 1e6 ? formatScientific(value, currentLanguage(), 4) : dec(value));
const whole = (value: number): string => dec(value, 0);

const MAP_NAMES: Readonly<Record<CobwebMap, () => string>> = {
    affine: () => t("recursion_graph_map_affine"),
    cosine: () => t("recursion_graph_map_cosine"),
    logistic: () => t("recursion_graph_map_logistic"),
};

const MAP_KEYS = {
    affine: "recursion_graph_map_affine", cosine: "recursion_graph_map_cosine", logistic: "recursion_graph_map_logistic",
} as const satisfies Record<CobwebMap, string>;
const MAP_SHORT_KEYS = {
    affine: "cobweb_map_affine_short", cosine: "cobweb_map_cosine_short", logistic: "cobweb_map_logistic_short",
} as const satisfies Record<CobwebMap, string>;

/**
 * Ids of the declaration (task 08 lane L37). Bound: the map (a choice puck: lesson RG2 asks for the cosine), the slope `m` and the intercept `c` of the line,
 * the parameter `r` of the logistic map and the start `x0` (RG2 and RG4 ask the learner to set them and watch the cobweb). Declared: the readout rows and the
 * status and help sentences as notes. The playback (Next step, Play, Reset, the speed) has no arbiter key and stays in Orodja; the board texts stay board-drawn.
 */
export type CobwebIds = {
    param: "cobweb-map" | "cobweb-m" | "cobweb-c" | "cobweb-r" | "cobweb-x";
    row: "map" | "slope" | "intercept" | "rate" | "start" | "fixed" | "decisive" | "shape" | "steps" | "iterate";
    note: "status" | "help";
    legend: never;
    section: never;
    action: never;
};
type CobwebRow = DeclaredRow<CobwebIds>;
const formatted = (text: string): FormattedValue => ({kind: "formatted", text});

/** The same fields except the playback position and the step: what a playing iteration may not have changed under it. */
const sameParameters = (a: CobwebState, b: CobwebState): boolean => a.map === b.map && a.M === b.M && a.C === b.C && a.R === b.R && a.X === b.X;

/**
 * The cobweb graph (recursion spec RG2 and RG4): the graph of a map, the diagonal, the fixed point and the steps x0, x1, ... of the
 * iteration as a polyline between the map and the diagonal. The stored state is `CobwebState` (whole numbers, a map name, the number of
 * drawn steps); every drawn or read value is derived from it by `derived()`, keyed on the state object.
 *
 * Ownership: every board object goes through `scene`, which removes the objects and the drag listeners with the scene. The playback is an
 * `IterationController` created on demand and disposed with the scene, on a speed change and on unmount; it is not stored.
 */
export class RecursionCobwebGraph extends BaseGraph<RecursionCobwebGraphState, CobwebState> {
    private readonly scene = new SceneObjects();
    private handle?: JXG.Point;
    private built = false;
    private drawnMap?: CobwebMap;
    private cache?: {state: RecursionCobwebGraphState; derived: CobwebDerived};
    private controller?: IterationController;
    private speedMs = SPEED_DEFAULT;
    private readonly status = new SettledReadout();
    /** A clause for the status text, valid only for the state it was made for: a later state change makes it stale by itself. */
    private notice?: {readonly state: RecursionCobwebGraphState; readonly text: Message};

    override getInitialState(): RecursionCobwebGraphState {
        return {initialized: false, ...DEFAULT_COBWEB_STATE};
    }

    protected override lessonDefaultState(): RecursionCobwebGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`. Playback and the speed are not stored.

    override defaultPreset(): CobwebState {
        return serializeCobwebState(DEFAULT_COBWEB_STATE);
    }

    override presetCollection(): PresetCollection<CobwebState> {
        return recursionCobwebPresetCollection();
    }

    override exportPreset(): Preset<CobwebState> {
        const preset = super.exportPreset();
        const {map: _map, M: _M, C: _C, R: _R, X: _X, step: _step, ...graphState} = preset.graphState as RecursionCobwebGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): CobwebState {
        return serializeCobwebState(this.state);
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the frame of the imported data is marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    override importPresetData(data: CobwebState): void {
        const imported = serializeCobwebState(data);
        if (this.keepImportedView) this.drawnMap = imported.map;
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): RecursionCobwebGraphState {
        const parsed = parseCobwebState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The map window is framed exactly by `VIEW_BOXES`, so a stored or reset view is applied exactly, as the frame of a mount is. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** A reset shows the exact opening window: the base passes `keepaspect` to `setBoundingBox`, which would widen a window the graph frames exactly. */
    protected override showInitialView(): void {
        this.boardView.setIntent(this.initialView(), {keepAspectRatio: false});
    }

    protected override initialView(): [number, number, number, number] {
        return [...openingFrame(DEFAULT_COBWEB_STATE.map)];
    }

    // ---- Derived numbers: a cache keyed by the state object ---------------------------------------------------------------

    derived(): CobwebDerived {
        if (!this.cache || this.cache.state !== this.state) this.cache = {state: this.state, derived: deriveCobweb(this.state)};
        return this.cache.derived;
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    dragHandle(): JXG.Point | undefined { return this.handle; }
    isPlaying(): boolean { return this.controller?.isPlaying() ?? false; }
    speed(): number { return this.speedMs; }

    // ---- Board --------------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("recursion_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A mount frames the scene once; a rebuild or a replacement (checkpoint restore, Preset import) never frames over the stored view.
        if (this.hasBoard) this.applyFrame();
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

    override setState(update: SceneStateUpdate<RecursionCobwebGraphState>, callback?: () => void): void {
        if (!this.ticking && this.isPlaying()) this.outsideWrite = true;
        super.setState(update, callback);
    }

    protected override onStateChange(previous: Readonly<RecursionCobwebGraphState>): void {
        // A playing iteration changes the step by exactly one and nothing else, written by its own tick; any other write (a lesson action, a restore), even of step + 1, pauses it.
        const outside = this.outsideWrite;
        this.outsideWrite = false;
        if (this.isPlaying() && (outside || !(sameParameters(previous, this.state) && this.state.step === previous.step + 1))) this.pausePlayback();
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
        // A replacement brings its own view: build first, then mark the frame as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (!this.built) this.buildScene();
            this.drawnMap = this.state.map;
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    /** Rebuilds the scene after a disposal, sets the window of the map, moves the handle to the start and redraws; reports the status. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (!this.built) this.buildScene();
        this.applyFrame();
        this.placeHandle();
        this.board.update();
        this.status.report(this.statusText());
    }

    private applyFrame(): void {
        if (this.drawnMap === this.state.map) return;
        this.drawnMap = this.state.map;
        this.boardView.following(() => this.boardView.setIntent(openingFrame(this.state.map), {keepAspectRatio: false}));
    }

    private placeHandle(): void {
        const x0 = startOf(this.state.X);
        if (this.handle && (this.handle.X() !== x0 || this.handle.Y() !== x0)) this.handle.setPosition(JXG.COORDS_BY_USER, [x0, x0]);
    }

    private curve(data: () => Polyline, color: string, width: number, dash: number): JXG.Curve {
        const curve = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash,
        }));
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve;
    }

    /**
     * The part of the focus frame the captions keep to, `[left, top, right, bottom]`: the middle of it, because the cards of a lesson cover the sides of the frame once the
     * director has fitted it into the free area (at its zoom limit the frame is wider than that area).
     */
    private captionFrame(): [number, number, number, number] {
        const [left, top, right, bottom] = this.focus().frame;
        const inset = CAPTION_INSET * (right - left);
        return [left + inset, top, right - inset, bottom];
    }

    /** The board in pixels for caption places, or undefined while it has no size. */
    private captionScale(): CaptionScale | undefined {
        const {unitX, unitY, canvasWidth} = this.board;
        // The captions stay inside the frame of the map: when the view director fits the frame into the free area between the cards, the board is wider than the frame.
        const [xmin, , xmax] = this.captionFrame();
        return unitX > 0 && unitY > 0 && canvasWidth > 0 ? {unitX, unitY, width: Math.min(canvasWidth, (xmax - xmin) * unitX)} : undefined;
    }

    private caption(text: () => string, place: (chars: number) => {x: number; y: number}, visible: () => boolean = () => true): JXG.Text {
        return this.scene.own(this.board.create("text", [() => place(text().length).x, () => place(text().length).y, text], {
            strokeColor: GraphPalette.label, fontSize: 14, anchorX: "left", anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible,
        }));
    }

    /** A fixed marker on the diagonal at (value, value). */
    private marker(value: () => number, visible: () => boolean, face: string, color: string): JXG.Point {
        return this.scene.own(this.board.create("point", [value, value], {
            fixed: true, highlight: false, withLabel: false, name: "", face, size: 5, fillColor: color, strokeColor: GraphPalette.pointOutline, visible,
        }));
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        this.built = true;
        const box = () => VIEW_BOXES[this.state.map];
        const iterate = () => this.derived().iteration.points[this.state.step];
        const fixed = () => this.derived().fixedPoint;
        // The map, the diagonal (both from the window of the map) and the steps: three curves, each told apart by width and dash as well as colour.
        this.curve(() => mapSamples(this.derived().map, box()[0], box()[2]), GraphPalette.primaryCurve, 3, 0);
        this.curve(() => ({x: [box()[0], box()[2]], y: [box()[0], box()[2]]}), GraphPalette.referenceCurve, 2, 2);
        this.curve(() => {
            const derived = this.derived();
            return cobwebPath(derived.x0, derived.iteration.steps);
        }, GraphPalette.constructionAccent, 2, 0);
        this.marker(() => fixed() ?? 0, () => fixed() !== null && inView(this.state.map, fixed() ?? NaN), "square", GraphPalette.comparisonCurve);
        this.marker(() => iterate() ?? 0, () => this.state.step > 0 && inView(this.state.map, iterate() ?? NaN), "diamond", GraphPalette.label);
        const handle = this.scene.own(board.create("point", [startOf(this.state.X), startOf(this.state.X)], {
            withLabel: false, name: "", size: HANDLE_SIZE, fillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.constructionAccent, snapToGrid: false,
        }));
        this.handle = handle;
        this.wireDrag(handle);
        // Captions for what the readout rows do not say: the rule of the map and of the diagonal and the cobweb note (no legend is declared).
        const map = () => this.state.map;
        this.caption(() => this.mapCaption(), chars => clearOfYAxis(captionPlace(map(), "map", 0, 0, this.captionScale(), undefined, undefined, this.captionFrame()), chars, this.captionFrame(), this.captionScale()));
        this.caption(() => t("recursion_graph_cap_diagonal"), chars => clearOfYAxis(captionPlace(map(), "diagonal", 0, 0, this.captionScale(), undefined, undefined, this.captionFrame()), chars, this.captionFrame(), this.captionScale()));
        this.caption(() => t("fixed_point_legend_cobweb"), chars => legendInFrame(this.captionFrame(), chars, this.captionScale(), this.focus().frame));
        // The start, the fixed point and the iterate are readout rows (the markers and the handle need no value beside them); only the words that a marker lies
        // outside the view stay, because the row cannot say what the board shows.
        this.caption(() => {
            const star = fixed();
            return star === null || inView(map(), star) ? "" : t("recursion_graph_cap_fixed_off", {value0: num(star)});
        }, chars => captionPlace(map(), "fixed", fixed() ?? NaN, chars, this.captionScale(), this.derived().map, undefined, this.captionFrame()),
        () => fixed() !== null && !inView(map(), fixed() ?? NaN));
        this.caption(() => (inView(map(), iterate() ?? NaN) ? "" : t("recursion_graph_cap_iterate_off", {value0: subscript(this.state.step), value1: num(iterate() ?? NaN)})),
            chars => captionPlace(map(), "iterate", iterate() ?? NaN, chars, this.captionScale(), undefined, undefined, this.captionFrame()),
            () => this.state.step > 0 && !inView(map(), iterate() ?? NaN));
    }

    private mapCaption(): string {
        const state = this.state;
        if (state.map === "affine") return t("recursion_graph_cap_map_affine", {value0: affineEquation(state.M / M_SCALE, state.C / C_SCALE, num)});
        if (state.map === "cosine") return t("recursion_graph_cap_map_cosine");
        return t("recursion_graph_cap_map_logistic", {value0: num(state.R / R_SCALE)});
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.handle = undefined;
        this.built = false;
    }

    // ---- Dragging: the handle moves along the diagonal and snaps to the start grid ---------------------------------------------

    private wireDrag(point: JXG.Point): void {
        const onDrag = () => runAs("learner", () => this.dragTo(point));
        const board = this.board;
        const releaseCursor = bindMovablePointCursor(point, board);
        point.on("drag", onDrag);
        this.scene.listen(() => { point.off("drag", onDrag); releaseCursor(); });
    }

    /** Drag only: the start snaps to the nearest grid value inside the range of the map (typed values are refused instead). */
    private dragTo(point: JXG.Point): void {
        const X = snapDragInteger(point.X(), X_SCALE, startRange(this.state.map));
        if (X === undefined) {
            this.placeHandle();
            return;
        }
        this.pausePlayback();
        if (X !== this.state.X) this.setState({X});
        const x0 = startOf(X);
        point.setPosition(JXG.COORDS_BY_USER, [x0, x0]);
    }

    // ---- Playback ------------------------------------------------------------------------------------------------------------

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
                return step >= ITERATION_MAX_STEPS ? "complete" : "continue";
            },
            stepIntervalMs: this.speedMs,
            maxIterations: ITERATION_MAX_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.animationScheduler(),
        });
        if (this.controller.iteration !== this.state.step) this.controller.reset(this.state.step);
        return this.controller;
    }

    /** An export captures one settled scene, so playback stops first. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; the step stays where it is. */
    override pausePlayback(): void {
        if (!this.controller?.isPlaying()) return;
        this.controller.pause();
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the step on; at the end there is nothing to play (Replay goes back). Under reduced motion nothing moves: all 60 steps are shown at once. */
    play(): void {
        if (this.isPlaying() || !this.hasBoard || !this.graphSession?.isAlive || this.state.step >= ITERATION_MAX_STEPS) return;
        if (this.reducedMotion()) {
            this.setState({step: ITERATION_MAX_STEPS});
            this.requestRender();
            return;
        }
        this.syncedController().play();
        this.requestRender();
    }

    stepOnce(): void {
        this.pausePlayback();
        if (this.state.step >= ITERATION_MAX_STEPS) return;
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
    private edit(patch: Partial<CobwebState>): void {
        this.pausePlayback();
        this.setState(patch);
        this.requestRender();
    }

    editMap(map: CobwebMap): void {
        const before = this.state;
        const next = withMap(before, map);
        if (next === before) return;
        this.edit({map: next.map, X: next.X});
        if (next.X !== before.X) {
            const range = startRange(next.map);
            this.notice = {state: this.state, text: message("recursion_graph_notice_start", {
                value0: num(startOf(next.X)), value1: num(startOf(range.min)), value2: num(startOf(range.max))})};
            this.status.report(this.statusText());
        }
    }

    editSlope(value: number): boolean {
        const checked = typedInteger(value, M_SCALE, M_RANGE, "M");
        if (!checked.ok) return false;
        this.edit({M: checked.value});
        return true;
    }

    editIntercept(value: number): boolean {
        const checked = typedInteger(value, C_SCALE, C_RANGE, "C");
        if (!checked.ok) return false;
        this.edit({C: checked.value});
        return true;
    }

    editRate(value: number): boolean {
        const checked = typedInteger(value, R_SCALE, R_RANGE, "R");
        if (!checked.ok) return false;
        this.edit({R: checked.value});
        return true;
    }

    editStart(value: number): boolean {
        const checked = typedInteger(value, X_SCALE, startRange(this.state.map), "X");
        if (!checked.ok) return false;
        this.edit({X: checked.value});
        return true;
    }

    /** The time between steps: a multiple of 100 from 200 to 2000. A playback setting, not a scene edit: a playing iteration goes on with the new time. */
    editSpeed(value: number): boolean {
        if (!Number.isInteger(value) || value < SPEED_MIN || value > SPEED_MAX || value % SPEED_STEP !== 0) return false;
        const wasPlaying = this.isPlaying();
        this.disposeController();
        this.speedMs = value;
        if (wasPlaying) this.play();
        this.requestRender();
        return true;
    }

    // ---- Lesson actions -----------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`recursion`, the cobweb's share): `set-map` picks the map (the start falls back as the chooser does), `set-params` sets the stored `M`, `C`, `R`,
     * `set-start` the stored `X`, `set-step` the drawn step. The merged state goes through `parseCobwebState` (strict: nothing is snapped or clamped) before the first
     * write, so an off-grid or off-range value is a lesson-content error and nothing is written. Only the changed fields are written, in one edit; a valid action pauses
     * the playback and never starts it. The growth graph's fields and operations are refused by name.
     */
    applyRecursionAction(action: Extract<LessonAction, {kind: "recursion"}>): void {
        switch (action.operation) {
            case "set-map": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-map", patch, ["map"]);
                return;
            }
            case "set-params": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-params", patch, ["M", "C", "R"]);
                return;
            }
            case "set-start": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-start", patch, ["X"]);
                return;
            }
            case "set-step": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-step", patch, ["step"]);
                return;
            }
            case "set-interest":
                throw new Error("recursion set-interest: this operation belongs to the growth graph.");
            case "set-log":
                throw new Error("recursion set-log: this operation belongs to the growth graph.");
            default: {
                const unsupported: never = action;
                throw new Error(`recursion: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    /** Validates the merged state first, then writes only the fields that change; unknown and growth-graph fields are refused. */
    private editStored(operation: string, patch: Readonly<Record<string, unknown>>, allowed: readonly (keyof CobwebState)[]): void {
        const growth = ["panel", "sequence", "a1", "d", "q", "n"].filter(key => patch[key] !== undefined);
        if (growth.length) throw new Error(`recursion ${operation}: ${growth.join(", ")} belongs to the growth graph.`);
        const unknown = Object.keys(patch).filter(key => !allowed.some(field => field === key));
        if (unknown.length) throw new Error(`recursion ${operation}: no such field ${unknown.join(", ")}.`);
        const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        const current = serializeCobwebState(this.state);
        // A new map moves the start as the chooser does; the merged state must then still be valid as a whole.
        const picked = COBWEB_MAPS.find(candidate => candidate === defined.map);
        if ("map" in defined && picked === undefined) throw new Error(`recursion ${operation}: map must be one of: ${COBWEB_MAPS.join(", ")}.`);
        const base = picked ? withMap(current, picked) : current;
        const parsed = parseCobwebState({...base, ...defined, ...(picked ? {map: picked} : {})});
        if (!parsed.ok) throw new Error(`recursion ${operation}: ${parsed.error.message}`);
        this.pausePlayback();
        if ("map" in defined && parsed.value.map !== this.state.map) {
            this.editMap(parsed.value.map);
            return;
        }
        const changed = allowed.filter(key => parsed.value[key] !== this.state[key]);
        if (changed.length) this.edit(Object.fromEntries(changed.map(key => [key, parsed.value[key]])));
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("recursion", action => this.applyRecursionAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------

    /** The fixed point as a declared value: the exact fraction with its decimal value when it is not a whole number. */
    private fixedValue(derived: CobwebDerived): Message | FormattedValue {
        if (derived.fixedPoint === null) return message(derived.kind === "all-fixed" ? "recursion_graph_r_fixed_all" : "recursion_graph_r_fixed_none");
        const exact = derived.fixedExact;
        if (exact && exact.den !== 1n) return message("recursion_graph_r_fixed_fraction", {value0: `${exact.num}/${exact.den}`, value1: num(derived.fixedPoint)});
        return formatted(num(derived.fixedPoint));
    }

    private kindMessage(derived: CobwebDerived): Message {
        const star = derived.fixedPoint === null ? "" : num(derived.fixedPoint);
        const slope = derived.slope === null ? "" : num(derived.slope);
        switch (derived.kind) {
            case "attracting":
                return this.state.map === "logistic" ? message("recursion_graph_status_logistic_attracting", {value0: star, value1: slope})
                    : message("recursion_graph_status_attracting", {value0: star});
            case "repelling": return message("recursion_graph_status_repelling", {value0: star});
            case "two-cycle": return message("recursion_graph_status_two_cycle", {value0: star});
            case "all-fixed": return message("recursion_graph_status_all_fixed");
            case "none": return message("recursion_graph_status_none", {value0: num(this.state.C / C_SCALE)});
            case "extinction": return message("recursion_graph_status_extinction");
            case "extinction-slope-one": return message("recursion_graph_status_extinction_one");
            case "local-attracting": return message("recursion_graph_status_cosine", {value0: star, value1: slope});
        }
    }

    /** The status sentence: the verdict, where the iteration is and, right after a change of the map, the notice about the start. */
    statusMessage(): Message {
        const derived = this.derived();
        const {step} = this.state;
        const where = step === 0 ? message("recursion_graph_status_at_start", {value0: num(derived.x0)})
            : message("recursion_graph_status_at_step", {value0: step, value1: subscript(step), value2: num(derived.iteration.points[step])});
        const base = message("cobweb_status_join", {value0: this.kindMessage(derived), value1: where});
        return this.notice && this.notice.state === this.state ? message("cobweb_status_join", {value0: base, value1: this.notice.text}) : base;
    }

    statusText(): string { return renderMessage(this.statusMessage()); }

    private shapeMessage(derived: CobwebDerived): Message {
        if (derived.kind === "two-cycle") return message("recursion_graph_shape_square");
        if (derived.kind === "all-fixed") return message("recursion_graph_shape_still");
        switch (derived.shape) {
            case "spiral": return message("recursion_graph_shape_spiral");
            case "degenerate": return message("recursion_graph_shape_degenerate");
            default: return message("recursion_graph_shape_staircase");
        }
    }

    /** The rows of the readout as declared; the panel shows their text. */
    readoutRows(): CobwebRow[] {
        const state = this.state;
        const derived = this.derived();
        const rows: CobwebRow[] = [{id: "map", name: message("recursion_graph_r_map"), value: message(MAP_KEYS[state.map])}];
        if (state.map === "affine") {
            rows.push({id: "slope", name: message("recursion_graph_r_slope"), value: formatted(num(state.M / M_SCALE))},
                {id: "intercept", name: message("recursion_graph_r_intercept"), value: formatted(num(state.C / C_SCALE))});
        } else if (state.map === "logistic") {
            rows.push({id: "rate", name: message("recursion_graph_r_rate"), value: formatted(num(state.R / R_SCALE))});
        }
        rows.push(
            {id: "start", name: message("recursion_graph_r_start"), value: formatted(num(derived.x0))},
            {id: "fixed", name: message("recursion_graph_r_fixed"), value: this.fixedValue(derived)},
        );
        if (derived.slope !== null) {
            rows.push({id: "decisive", name: message("recursion_graph_r_decisive"),
                value: derived.exact ? formatted(num(derived.slope)) : message("recursion_graph_r_decisive_computed", {value0: num(derived.slope)})});
        }
        rows.push(
            {id: "shape", name: message("recursion_graph_r_shape"), value: this.shapeMessage(derived)},
            {id: "steps", name: message("recursion_graph_r_steps"), value: message("recursion_graph_r_steps_value", {value0: state.step, value1: ITERATION_MAX_STEPS})},
            {id: "iterate", name: message("recursion_graph_r_iterate", {value0: subscript(state.step)}), value: formatted(num(derived.iteration.points[state.step]))},
        );
        return rows;
    }

    /** The text of the declared rows, as the panel lists them. */
    private listRows(): ReadoutListRow[] {
        return this.readoutRows().map(({id, name, value}): ReadoutListRow => ({
            id, label: name ? renderMessage(name) : "", value: "kind" in value && value.kind === "formatted" ? value.text : renderMessage(value as Message),
        }));
    }

    // ---- Declaration ------------------------------------------------------------------------------------------------------

    private refusal(key: "recursion_graph_m_rejected" | "recursion_graph_c_rejected" | "recursion_graph_r_rejected", range: {min: number; max: number}, scale: number): DomainError {
        return new DomainError(message(key, {value0: dec(range.min / scale), value1: dec(range.max / scale), value2: dec(1 / scale)}));
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const number = (value: unknown): number => (typeof value === "number" ? value : NaN);
        return {
            "cobweb-map": {
                read: () => this.state.map,
                apply: (value: unknown) => {
                    const map = COBWEB_MAPS.find(candidate => candidate === value);
                    if (!map) throw new DomainError(message("cobweb_map_unknown", {value0: String(value)}));
                    this.editMap(map);
                },
            },
            "cobweb-m": {read: () => this.state.M / M_SCALE, apply: (value: unknown) => { if (!this.editSlope(number(value))) throw this.refusal("recursion_graph_m_rejected", M_RANGE, M_SCALE); }},
            "cobweb-c": {read: () => this.state.C / C_SCALE, apply: (value: unknown) => { if (!this.editIntercept(number(value))) throw this.refusal("recursion_graph_c_rejected", C_RANGE, C_SCALE); }},
            "cobweb-r": {read: () => this.state.R / R_SCALE, apply: (value: unknown) => { if (!this.editRate(number(value))) throw this.refusal("recursion_graph_r_rejected", R_RANGE, R_SCALE); }},
            "cobweb-x": {
                read: () => startOf(this.state.X),
                apply: (value: unknown) => {
                    if (this.editStart(number(value))) return;
                    const range = startRange(this.state.map);
                    const logistic = this.state.map === "logistic";
                    throw new DomainError(message(logistic ? "recursion_graph_x_rejected_logistic" : "recursion_graph_x_rejected",
                        {value0: dec(range.min / X_SCALE), value1: dec(range.max / X_SCALE), value2: dec(1 / X_SCALE)}));
                },
            },
        };
    }

    /**
     * Pure data from the state. Pucks (lessons RG2 and RG4 ask the learner to set the slope `m`, the intercept `c` or the parameter `r` and the start `x0`, and to choose
     * the cosine, while watching the cobweb): the map, the two parameters of the line or the one of the logistic map, the start. The playback stays in Orodja (no key).
     */
    protected override declaration(): GraphDeclaration<CobwebIds> {
        const state = this.state;
        const range = (key: CobwebIds["param"], name: Message, symbol: string, min: number, max: number, step: number, bigStep: number, maxDecimals: number, help?: Message):
            ParameterDeclaration<CobwebIds["param"]> => ({key, kind: "range", label: name, symbol, placement: "board", min, max, step, bigStep, maxDecimals, ...(help ? {help} : {})});
        const parameters: ParameterDeclaration<CobwebIds["param"]>[] = [{
            key: "cobweb-map", kind: "choice", label: message("recursion_graph_map_label"), help: message("recursion_graph_map_help"), placement: "board", puck: true,
            options: COBWEB_MAPS.map(value => ({value, label: message(MAP_KEYS[value]), short: message(MAP_SHORT_KEYS[value])})),
        }];
        if (state.map === "affine") {
            parameters.push(
                range("cobweb-m", message("cobweb_m_name"), "m", M_RANGE.min / M_SCALE, M_RANGE.max / M_SCALE, 1 / M_SCALE, 1, 2),
                range("cobweb-c", message("cobweb_c_name"), "c", C_RANGE.min / C_SCALE, C_RANGE.max / C_SCALE, 1 / C_SCALE, 1, 1),
            );
        } else if (state.map === "logistic") {
            parameters.push(range("cobweb-r", message("cobweb_r_name"), "r", R_RANGE.min / R_SCALE, R_RANGE.max / R_SCALE, 1 / R_SCALE, 0.5, 1, message("recursion_graph_r_help")));
        }
        const starts = startRange(state.map);
        parameters.push(range("cobweb-x", message("cobweb_x_name"), "x_0", starts.min / X_SCALE, starts.max / X_SCALE, 1 / X_SCALE, 0.1, 2,
            message(state.map === "logistic" ? "recursion_graph_x_help_logistic" : "recursion_graph_x_help")));
        return {
            parameters,
            readouts: [{id: "values", title: message("recursion_graph_readout_title"), rows: this.readoutRows()}],
            notes: [
                {id: "status", text: this.statusMessage()},
                ...(state.map !== "cosine" ? [{id: "help" as const, text: message("recursion_graph_note_exact")}] : []),
            ],
            marks: this.focus().marks,
            followView: this.focus().frame,
        };
    }

    private focusCache: {key: string; marks: ViewMarks; frame: [number, number, number, number]} | undefined;

    /**
     * What the view director keeps visible and clear of cards: the start on the diagonal, the map above it, the fixed point and the first iterates of the cobweb (a few,
     * so the set stays small); the box around them and the origin is the `followView` (`focusFrame`), so the director fits that, not the whole window (20 units), into the area the cards leave free. Points outside the window are left out.
     * Memoized on the numbers of the state.
     */
    private focus(): {marks: ViewMarks; frame: [number, number, number, number]} {
        const state = this.state;
        const key = `${state.map}|${state.M}|${state.C}|${state.R}|${state.X}|${state.step}`;
        if (this.focusCache?.key === key) return this.focusCache;
        const [left, top, right, bottom] = VIEW_BOXES[state.map];
        const inside = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x >= left && x <= right && y >= bottom && y <= top;
        const derived = this.derived();
        const must: ViewMark[] = [];
        const add = (x: number, y: number) => { if (inside(x, y)) must.push({kind: "point", x, y}); };
        add(derived.x0, derived.x0);
        const shown = Math.min(state.step, VIEW_MARK_STEPS);
        for (const step of derived.iteration.steps.slice(0, Math.max(shown, 1))) { add(step.from, step.to); add(step.to, step.to); }
        if (derived.fixedPoint !== null) add(derived.fixedPoint, derived.fixedPoint);
        const marks: ViewMarks = {must};
        const frame = focusFrame(state.map, must.flatMap(mark => (mark.kind === "point" ? [[mark.x, mark.y] as const] : [])));
        this.focusCache = {key, marks, frame};
        return this.focusCache;
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------------------

    private fieldRange(min: number, max: number, scale: number) {
        return {value0: dec(min / scale), value1: dec(max / scale), value2: dec(1 / scale)};
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <PuckOwned key="map" param="cobweb-map"><ChoiceSelect label={t("recursion_graph_map_label")} value={state.map} help={t("recursion_graph_map_help")}
                          options={COBWEB_MAPS.map(value => ({value, text: MAP_NAMES[value]()}))}
                          onChange={value => { const map = COBWEB_MAPS.find(candidate => candidate === value); if (map) this.editMap(map); }}/></PuckOwned>,
        ];
        if (state.map === "affine") {
            commands.push(
                <PuckOwned key="m" param="cobweb-m"><Slider customText={t("recursion_graph_m_label")} value={state.M / M_SCALE} step={1 / M_SCALE} bigStep={1} min={M_RANGE.min / M_SCALE}
                        max={M_RANGE.max / M_SCALE} grid={1 / M_SCALE} decimals={2}
                        rejectedHint={t("recursion_graph_m_rejected", this.fieldRange(M_RANGE.min, M_RANGE.max, M_SCALE))} onChange={value => this.editSlope(value)}/></PuckOwned>,
                <PuckOwned key="c" param="cobweb-c"><Slider customText={t("recursion_graph_c_label")} value={state.C / C_SCALE} step={1 / C_SCALE} bigStep={1} min={C_RANGE.min / C_SCALE}
                        max={C_RANGE.max / C_SCALE} grid={1 / C_SCALE} decimals={1}
                        rejectedHint={t("recursion_graph_c_rejected", this.fieldRange(C_RANGE.min, C_RANGE.max, C_SCALE))} onChange={value => this.editIntercept(value)}/></PuckOwned>,
            );
        } else if (state.map === "logistic") {
            commands.push(
                <PuckOwned key="r" param="cobweb-r"><Slider customText={t("recursion_graph_r_label")} value={state.R / R_SCALE} step={1 / R_SCALE} bigStep={0.5} min={R_RANGE.min / R_SCALE}
                        max={R_RANGE.max / R_SCALE} grid={1 / R_SCALE} decimals={1} help={t("recursion_graph_r_help")}
                        rejectedHint={t("recursion_graph_r_rejected", this.fieldRange(R_RANGE.min, R_RANGE.max, R_SCALE))} onChange={value => this.editRate(value)}/></PuckOwned>,
            );
        }
        const range = startRange(state.map);
        const logistic = state.map === "logistic";
        const startArgs = this.fieldRange(range.min, range.max, X_SCALE);
        commands.push(
            <PuckOwned key="x" param="cobweb-x"><Slider customText={t("recursion_graph_x_label")} value={startOf(state.X)} step={1 / X_SCALE} bigStep={0.1} min={range.min / X_SCALE}
                    max={range.max / X_SCALE} grid={1 / X_SCALE} decimals={2} help={t(logistic ? "recursion_graph_x_help_logistic" : "recursion_graph_x_help")}
                    rejectedHint={t(logistic ? "recursion_graph_x_rejected_logistic" : "recursion_graph_x_rejected", startArgs)} onChange={value => this.editStart(value)}/></PuckOwned>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        const {step} = this.state;
        const playing = this.isPlaying();
        const speedArgs = {value0: whole(SPEED_MIN), value1: whole(SPEED_MAX), value2: whole(SPEED_STEP)};
        return <>
            <div className="inspector-group">
                <ReducedMotion>{() => <>
                    <PlaybackButtons placement="graph" groupLabel={t("recursion_graph_playback_group")} nextLabel={t("next_step")} resetLabel={t("reset")}
                                     playing={playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...playbackBlocks({atStart: step === 0, atEnd: step >= ITERATION_MAX_STEPS, playing})}/>
                    <Slider customText={t("recursion_graph_speed_label")} min={SPEED_MIN} max={SPEED_MAX} step={SPEED_STEP} grid={SPEED_STEP} bigStep={200}
                            value={this.speedMs} help={t("recursion_graph_speed_help", speedArgs)} rejectedHint={t("recursion_graph_speed_rejected", speedArgs)}
                            unavailableReason={this.reducedMotion() ? t("recursion_graph_speed_reduced", {value0: ITERATION_MAX_STEPS}) : undefined}
                            onChange={value => this.editSpeed(value)}/>
                </>}</ReducedMotion>
                <p data-step-counter="">{t("step_counter", {value0: step, value1: ITERATION_MAX_STEPS})}</p>
            </div>
            {this.getGraphCommandsArea()}
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("recursion_graph_readout_title")}</ReadoutHeading>
                <p data-recursion-status="" data-readout-note="">{this.statusText()}</p>
                <ReadoutList label={t("recursion_graph_readout_title")} rows={this.listRows()}/>
                {this.state.map !== "cosine" && <ReadoutHelp hooks={{"data-readout-note": ""}}><span data-recursion-note="">{t("recursion_graph_note_exact")}</span></ReadoutHelp>}
                <LiveReadout readout={this.status} muted={playing}/>
            </div>
        </>;
    }
}

export default RecursionCobwebGraph;
