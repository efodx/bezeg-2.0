import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, LabelPlacement} from "../functions/BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "../functions/FunctionReadout";
import {FunctionStatus} from "../functions/FunctionStatus";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import AngleSlider from "../../inputs/AngleSlider";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {LessonAction} from "../../learning/model";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController} from "../../learning/runtime/iterationController";
import {
    applySetExample, applySetMatrix, applySetMode, applySetStart, applySetTestVector, applyStep, changeMode, DEFAULT_LINEAR_MAP_STATE, editMatrixEntry,
    ITERATE_STEP_MAX, LinearMapExampleChoice, LinearMapResult, LinearMapState, selectExample, serializeLinearMapState, snapEntryInput, snapStartInput,
    startOf, stepOf, validateSetExample, validateSetMatrix, validateSetMode, validateSetStart, validateSetTestVector, validateStep,
} from "../../linear/linearMapModel";
import {
    companionOfDrag, deriveIteration, deriveTraceDet, estimatesDominant, iterateAt, IterationView, SETTLED_ANGLE_DEGREES, TRACE_DET_DRAG_LIMIT, TRACE_DET_VIEW, TraceDetView,
} from "./iterationScene";
import {createIterationCurves, createIterationPoints, ITERATION_COLORS, IterationBoardContext, legendKindFor, TRACE_DET_DRAWING} from "./iterationBoard";
import {
    apply, det, IDENTITY, isLinearMapExampleId, MATRIX_ENTRY_STEP, type Mat2, orientationSign, unitSquareImage, type Vec2,
} from "../../linear/matrix2";
import {
    bezierPoint, closedPolyline, Collapse, collapseOf, FIXTURE_CONTROL_POINTS, gridPolyline, imageControlPoints, isLinearMapGraphMode, LINEAR_MAP_GRAPH_MODES, LinearMapGraphMode, openPolyline, PROBE_POINT, Polyline,
    shoelace, sourceGridPolyline,
} from "./linearMapScene";
import {EIGEN_PARALLEL_TOLERANCE} from "../../linear/eigen2";
import {angleOfPoint, deriveEigen, eigenViewBox, EigenView, eigenSnapAngle, normalizeTestAngle, unitVector} from "./eigenScene";
import {createEigenCurves, createEigenPoints, EIGEN_COLORS, EigenBoardContext} from "./eigenBoard";
import {deriveEllipse, ellipseViewBox, EllipseView} from "./ellipseScene";
import {eigenLabelRequests, ellipseLabelRequests, placeLabels} from "./labelLayout";
import {createEllipseObjects, ELLIPSE_COLORS, EllipseBoardContext} from "./ellipseBoard";
import {linearMapPresetCollection} from "./linearMapPresetCollection";
import type {Preset} from "../base/presets/Presets";

/**
 * The default view: the grid covers [-6, 6]^2, and the default example's image of the fixture curve reaches (11, 4). The units of the
 * two axes are equal (the default), so shears and rotations look like what they are.
 */
const BOARD_VIEW: BoundingBox = [-12, 9, 12, -9];

/** Local roles for this construction: image-grid lines stay behind the transformed curves and handles. */
const LINEAR_MAP_COLORS = {
    sourceGrid: "#b5c3c9",
    imageGrid: "#7ba6bc",
    sourcePoint: "#6b7984",
    imageHandle: "#2468a2",
    sourceCurve: GraphPalette.primaryCurve,
    imageCurve: "#bd6047",
    square: "#bd7049",
    squareFill: "#f1dfcd",
} as const;

/** The Batch D operations; the shared `LessonAction` union gains them with the lesson wiring, so this graph accepts them locally. */
export interface LinearMapIterationAction {
    readonly kind: "linear-map";
    readonly operation: "set-start" | "step";
    readonly start?: readonly [number, number];
    readonly count?: number;
}

type Column = 0 | 1;
type Row = 0 | 1;
type StatusKind = "positive" | "negative" | "zero" | "collapse-line" | "collapse-point"
    | "zero-start" | "zero-iterate" | "start-to-zero" | "collapses" | "dominant" | "other-eigenvector" | "equal-moduli" | "rotating" | "scalar" | "defective" | "settled"
    | "td-inside" | "td-edge" | "td-outside" | "flow-stable" | "flow-unstable" | "companion" | "td-range"
    | "eigen-approx-parallel" | "eigen-exact-parallel" | "eigen-not-parallel" | "eigen-two" | "eigen-one" | "eigen-all" | "eigen-none" | "eigen-kernel" | "eigen-v-kernel"
    | "ellipse-symmetric" | "ellipse-nonsymmetric" | "ellipse-segment" | "ellipse-point" | "ellipse-circle" | "ellipse-no-lines"
    | "conic-ellipse" | "conic-hyperbola" | "conic-lines" | "conic-empty";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    matrix: Mat2;
    a1: Vec2;
    a2: Vec2;
    determinant: number;
    area: number;
    shoelaceArea: number;
    sign: -1 | 0 | 1;
    collapse: Collapse;
    square: readonly [Vec2, Vec2, Vec2, Vec2];
    probeImage: Vec2;
    imageControl: Vec2[];
    grid: Polyline;
}

/** What the last numeric entry did to the typed value; shown under the fields until the next exact edit. */
interface EntryNotice {
    row: Row;
    column: Column;
    kind: "clamped" | "snapped";
}

const EXAMPLE_IDS_OFFERED = ["identity", "basis-default", "orientation-reversing", "singular", "eigen-default", "quarter-turn", "shear", "symmetric", "non-symmetric", "reflection-x", "scalar-2"] as const;
const SOURCE_GRID = sourceGridPolyline();
let nextInstance = 0;

/** Milliseconds between two steps of the played iteration. */
export const STEP_INTERVAL_MS = 600;
const planeOf = (mode: LinearMapGraphMode): "plane" | "trace-det" => mode === "tracedet" ? "trace-det" : "plane";
const sameStored = (a: LinearMapState, b: LinearMapState): boolean => JSON.stringify(serializeLinearMapState(a)) === JSON.stringify(serializeLinearMapState(b));

const sameMatrix = (a: Mat2, b: Mat2): boolean => a[0][0] === b[0][0] && a[0][1] === b[0][1] && a[1][0] === b[1][0] && a[1][1] === b[1][1];

/**
 * The linear map graph, basis and determinant modes (linear maps lessons L1 and L2). The model is `LinearMapState`
 * (`src/linear/linearMapModel`); the determinant, areas and images are recomputed from it with `src/linear/matrix2` and never stored.
 * Entries are multiples of 1/4 in [-4, 4] (exact in doubles). Dragging a handle, the four number fields, Reset, examples and lesson
 * actions all write the model through the kernel (`editMatrixEntry`, `selectExample`, `applySet*`), so every path snaps the same way.
 * Typed or dragged input is snapped or clamped with a message; a singular matrix is accepted and drawn collapsed (nothing divides by
 * the determinant, and no inverse is offered). The image of the fixture Bezier curve is drawn from the images of its control
 * points (the curve API's transforms are never called). The grid image is one polyline curve with NaN breaks (ADR 0032).
 * No route, catalog entry or Demonstration is registered here (task 06).
 */
export class LinearMapGraph extends BaseFunctionGraph<LinearMapState> {
    protected handle1?: JXG.Point;
    protected handle2?: JXG.Point;
    protected startHandle?: JXG.Point;
    protected traceDetHandle?: JXG.Point;
    protected eigenTip?: JXG.Point;
    private notice?: EntryNotice;
    private readonly uid = nextInstance++;
    /** The matrix a drag of the (tau, delta) handle produced; while it is the stored matrix, the companion status is stated. */
    private companionMatrix?: Mat2;
    private iterationMemo?: { model: LinearMapState; view: IterationView };
    private traceDetMemo?: { matrix: Mat2; view: TraceDetView };
    private eigenMemo?: { model: LinearMapState; view: EigenView };
    private labelMemo?: { key: string; cells: Record<string, LabelPlacement> };
    private ellipseMemo?: { matrix: Mat2; view: EllipseView };
    /** The view the board currently shows, so only a change between the planes resets the box. */
    /** The view the board shows: its own box per plane, and for the eigen mode one per matrix (refitted when the matrix changes, never during a drag). */
    private boardViewKey = "plane";
    private controller?: IterationController;
    private ticking = false;

