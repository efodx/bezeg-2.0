import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import {
    CURVE_PAIR_INITIAL_STATE, CurvePairState, CurvePairTrace, curvePairRun, curvePairStateAt, curvePieces, pieceHull,
} from "../../compgeo/curvePairSubdivision";
import {PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import type {HullPoint} from "../../compgeo/hullSeparation";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {BaseGraphState} from "../base/BaseGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {SWEEP_COORD_LIMIT} from "../../compgeo/sweep/limits";
import {CURVE_PAIR_OVERLAY_IDS, CurveName, CurvePairGraph, CurvePairOverlayId, curvePairPresetCollection} from "./CurvePairGraph";
import {PointSetGraphState} from "./PointSetGraph";
import {registerTraceCommands} from "./traceLessonActions";

/** Time between two playback steps (one step per interval, never more), as in the hull trace. */
export const BEZIER_HULLS_STEP_INTERVAL_MS = 400;
/** The run has at most 1 + 2 * 4 events; the controller's step limit is far above it. */
const MAX_PLAYBACK_STEPS = 100000;

export type BezierHullsOverlayId = "pieces";
export const BEZIER_HULLS_OVERLAY_IDS = [...CURVE_PAIR_OVERLAY_IDS, "pieces"] as const;

const BEZIER_HULLS_COLLECTION = curvePairPresetCollection(BEZIER_HULLS_OVERLAY_IDS, {pointLimit: 8, coordinateLimit: SWEEP_COORD_LIMIT});

/** The saved configuration beyond the points: the step index. Playback status is never state. */
export interface BezierHullsGraphState extends PointSetGraphState {
    step: number;
}

/** How a drawn piece looks (the outline keeps the curve's dash unless `dash` is given). */
type PieceLook = Record<string, unknown>;
const OUTLINE_WIDTH = 2.5;
/** Split step: a candidate is an outline with no fill. */
const CANDIDATE_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 1, strokeWidth: OUTLINE_WIDTH};
/** Split step: the parent whose halves are the candidates, a thin outline. */
const PARENT_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 0.7, strokeWidth: 1};
/** Discard step: a piece in a kept pair is filled and solid. */
const KEPT_LOOK: PieceLook = {fillOpacity: 0.25, strokeOpacity: 1, strokeWidth: OUTLINE_WIDTH, dash: 0};
/** Discard step: a piece in no kept pair is faded and dashed (not by colour alone). */
const FADED_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 0.3, strokeWidth: 1.5, dash: 3};