    override presetCollection() {
        return linearMapPresetCollection;
    }

    protected defaultModel(): LinearMapState {
        return {...DEFAULT_LINEAR_MAP_STATE};
    }

    protected defaultBoundingBox(): BoundingBox {
        if (this.model.mode === "eigen") {
            const {width, height} = this.board ? JXG.getDimensions(this.board.container, document) : {width: 0, height: 0};
            return eigenViewBox(this.model.matrix, parseFloat(String(width)), parseFloat(String(height)));
        }
        if (this.model.mode === "ellipse") {
            const {width, height} = this.board ? JXG.getDimensions(this.board.container, document) : {width: 0, height: 0};
            return ellipseViewBox(this.model.matrix, this.model.conicVisible === true, parseFloat(String(width)), parseFloat(String(height)));
        }
        return [...(this.model.mode === "tracedet" ? TRACE_DET_VIEW : BOARD_VIEW)];
    }

    override exportPresetData(): LinearMapState {
        return serializeLinearMapState(this.model);
    }

    override importPresetData(data: LinearMapState): void {
        this.notice = undefined;
        super.importPresetData(data);
    }

    /** True while a Preset file with a stored view is applied: the mode's own view must not replace the stored one. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    // ---- View ------------------------------------------------------------------------------------------------------

    private viewOf(model: LinearMapState): View {
        return this.memoView(model, () => {
            const m = model.matrix;
            const square = unitSquareImage(m);
            const determinant = det(m);
            return {
                matrix: m,
                a1: [m[0][0], m[1][0]] as Vec2,
                a2: [m[0][1], m[1][1]] as Vec2,
                determinant,
                area: Math.abs(determinant),
                shoelaceArea: shoelace(square),
                sign: orientationSign(m),
                collapse: collapseOf(m),
                square,
                probeImage: apply(m, PROBE_POINT),
                imageControl: imageControlPoints(m),
                grid: gridPolyline(m),
            };
        });
    }

    /** The orbit and its exact classification for the stored matrix and start; cached on the model's identity. */
    private iterationOf(model: LinearMapState): IterationView {
        if (this.iterationMemo?.model !== model) this.iterationMemo = {model, view: deriveIteration(model.matrix, startOf(model))};
        return this.iterationMemo.view;
    }

    /**
     * The cells of the labels of the eigen and ellipse modes: one greedy placement (`labelLayout`), recomputed when the matrix, the test
     * vector, the conic switch or the view box changes. Other modes keep the fixed cells of the handle labels.
     */
    private labelCells(): Record<string, LabelPlacement> {
        const {mode, matrix} = this.model;
        if (mode !== "eigen" && mode !== "ellipse") return {};
        const box = this.board.getBoundingBox() as [number, number, number, number];
        const widthPx = this.board.canvasWidth || 700;
        const heightPx = this.board.canvasHeight || widthPx * (box[1] - box[3]) / (box[2] - box[0]);
        const fontSize = this.displaySettings.fontSize;
        const key = JSON.stringify([mode, matrix, mode === "eigen" ? this.model.testAngle : this.model.conicVisible === true, box, widthPx, heightPx, fontSize]);
        if (this.labelMemo?.key === key) return this.labelMemo.cells;
        const requests = mode === "eigen" ? eigenLabelRequests(matrix, this.eigenOf(this.model))
            : ellipseLabelRequests(matrix, this.ellipseOf(this.model), this.model.conicVisible === true);
        const cells = placeLabels(requests, {box, widthPx, heightPx, fontSize});
        this.labelMemo = {key, cells};
        return cells;
    }

    private labelCell(id: string, usual: LabelPlacement): LabelPlacement {
        return this.labelCells()[id] ?? usual;
    }

    private traceDetOf(model: LinearMapState): TraceDetView {
        if (this.traceDetMemo?.matrix !== model.matrix) this.traceDetMemo = {matrix: model.matrix, view: deriveTraceDet(model.matrix)};
        return this.traceDetMemo.view;
    }

    private eigenOf(model: LinearMapState): EigenView {
        if (this.eigenMemo?.model !== model) this.eigenMemo = {model, view: deriveEigen(model.matrix, model.testAngle)};
        return this.eigenMemo.view;
    }