function stepOf(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

const unique = (values: readonly number[]): number[] => [...new Set(values)];

/**
 * Back to Bezier hulls of control polygons (convexity task 25b, spec A6): two Bezier curves halved at t = 1/2, the hull of
 * every piece drawn, pairs of hulls that cannot be certified apart kept for the next depth (`curvePairRun`, task 24).
 * The scene state keeps only the points and the step index; the drawn state is always `curvePairStateAt` of the run.
 * Next step and every Play tick run the one `advance()`; Play uses the shared `IterationController` (an injectable
 * `AnimationScheduler`) and stops at the last step.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the run, returns the step to 0 and pauses. A scene
 * change, a figure capture and unmount pause playback; unmount disposes the controller so no scheduler callback stays
 * pending. The `pieces` overlay follows the step, which is not part of the model, through `overlayInputs()`.
 *
 * Reads for a readout (task 26): `step`, `run()`, `pairState` (depth, candidates, kept, discarded, tests, phase),
 * `isPlaying`; actions `nextStep()`, `play()`, `pause()`, `resetTrace()`.
 */
export class BezierHullsGraph extends CurvePairGraph<BezierHullsOverlayId> {
    private controller: IterationController;
    private controllerDisposed = false;
    private advancing = false;
    private runMemo?: {points: PointSetModel["points"]; run: CurvePairTrace};
    private inputsMemo?: {step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: BEZIER_HULLS_STEP_INTERVAL_MS,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The trace of the nets of `points`; recomputed only when the points change. */
    private runFor(points: PointSetModel["points"]): CurvePairTrace {
        if (this.runMemo?.points !== points) {
            const {a, b} = this.curvePairNets({...this.model, points});
            this.runMemo = {points, run: curvePairRun(a, b)};
        }
        return this.runMemo.run;
    }

    run(): CurvePairTrace {
        return this.runFor(this.model.points);
    }

    /** The step index, clamped to the current run (a stale stored index never leaves it). */
    get step(): number {
        const stored = "step" in this.state ? stepOf(this.state.step) : undefined;
        return Math.min(stored ?? 0, this.run().length - 1);
    }

    /** What the shown step knows: the depth, the candidate pairs, the verdicts so far, the test count and the phase. */
    get pairState(): CurvePairState {
        return this.run().length === 0 ? CURVE_PAIR_INITIAL_STATE : curvePairStateAt(this.run(), this.step);
    }

    get isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    override getInitialState(): BezierHullsGraphState {
        return {...super.getInitialState(), overlays: {control: true, hull: true, pieces: true}, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the step; `Partial<BezierHullsGraphState>` is the one place that types it for the base store. */
    private patch(fields: Partial<BezierHullsGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /** Every write of a new model (edit, drag, import) returns the step to 0 and pauses, unless the write names the step itself. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const before = this.state.model;
        let namedStep = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            namedStep = "step" in raw;
            if (raw.model === undefined || raw.model === state.model || "step" in raw) return raw;
            return this.patch({...raw, step: 0});
        };
        super.setState(wrapped, callback);
        // The controller does not exist yet while the base class is being constructed.
        if (!this.controller) return;
        if (this.state.model !== before) {
            this.controller.reset(namedStep ? this.step : 0);
            this.requestRender();
        } else if (namedStep && !this.advancing) {
            // A step written outside advance() (a restore, a lesson action) must not leave a stale "completed" controller.
            this.controller.reset(this.step);
            this.requestRender();
        }
    }

    // ---- Playback ------------------------------------------------------------------------------------------------

    private get atEnd(): boolean {
        return this.step >= this.run().length - 1;
    }

    /** The one transition of Next step and of every playback tick. */
    private advance(): IterationOutcome {
        const run = this.run();
        const next = Math.min(this.step + 1, Math.max(run.length - 1, 0));
        this.advancing = true;
        try {
            this.setState(this.patch({step: next}));
        } finally {
            this.advancing = false;
        }
        this.requestRender();
        return next >= run.length - 1 ? "complete" : "continue";
    }

    nextStep(): void {
        if (this.exportBusy || this.atEnd) return;
        this.controller.pause();
        this.controller.nextStep();
        this.requestRender();
    }

    play(): void {
        if (this.exportBusy || this.atEnd) return;
        this.controller.play();
        this.requestRender();
    }

    pause(): void {
        this.controller.pause();
        this.requestRender();
    }

    /** Back to step 0; playback stops. */
    resetTrace(): void {
        this.controller.reset(0);
        this.setState(this.patch({step: 0}));
        this.requestRender();
    }

    /** The `algorithm-trace` animation runs the very transitions of the buttons (the lesson `point-set` actions are task 28). */
    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registerTraceCommands(registry, this);
    }

    override mount(container: HTMLElement): void {
        // A disposed controller stays silent for good; a remount (React StrictMode) needs a new one.
        if (this.controllerDisposed) {
            this.controller = this.createController();
            this.controllerDisposed = false;
        }
        super.mount(container);
    }

    override unmount(): void {
        this.controller.dispose();
        this.controllerDisposed = true;
        super.unmount();
    }

    protected override stopLessonAnimations(): void {
        this.pause();
    }

    protected override beforeFigureCapture(): void {
        this.pause();
    }

    protected override disposeFigureScene(): void {
        if (this.controller) this.controller.pause();
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        if (this.controller) this.controller.pause();
        super.syncReplacedScene();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return BEZIER_HULLS_COLLECTION;
    }

    /** The saved scene state, with the step clamped to the run of the saved points. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: BezierHullsGraphState = {...this.state, step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new run; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = serializePointSetModel(data);
        const stored = "step" in this.state ? stepOf(this.state.step) : undefined;
        const step = Math.min(stored ?? 0, this.runFor(model.points).length - 1);
        this.setState(this.patch({model, step}));
        this.controller.reset(step);
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const stored = "step" in merged ? stepOf(merged.step) : undefined;
        const state: BezierHullsGraphState = {...merged, step: Math.min(stored ?? 0, this.runFor(merged.model.points).length - 1)};
        return state;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return BEZIER_HULLS_OVERLAY_IDS;
    }

    protected override overlayLabel(id: CurvePairOverlayId | BezierHullsOverlayId | "grid"): string {
        if (id === "pieces") return t("bezierhulls_overlay_pieces");
        return super.overlayLabel(id);
    }

    /** The pieces follow the step, which is not part of the model or of the shown set. */
    protected override overlayInputs(): unknown {
        const step = this.step;
        if (this.inputsMemo?.step === step) return this.inputsMemo;
        this.inputsMemo = {step};
        return this.inputsMemo;
    }

    protected override drawOverlay(id: CurvePairOverlayId | BezierHullsOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id !== "pieces") return super.drawOverlay(id, model);
        const {a, b, degree} = this.curvePairNets(model);
        const run = this.runFor(model.points);
        const state = curvePairStateAt(run, Math.min(this.step, run.length - 1));
        const withControl = this.overlayShown("control");
        const split = state.phase === "split";
        return ([["A", a, 0], ["B", b, 1]] as const).flatMap(([name, net, curve]) => {
            const candidates = unique(state.candidates.map(pair => pair[curve]));
            const kept = new Set(state.kept.map(pair => pair[curve]));
            const pieces = curvePieces(net, state.depth);
            const parentDepth = state.depth - 1;
            // A split step shows the pieces about to be tested inside the pieces they halve.
            const parents = split ? unique(candidates.map(i => i >> 1)) : [];
            const parentPieces = split ? curvePieces(net, parentDepth) : [];
            return [
                ...parents.flatMap(i => this.drawPieceHull(parentPieces[i], parentDepth, degree, name, model, `parent${name}${i}`, PARENT_LOOK)),
                ...candidates.flatMap(i => [
                    ...this.drawPieceHull(pieces[i], state.depth, degree, name, model, `piece${name}${i}`,
                        split ? CANDIDATE_LOOK : kept.has(i) ? KEPT_LOOK : FADED_LOOK),
                    ...(withControl ? [this.drawPieceControl(pieces[i], name, model, `pieceControl${name}${i}`)] : []),
                ]),
            ];
        });
    }

    /** The hull of one piece (dyadic grid units), exact through `pieceHull`, in board units; `look` sets fill, opacity, dash and width. */
    private drawPieceHull(piece: readonly HullPoint[], depth: number, degree: number, name: CurveName, model: PointSetModel,
                          objectName: string, look: PieceLook): JXG.GeometryElement[] {
        const style = this.curveStyle(name);
        const outline = {strokeColor: style.strokeColor, dash: style.dash, highlight: false, fixed: true, ...look};
        // A polygon takes the fill at the top and the outline in `borders`; a two-vertex hull is one curve and takes the top level.
        return this.drawHull(pieceHull(piece, depth, degree).map(i => piece[i]), name, model, {...look, name: objectName, borders: outline});
    }

    private drawPieceControl(piece: readonly HullPoint[], name: CurveName, model: PointSetModel, objectName: string): JXG.GeometryElement {
        const polygon = this.drawControlPolygon(piece, name, model);
        polygon.setAttribute({name: objectName});
        return polygon;
    }
}