    private ellipseOf(model: LinearMapState): EllipseView {
        if (this.ellipseMemo?.matrix !== model.matrix) this.ellipseMemo = {matrix: model.matrix, view: deriveEllipse(model.matrix)};
        return this.ellipseMemo.view;
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    /**
     * The playback rule on every write, including a direct `setState` and a restored scene: a change of the stored content from
     * anywhere but the playback's own tick pauses a playing iteration. A write that changes nothing stored (a refreshed message) leaves it playing.
     */
    override setState(...args: Parameters<BaseFunctionGraph<LinearMapState>["setState"]>): void {
        const before = this.model;
        super.setState(...args);
        if (!this.ticking && this.isPlaying() && !sameStored(before, this.model)) this.pausePlayback();
    }

    /** A drag of the start handle: each coordinate snaps to the quarter grid inside [-4, 4]. */
    protected dragStart(x: number, y: number): Vec2 | undefined {
        const [sx, sy] = [snapStartInput(x, "x"), snapStartInput(y, "y")];
        if (!sx.ok || !sy.ok) throw new DomainError("The handle position must be finite.");
        const next: Vec2 = [sx.value.value, sy.value.value];
        const current = startOf(this.model);
        this.notice = undefined;
        if (next[0] !== current[0] || next[1] !== current[1]) this.commitModel({...this.model, start: next}, {syncScene: false});
        return next;
    }

    /** Typed start coordinate: refused (false) unless it is on the grid inside [-4, 4]; the other coordinate stays. */
    protected setStartFromInput(axis: 0 | 1, input: number): boolean {
        const snapped = snapStartInput(input, "start");
        if (!snapped.ok || snapped.value.adjusted) return false;
        const current = startOf(this.model);
        const next: Vec2 = axis === 0 ? [snapped.value.value, current[1]] : [current[0], snapped.value.value];
        this.notice = undefined;
        this.commitModel({...this.model, start: next});
        return true;
    }

    /** The test angle from the slider: wrapped into [0, 360) on the 0,01° grid and stored through the same path as a drag and a snap. */
    protected setTestAngle(degrees: number): void {
        if (!Number.isFinite(degrees)) throw new DomainError("The angle must be finite.");
        const angle = normalizeTestAngle(degrees);
        this.notice = undefined;
        if (angle !== this.model.testAngle) this.commitModel({...this.model, testAngle: angle});
    }

    /** A drag of the tip of v: the pointer is projected onto the unit circle (its angle is kept), and nothing else moves. */
    protected dragEigenTip(x: number, y: number): Vec2 | undefined {
        const angle = angleOfPoint(x, y);
        if (angle === undefined) return unitVector(this.model.testAngle);
        this.notice = undefined;
        if (angle !== this.model.testAngle) this.commitModel({...this.model, testAngle: angle}, {syncScene: false});
        return unitVector(angle);
    }

    /** Snaps v to the nearer real eigen-direction (v stays a unit vector); a no-op when there is none. Returns whether v moved. */
    protected snapToEigen(): boolean {
        const angle = eigenSnapAngle(this.model.matrix, this.model.testAngle);
        if (angle === undefined || angle === this.model.testAngle) return false;
        this.notice = undefined;
        this.commitModel({...this.model, testAngle: angle});
        return true;
    }

    /** A drag of the (tau, delta) handle: the companion matrix of the snapped point becomes the matrix. */
    protected dragTraceDet(tau: number, delta: number): Vec2 | undefined {
        const [st, sd] = [snapStartInput(tau, "tau"), snapStartInput(delta, "delta")];
        if (!st.ok || !sd.ok) throw new DomainError("The handle position must be finite.");
        const matrix = companionOfDrag(st.value.value, sd.value.value);
        this.notice = undefined;
        if (!sameMatrix(matrix, this.model.matrix)) {
            this.companionMatrix = matrix;
            this.commitModel({...this.model, matrix, exampleId: "custom"}, {syncScene: false});
        }
        return [st.value.value, sd.value.value];
    }

    // ---- Playback of the iteration (as the logistic map's) ---------------------------------------------------------------

    isPlaying(): boolean {
        return this.controller?.isPlaying() ?? false;
    }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private disposeController(): void {
        this.controller?.dispose();
        this.controller = undefined;
    }

    /** The frame scheduler of the playback; tests substitute a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined {
        return undefined;
    }

    private syncedController(): IterationController {
        this.controller ??= new IterationController({
            transition: () => {
                const step = Math.min(ITERATE_STEP_MAX, stepOf(this.model) + 1);
                this.ticking = true;
                try { this.commitModel({...this.model, step}); } finally { this.ticking = false; }
                this.requestRender();
                return step >= ITERATE_STEP_MAX ? "complete" : "continue";
            },
            stepIntervalMs: STEP_INTERVAL_MS,
            maxIterations: ITERATE_STEP_MAX,
            onComplete: () => this.requestRender(),
            scheduler: this.animationScheduler(),
        });
        if (this.controller.iteration !== stepOf(this.model)) this.controller.reset(stepOf(this.model));
        return this.controller;
    }

    /** A figure export captures the paused step, not a frame of a running orbit. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; the step stays where it is. */
    override pausePlayback(): void {
        if (!this.controller?.isPlaying()) return;
        this.controller.pause();
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the step on. Under reduced motion nothing plays: the button says why and Next step stays available. */
    play(): void {
        if (this.isPlaying() || !this.graphSession?.isAlive || stepOf(this.model) >= ITERATE_STEP_MAX || this.reducedMotion()) return;
        this.syncedController().play();
        this.requestRender();
    }

    stepOnce(): void {
        this.pausePlayback();
        if (stepOf(this.model) >= ITERATE_STEP_MAX) return;
        this.commitModel(applyStep(this.model, {count: 1}));
    }

    resetRun(): void {
        this.pausePlayback();
        if (stepOf(this.model) !== 0) this.commitModel({...this.model, step: 0});
        this.controller?.reset(0);
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        super.disposeFigureScene();
    }

    override unmount(): void {
        this.disposeController();
        super.unmount();
    }

    /** Writes one entry from typed input: snaps to 1/4, clamps to [-4, 4] and records the message. */
    protected setEntryFromInput(row: Row, column: Column, input: number): void {
        const edited = editMatrixEntry(this.model, "matrix", row, column, input);
        if (!edited.ok) throw new DomainError(edited.error.message);
        const {state, clamped, adjusted} = edited.value;
        this.notice = adjusted ? {row, column, kind: clamped ? "clamped" : "snapped"} : undefined;
        // An unchanged matrix keeps its example label; the commit still refreshes the notice.
        this.commitModel(sameMatrix(state.matrix, this.model.matrix) ? {...this.model} : state);
    }

    /** Both entries of one column in one commit (a drag moves both); each is snapped and clamped. */
    protected setColumn(column: Column, x: number, y: number, options: { syncScene?: boolean } = {}): void {
        const snapped = [snapEntryInput(x, "x"), snapEntryInput(y, "y")];
        if (!snapped[0].ok || !snapped[1].ok) throw new DomainError("The handle position must be finite.");
        const [sx, sy] = [snapped[0].value.value, snapped[1].value.value];
        const m = this.model.matrix;
        const next: Mat2 = column === 0 ? [[sx, m[0][1]], [sy, m[1][1]]] : [[m[0][0], sx], [m[1][0], sy]];
        this.notice = undefined;
        if (sameMatrix(next, m)) return;
        this.commitModel({...this.model, matrix: next, exampleId: "custom"}, options);
    }

    /** Reset: the identity map (and its example label); the view mode and the display switches stay. */
    protected resetToIdentity(): void {
        this.notice = undefined;
        this.commitModel({...this.model, matrix: IDENTITY, exampleId: "identity"});
    }

    protected setExample(id: string): void {
        if (!isLinearMapExampleId(id)) throw new DomainError(`The example must be one of the closed list, not ${id}.`);
        this.notice = undefined;
        this.commitModel(selectExample(this.model, id));
    }

    protected setMode(mode: string): void {
        if (!isLinearMapGraphMode(mode)) throw new DomainError(`The mode ${mode} is unknown.`);
        this.commitModel(changeMode(this.model, mode));
    }

    protected setToggle(field: "probeVisible" | "curveVisible" | "squareVisible" | "conicVisible", visible: boolean): void {
        if (field === "conicVisible") {
            if ((this.model.conicVisible === true) !== visible) this.commitModel({...this.model, conicVisible: visible});
            return;
        }
        if (this.model[field] !== visible) this.commitModel({...this.model, [field]: visible});
    }

    // ---- Lessons ----------------------------------------------------------------------------------------------------

    /**
     * Applies one `linear-map` scene action. The payload is validated strictly by the kernel (scene data is never snapped);
     * an invalid payload is a lesson-content error and throws a `DomainError` naming the field.
     */
    applyLinearMapAction(action: Extract<LessonAction, { kind: "linear-map" }> | LinearMapIterationAction): void {
        const unwrap = <P,>(result: LinearMapResult<P>): P => {
            if (!result.ok) throw new DomainError(`${result.error.field}: ${result.error.message}`);
            return result.value;
        };
        this.notice = undefined;
        // The typed action is re-validated as data: the types are compile-time only and lesson content may be hand-written JSON.
        const payload: unknown = action;
        switch (action.operation) {
            case "set-matrix": return this.commitModel(applySetMatrix(this.model, unwrap(validateSetMatrix(payload))));
            case "set-mode": {
                const {mode} = unwrap(validateSetMode(payload));
                if (!isLinearMapGraphMode(mode)) throw new DomainError(`mode: this graph does not draw the mode ${mode}.`);
                return this.commitModel(applySetMode(this.model, {mode}));
            }
            case "set-test-vector": return this.commitModel(applySetTestVector(this.model, unwrap(validateSetTestVector(payload))));
            case "set-example": return this.commitModel(applySetExample(this.model, unwrap(validateSetExample(payload))));
            case "set-conic": {
                const {visible} = payload as {visible?: unknown};
                if (typeof visible !== "boolean") throw new DomainError("visible: must be true or false.");
                return this.setToggle("conicVisible", visible);
            }
            case "set-start": return this.commitModel(applySetStart(this.model, unwrap(validateSetStart(payload))));
            case "step": return this.commitModel(applyStep(this.model, unwrap(validateStep(payload))));
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("linear-map", action => this.applyLinearMapAction(action));
    }

    // ---- Texts (shared by the board and the inspector) --------------------------------------------------------------

    private language(): NumberLanguage {
        return currentLanguage();
    }

    private num(value: number, decimals = 2): string {
        return formatNumber(value, this.language(), decimals);
    }

    private vector(v: Vec2): string {
        return `(${this.num(v[0])}, ${this.num(v[1])})`;
    }

    /** A factor in a product: a negative number gets parentheses. */
    private factor(value: number): string {
        return value < 0 ? `(${this.num(value)})` : this.num(value);
    }

    /** "a·d − b·c = 2·1 − (−1)·1 = 3" */
    private formula(view: View): string {
        const [[a, b], [c, d]] = view.matrix;
        return `a·d − b·c = ${this.factor(a)}·${this.factor(d)} − ${this.factor(b)}·${this.factor(c)} = ${this.num(view.determinant, 4)}`;
    }

    private orientationText(sign: -1 | 0 | 1): string {
        return sign > 0 ? t("linear_map_orientation_kept") : sign < 0 ? t("linear_map_orientation_reversed") : t("linear_map_orientation_none");
    }

    private exampleLabel(choice: LinearMapExampleChoice): string {
        switch (choice) {
            case "identity": return t("linear_map_example_identity");
            case "basis-default": return t("linear_map_example_basis_default");
            case "orientation-reversing": return t("linear_map_example_orientation_reversing");
            case "singular": return t("linear_map_example_singular");
            case "eigen-default": return t("linear_map_example_eigen_default");
            case "quarter-turn": return t("linear_map_example_quarter_turn");
            case "shear": return t("linear_map_example_shear");
            case "symmetric": return t("linear_map_example_symmetric");
            case "non-symmetric": return t("linear_map_example_non_symmetric");
            case "reflection-x": return t("linear_map_example_reflection_x");
            case "scalar-2": return t("linear_map_example_scalar_2");
            case "custom": return t("linear_map_example_custom");
            default: return t("linear_map_example_other");
        }
    }

    private modeLabel(mode: LinearMapGraphMode): string {
        switch (mode) {
            case "basis": return t("linear_map_mode_basis");
            case "determinant": return t("linear_map_mode_determinant");
            case "eigen": return t("linear_map_mode_eigen");
            case "ellipse": return t("linear_map_mode_ellipse");
            case "iterate": return t("linear_map_mode_iterate");
            case "tracedet": return t("linear_map_mode_tracedet");
        }
    }

    private entryLabel(row: Row, column: Column): string {
        if (column === 0) return row === 0 ? t("linear_map_a1_x_label") : t("linear_map_a1_y_label");
        return row === 0 ? t("linear_map_a2_x_label") : t("linear_map_a2_y_label");
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        this.boardViewKey = this.viewKey();
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const basisLike = () => model().mode === "basis" || model().mode === "determinant";
        const squareShown = () => basisLike() && model().squareVisible;
        const curveShown = () => basisLike() && model().curveVisible;
        const probeShown = () => basisLike() && model().probeVisible;
        const gridsShown = () => model().mode !== "tracedet";
        const colors = {...LINEAR_MAP_COLORS, polygon: GraphPalette.controlPolygon};

        // A curve whose points come from a function; NaN entries break the polyline (grid), finite everywhere else.
        const polyline = (points: () => Polyline, attributes: object) => {
            const curve = this.own(board.create("curve", [[], []], {
                highlight: false, fixed: true, withLabel: false, ...attributes,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const {x, y} = points();
                curve.dataX = x;
                curve.dataY = y;
            };
        };

        // Layers, lowest first: the source grid, the image grid (one curve), the square, the Bezier curves and polygons, the points.
        polyline(() => SOURCE_GRID, {strokeColor: colors.sourceGrid, strokeOpacity: 0.72, strokeWidth: thin, visible: gridsShown});
        polyline(() => view().grid, {strokeColor: colors.imageGrid, strokeOpacity: 0.68, strokeWidth: thin, visible: gridsShown});

        // The Batch D layers sit above the grids and below the square, the curves and the basis handles.
        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const iterationContext: IterationBoardContext = {
            board, own: object => this.own(object), mode: () => model().mode as LinearMapGraphMode, step: () => stepOf(model()),
            iteration: () => this.iterationOf(this.model), traceDet: () => this.traceDetOf(this.model), start: () => startOf(this.model),
            strokeWidth, thin, markerSize, fontSize: this.displayFontSize,
            fixedPointAttributes: this.styles.point.fixed, handleAttributes: {...this.styles.point.default, strokeColor: GraphPalette.pointOutline},
            pointLabel: (placement, distance, shown) => this.pointLabel(placement, distance, shown),
            dragStart: (x, y) => this.dragStart(x, y), dragTraceDet: (tau, delta) => this.dragTraceDet(tau, delta),
            text: {
                triangle: () => t("linear_map_area_triangle"), flow: () => t("linear_map_area_flow"), parabola: () => t("linear_map_area_parabola"),
            },
        };
        createIterationCurves(iterationContext);
        const eigenContext: EigenBoardContext = {
            board, own: object => this.own(object), active: () => model().mode === "eigen",
            vPlacement: () => this.labelCell("v", "above-right"), avPlacement: () => this.labelCell("av", "above-right"),
            v: () => this.eigenOf(this.model).v, av: () => this.eigenOf(this.model).av, lines: () => this.eigenOf(this.model).lines,
            strokeWidth, thin, markerSize, fixedPointAttributes: this.styles.point.fixed,
            handleAttributes: {...this.styles.point.default, strokeColor: GraphPalette.pointOutline},
            pointLabel: (placement, distance, shown) => this.pointLabel(placement, distance, shown),
            dragTip: (x, y) => this.dragEigenTip(x, y),
        };
        createEigenCurves(eigenContext);
        const ellipseContext: EllipseBoardContext = {
            board, own: object => this.own(object), active: () => model().mode === "ellipse", conicShown: () => model().conicVisible === true,
            imageCurve: () => this.ellipseOf(this.model).imageCurve, conicCurve: () => this.ellipseOf(this.model).conic.curve,
            lines: () => this.ellipseOf(this.model).lines, axes: () => this.ellipseOf(this.model).axes,
            conicAxes: () => this.ellipseOf(this.model).conicAxes, directions: () => this.ellipseOf(this.model).directions,
            pointImage: () => this.ellipseOf(this.model).kind === "point", placement: id => this.labelCell(id, "above-right"),
            strokeWidth, thin, markerSize, fixedPointAttributes: this.styles.point.fixed,
            pointLabel: (placement, distance, shown) => this.pointLabel(placement, distance, shown),
        };

        polyline(() => closedPolyline(unitSquareImage(IDENTITY)), {strokeColor: colors.sourcePoint, strokeWidth: strokeWidth, visible: squareShown});
        polyline(() => closedPolyline(view().square), {
            strokeColor: colors.square, strokeWidth, fillColor: colors.squareFill, fillOpacity: 0.72, visible: squareShown,
        });

        polyline(() => openPolyline(FIXTURE_CONTROL_POINTS), {strokeColor: colors.polygon, strokeWidth: thin, dash: 2, visible: curveShown});
        polyline(() => openPolyline(view().imageControl), {strokeColor: colors.polygon, strokeWidth: thin, dash: 2, visible: curveShown});
        const bezier = (controls: () => readonly Vec2[], color: string) =>
            this.own(board.create("curve", [
                (s: number) => bezierPoint(controls(), s)[0], (s: number) => bezierPoint(controls(), s)[1], 0, 1,
            ], {strokeColor: color, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: curveShown}));
        bezier(() => FIXTURE_CONTROL_POINTS, colors.sourceCurve);
        bezier(() => view().imageControl, colors.imageCurve);

        const fixedPoint = (x: () => number, y: () => number, name: string | (() => string), placement: LabelPlacement | (() => LabelPlacement),
                            color: string, shown: () => boolean, labelShown: () => boolean = shown) =>
            this.own(board.create("point", [x, y], {
                ...this.styles.point.fixed, name, label: this.pointLabel(placement, 0.9, labelShown), size: markerSize, fillColor: color,
                highlightFillColor: color, strokeColor: color, fixed: true, visible: shown,
            }));
        // The source basis vectors, the image of the origin and of e1 + e2 (the other vertices of the image square are the handles).
        // A source label steps aside while its image lies less than a unit away, since labels sit about a unit off their point
        // (the identity puts a1 on e1, a2 on e2 and Ap on p).
        // p = e1 + e2, so Ap always sits on A(e1+e2): with the square and p both shown, one point carries both names.
        const near = (u: Vec2, v: Vec2) => Math.max(Math.abs(u[0] - v[0]), Math.abs(u[1] - v[1])) < 1;
        const aside = (source: Vec2, image: () => Vec2, usual: LabelPlacement, crowded: LabelPlacement) =>
            () => near(source, image()) ? crowded : usual;
        fixedPoint(() => 1, () => 0, "$$e_1$$", aside([1, 0], () => view().a1, "below-right", "below-left"), colors.sourcePoint, squareShown);
        fixedPoint(() => 0, () => 1, "$$e_2$$", aside([0, 1], () => view().a2, "above-left", "left"), colors.sourcePoint, squareShown);
        fixedPoint(() => 0, () => 0, "$$O$$", "below-left", colors.square, squareShown);
        fixedPoint(() => view().square[2][0], () => view().square[2][1], "$$A(e_1+e_2)$$", "above-right", colors.square, squareShown,
            () => squareShown() && !probeShown());
        fixedPoint(() => PROBE_POINT[0], () => PROBE_POINT[1], "$$p$$", aside(PROBE_POINT, () => view().probeImage, "below-right", "above-left"), colors.sourceCurve, probeShown);
        fixedPoint(() => view().probeImage[0], () => view().probeImage[1], () => squareShown() ? "$$Ap=A(e_1+e_2)$$" : "$$Ap$$", "above-right",
            colors.imageHandle, probeShown);

        // a1 and a2 are dragged on the 1/4 grid inside [-4, 4]^2; each drag event writes the model once with both coordinates.
        const handle = (column: Column, name: string, placement: LabelPlacement | (() => LabelPlacement), color: string) => {
            const m = this.model.matrix;
            const point = this.own(board.create("point", [m[0][column], m[1][column]], {
                ...this.styles.point.default, name, label: this.pointLabel(placement, 1.1, gridsShown), size: markerSize,
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
                visible: gridsShown,
            })) as JXG.Point;
            point.on("drag", () => {
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                this.ignoreOutOfDomain(() => this.setColumn(column, point.X(), point.Y(), {syncScene: false}));
                const current = this.model.matrix;
                point.moveTo([current[0][column], current[1][column]]);
            });
            // The eigen mode's view follows the matrix only when the drag ends.
            point.on("up", () => this.refitView());
            return point;
        };
        this.handle1 = handle(0, "$$a_1=Ae_1$$", () => this.labelCell("a1", "below-right"), colors.imageHandle);
        this.handle2 = handle(1, "$$a_2=Ae_2$$", () => this.labelCell("a2", "above-left"), colors.imageHandle);

        const iterationHandles = createIterationPoints(iterationContext);
        this.startHandle = iterationHandles.startHandle;
        this.traceDetHandle = iterationHandles.tdHandle;
        this.eigenTip = createEigenPoints(eigenContext);
        // After the handles, so the first board points stay the grids' and the handles' (the ellipse draws only in its mode).
        createEllipseObjects(ellipseContext);

        // The basis images and the determinant stay on the board; the narrow board drops the orientation line.
        this.caption("bottom-left", [
            {text: () => t("linear_map_board_columns", {value0: this.vector(view().a1), value1: this.vector(view().a2)}), scale: 1.1, math: true, visible: gridsShown},
            {
                text: () => {
                    const at = iterateAt(this.iterationOf(this.model), this.model.matrix, stepOf(this.model));
                    return t("linear_map_board_iterate", {value0: String(at.step), value1: this.vector(at.point)});
                },
                scale: 1.1, math: true, visible: () => model().mode === "iterate",
            },
            {
                text: () => {
                    const td = this.traceDetOf(this.model);
                    return t("linear_map_board_trace_det", {value0: this.num(td.tau, 4), value1: this.num(td.delta, 4)});
                },
                scale: 1.1, math: true, visible: () => model().mode === "tracedet",
            },
            {text: () => t("linear_map_board_det", {value0: this.num(view().determinant, 4)}), visible: () => model().mode === "determinant", math: true},
            {
                text: () => t("linear_map_board_orientation", {value0: this.orientationText(view().sign)}),
                visible: () => model().mode === "determinant", minBoardWidth: COMPACT_BOARD_WIDTH,
            },
        ]);
    }

    protected override syncSceneToModel(): void {
        const m = this.model.matrix;
        this.handle1?.moveTo([m[0][0], m[1][0]]);
        this.handle2?.moveTo([m[0][1], m[1][1]]);
        const start = startOf(this.model);
        this.startHandle?.moveTo([start[0], start[1]]);
        const td = this.traceDetOf(this.model);
        this.traceDetHandle?.moveTo([td.tau, td.delta]);
        const tip = unitVector(this.model.testAngle);
        this.eigenTip?.moveTo([tip[0], tip[1]]);
        this.refitView();
    }

    private viewKey(): string {
        const mode = this.model.mode as LinearMapGraphMode;
        if (mode === "ellipse") return `ellipse:${JSON.stringify(this.model.matrix)}:${this.model.conicVisible === true}`;
        return mode === "eigen" ? `eigen:${JSON.stringify(this.model.matrix)}` : planeOf(mode);
    }

    /** The trace-determinant plane, the eigen mode and the ellipse mode have their own views; a change of the plane or, in the two modes, of the matrix (and the conic switch) shows the new one. */
    private refitView(): void {
        const key = this.viewKey();
        if (key === this.boardViewKey) return;
        this.boardViewKey = key;
        if (!this.keepImportedView) this.board.setBoundingBox(this.defaultBoundingBox(), this.equalAxisUnits);
    }

    protected override onSceneRemoved(): void {
        this.handle1 = undefined;
        this.handle2 = undefined;
        this.startHandle = undefined;
        this.traceDetHandle = undefined;
        this.eigenTip = undefined;
        this.eigenMemo = undefined;
        this.ellipseMemo = undefined;
        this.labelMemo = undefined;
        this.iterationMemo = undefined;
        this.traceDetMemo = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const exampleOptions: LinearMapExampleChoice[] = [...EXAMPLE_IDS_OFFERED];
        if (!exampleOptions.includes(state.exampleId)) exampleOptions.push(state.exampleId);
        // Reset also names the identity example and clears the message, so it is unavailable only when all of that already holds.
        const atIdentity = state.exampleId === "identity" && this.notice === undefined
            && state.matrix.every((row, r) => row.every((value, c) => value === IDENTITY[r][c]));
        const entry = (row: Row, column: Column) => (
            <NumberInput label={this.entryLabel(row, column)} value={state.matrix[row][column]} step={MATRIX_ENTRY_STEP} decimals={2}
                         describedBy="linear-map-entries-help linear-map-notice"
                         onChange={next => this.ignoreOutOfDomain(() => this.setEntryFromInput(row, column, next))}/>
        );
        const notice = this.notice;
        const iterating = state.mode === "iterate";
        const eigenMode = state.mode === "eigen";
        const ellipseMode = state.mode === "ellipse";
        const eigen = this.eigenOf(state);
        const snapReason = eigen.classification.kind === "complex" ? t("linear_map_snap_unavailable_complex")
            : eigen.classification.kind === "repeated" && eigen.classification.repeated === "scalar" ? t("linear_map_snap_unavailable_scalar") : undefined;
        const basisLike = state.mode === "basis" || state.mode === "determinant";
        const startHelpId = `linear-map-start-help-${this.uid}`;
        const stepCounterId = `linear-map-step-counter-${this.uid}`;
        const start = startOf(state);
        const startEntry = (axis: 0 | 1) => (
            <NumberInput label={axis === 0 ? t("linear_map_start_x_label") : t("linear_map_start_y_label")} value={start[axis]} step={MATRIX_ENTRY_STEP}
                         decimals={2} min={-4} max={4} describedBy={startHelpId} rejectedHint={t("linear_map_start_rejected")}
                         onChange={next => this.setStartFromInput(axis, next)}/>
        );
        const playing = this.isPlaying();
        const step = stepOf(state);
        const blocks = playbackBlocks({atStart: step === 0, atEnd: step >= ITERATE_STEP_MAX, playing});
        const toggle = (field: "probeVisible" | "curveVisible" | "squareVisible", label: string) => (
            <OnOffSwitch checked={state[field]} label={label} onChange={checked => this.setToggle(field, checked)}/>
        );
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("linear_map_example_label")} value={state.exampleId} help={t("linear_map_example_help")}
                              options={exampleOptions.map(id => ({value: id, text: this.exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => { if (next !== "custom") this.setExample(next); })}/>
                <ChoiceSelect label={t("linear_map_mode_label")} value={state.mode}
                              options={LINEAR_MAP_GRAPH_MODES.map(mode => ({value: mode, text: this.modeLabel(mode)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMode(next))}/>
            </div>
            <div className="inspector-group">
                <div className="function-points-grid">
                    {entry(0, 0)}
                    {entry(1, 0)}
                    {entry(0, 1)}
                    {entry(1, 1)}
                </div>
                <p id="linear-map-entries-help" className="inspector-help">{t("linear_map_entries_help")}</p>
                <div id="linear-map-notice" role="status" aria-live="polite">
                    {notice && <p className="inspector-help" data-linear-map-notice={notice.kind}>
                        {t(notice.kind === "clamped" ? "linear_map_notice_clamped" : "linear_map_notice_snapped", {value0: this.entryLabel(notice.row, notice.column)})}
                    </p>}
                </div>
                <div className={CONTROL_ROW_FILL} role="group" aria-label={t("linear_map_actions_label")}>
                    <UnavailableButton data-action="linear-map-reset" reason={atIdentity ? t("linear_map_at_identity") : undefined}
                                       onPress={() => this.resetToIdentity()}>{t("linear_map_reset")}</UnavailableButton>
                </div>
                {basisLike && toggle("squareVisible", t("linear_map_toggle_square"))}
                {basisLike && toggle("probeVisible", t("linear_map_toggle_probe"))}
                {basisLike && toggle("curveVisible", t("linear_map_toggle_curve"))}
                {!basisLike && <p className="inspector-help" data-linear-map-toggles-hidden="">{t("linear_map_toggles_hidden")}</p>}
            </div>
            {eigenMode && <div className="inspector-group">
                <p className="inspector-help" data-linear-map-eigen-gloss="">{t("linear_map_note_eigen", {value0: this.num(EIGEN_PARALLEL_TOLERANCE, 2)})}</p>
                <AngleSlider customText={t("linear_map_test_angle_label")} value={state.testAngle}
                             onChange={next => this.ignoreOutOfDomain(() => this.setTestAngle(next))}/>
                <div className={CONTROL_ROW_FILL} role="group" aria-label={t("linear_map_actions_label")}>
                    <UnavailableButton data-action="linear-map-snap-eigen" reason={snapReason} onPress={() => this.snapToEigen()}>
                        {t("linear_map_snap_eigen")}
                    </UnavailableButton>
                </div>
            </div>}
            {ellipseMode && <div className="inspector-group">
                <p className="inspector-help" data-linear-map-ellipse-gloss="">{t("linear_map_note_ellipse")}</p>
                <OnOffSwitch checked={state.conicVisible === true} label={t("linear_map_toggle_conic")} onChange={checked => this.setToggle("conicVisible", checked)}/>
            </div>}
            {iterating && <div className="inspector-group">
                <p className="inspector-help" data-linear-map-iterate-gloss="">{t("linear_map_note_iterate")}</p>
                <div className="function-points-grid">
                    {startEntry(0)}
                    {startEntry(1)}
                </div>
                <p id={startHelpId} className="inspector-help">{t("linear_map_start_help")}</p>
                <ReducedMotion>{() =>
                    <PlaybackButtons placement="graph" groupLabel={t("linear_map_playback_group")} nextLabel={t("next_step")} resetLabel={t("reset")}
                                     playing={playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...blocks} reducedMotionReason={t("playback_block_reduced_motion_next_step")}
                                     playBlock={blocks.playBlock ?? (!playing && this.reducedMotion() ? "reduced-motion" : undefined)}
                                     describedBy={{"next-step": stepCounterId}}>
                        <p id={stepCounterId} data-step-counter="">{t("step_counter", {value0: step, value1: ITERATE_STEP_MAX})}</p>
                    </PlaybackButtons>}
                </ReducedMotion>
            </div>}
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        const mode = this.model.mode;
        const colors = ITERATION_COLORS;
        if (mode === "tracedet") {
            return <FunctionLegend items={[
                {id: "parabola", color: colors.parabola, label: t("linear_map_legend_parabola"), kind: legendKindFor(TRACE_DET_DRAWING.parabola)},
                {id: "triangle", color: colors.triangle, label: t("linear_map_legend_triangle"), kind: legendKindFor(TRACE_DET_DRAWING.triangle)},
                {id: "flow", color: colors.flow, label: t("linear_map_legend_flow"), kind: legendKindFor(TRACE_DET_DRAWING.flow)},
                {id: "point", color: colors.handle, label: t("linear_map_legend_point"), kind: "dot"},
            ]}/>;
        }
        if (mode === "eigen") {
            return <FunctionLegend items={[
                {id: "source-grid", color: LINEAR_MAP_COLORS.sourceGrid, label: t("linear_map_legend_source_grid"), kind: "line"},
                {id: "image-grid", color: LINEAR_MAP_COLORS.imageGrid, label: t("linear_map_legend_image_grid"), kind: "line"},
                {id: "circle", color: EIGEN_COLORS.circle, label: t("linear_map_legend_eigen_circle"), kind: "line"},
                {id: "v", color: EIGEN_COLORS.vector, label: t("linear_map_legend_eigen_v"), kind: "line"},
                {id: "av", color: EIGEN_COLORS.image, label: t("linear_map_legend_eigen_av"), kind: "line"},
                {id: "lines", color: EIGEN_COLORS.line, label: t("linear_map_legend_eigen_lines"), kind: "line"},
            ]}/>;
        }
        if (mode === "ellipse") {
            const conic = this.model.conicVisible === true;
            return <FunctionLegend items={[
                {id: "source-grid", color: LINEAR_MAP_COLORS.sourceGrid, label: t("linear_map_legend_source_grid"), kind: "line"},
                {id: "image-grid", color: LINEAR_MAP_COLORS.imageGrid, label: t("linear_map_legend_image_grid"), kind: "line"},
                {id: "circle", color: ELLIPSE_COLORS.circle, label: t("linear_map_legend_eigen_circle"), kind: "line"},
                conic
                    ? {id: "conic", color: ELLIPSE_COLORS.conic, label: t("linear_map_legend_ellipse_conic"), kind: "line"}
                    : {id: "image", color: ELLIPSE_COLORS.image, label: t("linear_map_legend_ellipse_image"), kind: "line"},
                conic
                    ? {id: "conic-axes", color: ELLIPSE_COLORS.conic, label: t("linear_map_legend_ellipse_conic_axes"), kind: "line"}
                    : {id: "axes", color: ELLIPSE_COLORS.image, label: t("linear_map_legend_ellipse_axes"), kind: "line"},
                ...(conic ? [] : [{id: "directions", color: ELLIPSE_COLORS.direction, label: t("linear_map_legend_ellipse_directions"), kind: "line" as const}]),
                {id: "lines", color: ELLIPSE_COLORS.line, label: t("linear_map_legend_eigen_lines"), kind: "dashed-line"},
            ]}/>;
        }
        if (mode === "iterate") {
            return <FunctionLegend items={[
                {id: "source-grid", color: LINEAR_MAP_COLORS.sourceGrid, label: t("linear_map_legend_source_grid"), kind: "line"},
                {id: "image-grid", color: LINEAR_MAP_COLORS.imageGrid, label: t("linear_map_legend_image_grid"), kind: "line"},
                {id: "iterates", color: colors.orbit, label: t("linear_map_legend_iterates"), kind: "dot"},
                {id: "unit", color: colors.unit, label: t("linear_map_legend_unit"), kind: "line"},
                {id: "dominant", color: colors.dominant, label: t("linear_map_legend_dominant"), kind: "line"},
                {id: "other", color: colors.other, label: t("linear_map_legend_other"), kind: "dashed-line"},
            ]}/>;
        }
        return <FunctionLegend items={[
            {id: "source-grid", color: LINEAR_MAP_COLORS.sourceGrid, label: t("linear_map_legend_source_grid"), kind: "line"},
            {id: "image-grid", color: LINEAR_MAP_COLORS.imageGrid, label: t("linear_map_legend_image_grid"), kind: "line"},
            {id: "square", color: LINEAR_MAP_COLORS.square, label: t("linear_map_legend_square"), kind: "line"},
            {id: "curve", color: LINEAR_MAP_COLORS.sourceCurve, label: t("linear_map_legend_curve"), kind: "line"},
            {id: "curve-image", color: LINEAR_MAP_COLORS.imageCurve, label: t("linear_map_legend_curve_image"), kind: "line"},
        ]}/>;
    }

    /** The statuses to state in words; each has a stable id for tests and assistive technology. Zero never says positive or negative. */
    private statuses(model: LinearMapState, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (model.mode === "iterate") return this.iterationStatuses(model);
        if (model.mode === "tracedet") return this.traceDetStatuses(model);
        if (model.mode === "eigen") return this.eigenStatuses(model);
        if (model.mode === "ellipse") return this.ellipseStatuses(model);
        if (model.mode === "determinant") {
            if (view.sign > 0) result.push({id: "positive", text: t("linear_map_status_positive")});
            else if (view.sign < 0) result.push({id: "negative", text: t("linear_map_status_negative")});
            else result.push({id: "zero", text: t("linear_map_status_zero")});
        }
        if (view.collapse === "line") result.push({id: "collapse-line", text: t("linear_map_status_collapse_line")});
        if (view.collapse === "point") result.push({id: "collapse-point", text: t("linear_map_status_collapse_point")});
        return result;
    }

    /** Exact statements come from the kernel's exact tests; only "settled" is a computed claim and says so. */
    private iterationStatuses(model: LinearMapState): { id: StatusKind; text: string }[] {
        const run = this.iterationOf(model);
        const start = startOf(model);
        if (start[0] === 0 && start[1] === 0) return [{id: "zero-start", text: t("linear_map_status_zero_start")}];
        const at = iterateAt(run, model.matrix, stepOf(model));
        const result: { id: StatusKind; text: string }[] = [];
        if (run.collapsed) result.push({id: "collapses", text: t("linear_map_status_collapses")});
        else if (run.outcome === "dominant") {
            result.push(run.startToZero ? {id: "start-to-zero", text: t("linear_map_status_start_to_zero")}
                : run.otherEigenvector
                ? {id: "other-eigenvector", text: t("linear_map_status_other_eigenvector")}
                : {id: "dominant", text: t("linear_map_status_dominant")});
        } else if (run.outcome === "equal-moduli") result.push({id: "equal-moduli", text: t("linear_map_status_equal_moduli")});
        else if (run.outcome === "rotating") result.push({id: "rotating", text: t("linear_map_status_rotating")});
        else if (run.outcome === "scalar") result.push({id: "scalar", text: t("linear_map_status_scalar")});
        else result.push({id: "defective", text: t("linear_map_status_defective")});
        if (at.zero && !run.collapsed) result.push({id: "zero-iterate", text: t("linear_map_status_zero_iterate")});
        const approaches = (run.outcome === "dominant" && !run.otherEigenvector) || run.outcome === "defective";
        if (!run.collapsed && !at.zero && approaches && at.angleError !== undefined && at.angleError <= SETTLED_ANGLE_DEGREES) {
            result.push({id: "settled", text: t("linear_map_status_settled", {value0: this.num(SETTLED_ANGLE_DEGREES, 0)})});
        }
        return result;
    }

    /** The parallel indicator first (approximate exactly when the kernel's tolerance test holds; exact only on the quarter grid), then the case. */
    private eigenStatuses(model: LinearMapState): { id: StatusKind; text: string }[] {
        const eigen = this.eigenOf(model);
        const tolerance = this.num(EIGEN_PARALLEL_TOLERANCE, 2);
        const result: { id: StatusKind; text: string }[] = [];
        if (eigen.approximatelyParallel) result.push({id: "eigen-approx-parallel", text: t("linear_map_status_eigen_approx_parallel", {value0: tolerance})});
        else result.push({id: "eigen-not-parallel", text: t("linear_map_status_eigen_not_parallel", {value0: tolerance})});
        // A zero image has no direction: v in the kernel is not "exactly parallel" to Av, it is mapped to 0 (eigenvalue 0).
        if (eigen.av[0] === 0 && eigen.av[1] === 0) result.push({id: "eigen-v-kernel", text: t("linear_map_status_eigen_v_kernel")});
        else if (eigen.exactlyParallel) result.push({id: "eigen-exact-parallel", text: t("linear_map_status_eigen_exact_parallel")});
        const c = eigen.classification;
        if (c.kind === "distinct-real") result.push({id: "eigen-two", text: t("linear_map_status_eigen_two")});
        else if (c.kind === "complex") {
            result.push({id: "eigen-none", text: t("linear_map_status_eigen_none", {value0: this.num(c.real, 4), value1: this.num(c.imaginary, 4)})});
        } else if (c.repeated === "scalar") result.push({id: "eigen-all", text: t("linear_map_status_eigen_all", {value0: this.num(c.eigenvalue, 4)})});
        else result.push({id: "eigen-one", text: t("linear_map_status_eigen_one")});
        if (eigen.delta === 0 && c.kind !== "complex" && !(c.kind === "repeated" && c.repeated === "scalar")) {
            result.push({id: "eigen-kernel", text: t("linear_map_status_eigen_kernel")});
        }
        return result;
    }

    private ellipseStatuses(model: LinearMapState): { id: StatusKind; text: string }[] {
        const ellipse = this.ellipseOf(model);
        const result: { id: StatusKind; text: string }[] = [];
        result.push(ellipse.symmetric ? {id: "ellipse-symmetric", text: t("linear_map_status_ellipse_symmetric")}
            : {id: "ellipse-nonsymmetric", text: t("linear_map_status_ellipse_nonsymmetric")});
        if (ellipse.kind === "segment") result.push({id: "ellipse-segment", text: t("linear_map_status_ellipse_segment")});
        else if (ellipse.kind === "point") result.push({id: "ellipse-point", text: t("linear_map_status_ellipse_point")});
        else if (ellipse.kind === "circle") result.push({id: "ellipse-circle", text: t("linear_map_status_ellipse_circle")});
        if (ellipse.lines.length === 0) result.push({id: "ellipse-no-lines", text: t("linear_map_status_ellipse_no_lines")});
        if (model.conicVisible === true) {
            const kind = ellipse.conic.kind;
            result.push(kind === "ellipse" ? {id: "conic-ellipse", text: t("linear_map_status_conic_ellipse")}
                : kind === "hyperbola" ? {id: "conic-hyperbola", text: t("linear_map_status_conic_hyperbola")}
                : kind === "parallel-lines" ? {id: "conic-lines", text: t("linear_map_status_conic_lines")}
                : {id: "conic-empty", text: t("linear_map_status_conic_empty")});
        }
        return result;
    }

    private eigenvaluesText(eigen: EigenView): string {
        const c = eigen.classification;
        if (c.kind === "distinct-real") return t("linear_map_value_eigenvalues_two", {value0: this.num(c.eigenvalues[0], 4), value1: this.num(c.eigenvalues[1], 4)});
        if (c.kind === "complex") return t("linear_map_value_eigenvalues_complex", {value0: this.num(c.real, 4), value1: this.num(c.imaginary, 4)});
        return this.num(c.eigenvalue, 4);
    }

    private traceDetStatuses(model: LinearMapState): { id: StatusKind; text: string }[] {
        const td = this.traceDetOf(model);
        const result: { id: StatusKind; text: string }[] = [];
        const {stability} = td;
        if (stability.kind === "inside") result.push({id: "td-inside", text: t("linear_map_status_td_inside")});
        else if (stability.kind === "outside") result.push({id: "td-outside", text: t("linear_map_status_td_outside")});
        else {
            const text = stability.edge === "determinant-one" ? t("linear_map_status_td_edge_determinant_one")
                : stability.edge === "eigenvalue-one" ? t("linear_map_status_td_edge_eigenvalue_one") : t("linear_map_status_td_edge_eigenvalue_minus_one");
            result.push({id: "td-edge", text});
        }
        result.push(td.flowStable ? {id: "flow-stable", text: t("linear_map_status_flow_stable")} : {id: "flow-unstable", text: t("linear_map_status_flow_unstable")});
        if (this.companionMatrix === model.matrix) result.push({id: "companion", text: t("linear_map_status_companion")});
        if (Math.abs(td.tau) > TRACE_DET_DRAG_LIMIT || Math.abs(td.delta) > TRACE_DET_DRAG_LIMIT) result.push({id: "td-range", text: t("linear_map_status_td_range")});
        return result;
    }

    private readoutRows(model: LinearMapState, view: View): { id: string; label: string; value: string }[] {
        const [[a, b], [c, d]] = view.matrix;
        const none = t("linear_map_value_none");
        const optional = (value: number | undefined, decimals = 4) => value === undefined ? none : this.num(value, decimals);
        const matrixRows = [
            {id: "row1", label: t("linear_map_readout_row1"), value: `${this.num(a)}   ${this.num(b)}`},
            {id: "row2", label: t("linear_map_readout_row2"), value: `${this.num(c)}   ${this.num(d)}`},
        ];
        const basisRows = [
            {id: "a1", label: t("linear_map_readout_a1"), value: this.vector(view.a1)},
            {id: "a2", label: t("linear_map_readout_a2"), value: this.vector(view.a2)},
        ];
        const start = startOf(model);
        const stepRows = (at: ReturnType<typeof iterateAt>) => [
            {id: "start", label: t("linear_map_readout_start"), value: this.vector(start)},
            {id: "step", label: t("linear_map_readout_step"), value: t("linear_map_readout_step_value", {value0: at.step, value1: ITERATE_STEP_MAX})},
        ];
        if (model.mode === "tracedet") {
            const td = this.traceDetOf(model);
            const stability = td.stability.kind === "inside" ? t("linear_map_stability_inside")
                : td.stability.kind === "edge" ? t("linear_map_stability_edge") : t("linear_map_stability_outside");
            return [
                ...matrixRows,
                {id: "tau", label: t("linear_map_readout_tau"), value: this.num(td.tau, 4)},
                {id: "delta", label: t("linear_map_readout_delta"), value: this.num(td.delta, 4)},
                {id: "discriminant", label: t("linear_map_readout_discriminant"), value: this.num(td.discriminant, 4)},
                {id: "stability", label: t("linear_map_readout_stability"), value: stability},
                {id: "flow", label: t("linear_map_readout_flow"), value: td.flowStable ? t("linear_map_flow_stable") : t("linear_map_flow_unstable")},
            ];
        }
        if (model.mode === "eigen") {
            const eigen = this.eigenOf(model);
            return [
                ...matrixRows,
                {id: "tau", label: t("linear_map_readout_tau"), value: this.num(eigen.tau, 4)},
                {id: "delta", label: t("linear_map_readout_delta"), value: this.num(eigen.delta, 4)},
                {id: "discriminant", label: t("linear_map_readout_discriminant"), value: this.num(eigen.discriminant, 4)},
                {id: "eigenvalues", label: t("linear_map_readout_eigenvalues"), value: this.eigenvaluesText(eigen)},
                {id: "test-angle", label: t("linear_map_readout_eigen_angle"), value: t("linear_map_readout_angle_value", {value0: this.num(model.testAngle, 2)})},
                {id: "v", label: t("linear_map_readout_eigen_v"), value: this.vector(eigen.v)},
                {id: "av", label: t("linear_map_readout_eigen_av"), value: this.vector(eigen.av)},
                {id: "sine", label: t("linear_map_readout_eigen_sine"), value: this.num(eigen.sine, 4)},
                {
                    id: "between", label: t("linear_map_readout_eigen_between"),
                    value: eigen.angleBetween === undefined ? none : t("linear_map_readout_angle_value", {value0: this.num(eigen.angleBetween, 2)}),
                },
            ];
        }
        if (model.mode === "ellipse") {
            const ellipse = this.ellipseOf(model);
            const angle = (value: number | undefined) => value === undefined ? none : t("linear_map_readout_angle_value", {value0: this.num(value, 2)});
            const conic = ellipse.conic;
            const pair = (a: number, b: number) => t("linear_map_value_eigenvalues_two", {value0: this.num(a, 4), value1: this.num(b, 4)});
            return [
                ...matrixRows,
                {id: "sigma1", label: t("linear_map_readout_sigma1"), value: this.num(ellipse.singular.sigma[0], 4)},
                {id: "sigma2", label: t("linear_map_readout_sigma2"), value: this.num(ellipse.singular.sigma[1], 4)},
                {id: "det", label: t("linear_map_readout_det"), value: this.num(ellipse.determinant, 4)},
                {id: "abs-det", label: t("linear_map_readout_abs_det"), value: this.num(ellipse.absDeterminant, 4)},
                {id: "sigma-product", label: t("linear_map_readout_sigma_product"), value: this.num(ellipse.product, 4)},
                {id: "axis-image", label: t("linear_map_readout_axis_image"), value: angle(ellipse.imageAxisAngle)},
                {id: "axis-domain", label: t("linear_map_readout_axis_domain"), value: angle(ellipse.domainAxisAngle)},
                ...(model.conicVisible === true ? [
                    {id: "sym-row1", label: t("linear_map_readout_sym_row1"), value: `${this.num(conic.symmetricPart[0][0])}   ${this.num(conic.symmetricPart[0][1])}`},
                    {id: "sym-row2", label: t("linear_map_readout_sym_row2"), value: `${this.num(conic.symmetricPart[1][0])}   ${this.num(conic.symmetricPart[1][1])}`},
                    {id: "conic-lambda", label: t("linear_map_readout_conic_lambda"), value: pair(conic.eigenvalues[0], conic.eigenvalues[1])},
                    {id: "conic-axes", label: t("linear_map_readout_conic_axes"), value: conic.semiAxes ? pair(conic.semiAxes[0], conic.semiAxes[1]) : none},
                ] : []),
            ];
        }
        if (model.mode === "iterate") {
            const run = this.iterationOf(model);
            const at = iterateAt(run, model.matrix, stepOf(model));
            return [
                ...matrixRows, ...basisRows, ...stepRows(at),
                {id: "iterate", label: t("linear_map_readout_iterate"), value: this.vector(at.point)},
                {id: "norm", label: t("linear_map_readout_norm"), value: this.num(at.norm, 4)},
                {id: "unit", label: t("linear_map_readout_unit"), value: at.unit ? this.vector(at.unit) : none},
                {id: "angle", label: t("linear_map_readout_angle"), value: at.angleError === undefined ? none : t("linear_map_readout_angle_value", {value0: this.num(at.angleError, 2)})},
                {id: "stretch", label: t("linear_map_readout_stretch"), value: optional(at.stretch)},
                estimatesDominant(run)
                    ? {id: "rayleigh", label: t("linear_map_readout_rayleigh"), value: optional(at.rayleigh)}
                    : {id: "rayleigh", label: t("linear_map_readout_rayleigh_plain"), value: optional(at.rayleigh)},
                {
                    id: "ratio", value: optional(run.orbit.modulusRatio),
                    label: estimatesDominant(run) ? t("linear_map_readout_ratio") : t("linear_map_readout_ratio_plain"),
                },
            ];
        }
        return [
            ...matrixRows, ...basisRows,
            {id: "probe", label: t("linear_map_readout_probe"), value: this.vector(view.probeImage)},
            ...(model.mode === "determinant" ? [
                {id: "det-formula", label: t("linear_map_readout_det_formula"), value: this.formula(view)},
                {id: "det", label: t("linear_map_readout_det"), value: this.num(view.determinant, 4)},
                {id: "area", label: t("linear_map_readout_area"), value: this.num(view.area, 4)},
                {id: "orientation", label: t("linear_map_readout_orientation"), value: this.orientationText(view.sign)},
            ] : []),
        ];
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const notes = [t("linear_map_note"), ...(model.mode === "tracedet" ? [t("linear_map_note_tracedet")] : [])];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={this.readoutRows(model, view)} note={notes}/>
            <FunctionStatus className="demo-status" dataAttribute="linear-map-status" lines={this.statuses(model, view)} muted={this.isPlaying()}/>
        </>;
    }
}

export default LinearMapGraph;
