import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import {BaseGraphState} from "../base/BaseGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {HullTraceControlActions, HullTraceControls} from "./HullTraceControls";
import {hullTracePresetCollection} from "./hullTracePresetCollection";
import {
    DEFAULT_HULL_ALGORITHM, HullAlgorithm, hullPredicateTotals, HullRun, parseHullAlgorithm, parseHullStep, runHullTrace,
} from "./hullTraceRun";

/** Time between two playback steps (one step per interval, never more). */
export const HULL_TRACE_STEP_INTERVAL_MS = 400;
/** The slow edge test has hundreds of steps even for sample 1 (see its test for the count); a shorter tick keeps its Play watchable. */
export const HULL_TRACE_SLOW_STEP_INTERVAL_MS = 50;
/** The controller's documented step limit: far above the longest trace (1562 events for 40 points). */
const MAX_PLAYBACK_STEPS = 100000;

/** Sample 1 of the convexity lessons, in input order: the hull is (-1,3), (0,0), (4,0), (5,3), (2,5) for every algorithm. */
export const HULL_TRACE_SAMPLE_1: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0,
    points: [[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]].map(([x, y]) => ({x, y})),
};

export type HullTraceOverlayId = "trace" | "hull";

/** The saved configuration beyond the points: the algorithm and the step index. Playback status is never state. */
export interface HullTraceGraphState extends PointSetGraphState {
    algorithm: HullAlgorithm;
    step: number;
}

/**
 * A point-set graph that runs one of three convex hull algorithms on its points and steps through the trace (task 10,
 * spec convexity-hulls-lessons A4). The scene state keeps only the points, the algorithm and the step index; the drawn
 * state is always recomputed from the algorithm's `...StateAt`. Next step and every Play tick run the one `advance()`;
 * Play uses the shared `IterationController` (an injectable `AnimationScheduler`) and stops at `done`.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the trace, returns the step to 0 and pauses; so does a
 * change of the algorithm. A scene change, a figure capture and unmount pause playback; unmount disposes the controller
 * so no scheduler callback stays pending. `PointSetGraph` is reused unchanged except for its `overlayInputs()` hook: the
 * trace overlay depends on the step, which is not part of the model or of the shown set.
 */
export class HullTraceGraph extends PointSetGraph<HullTraceOverlayId> {
    private controller: IterationController;
    private controllerDisposed = false;
    private controllerInterval = HULL_TRACE_STEP_INTERVAL_MS;
    private advancing = false;
    private runMemo?: {points: PointSetModel["points"]; algorithm: HullAlgorithm; run: HullRun};
    private totalsMemo?: {points: PointSetModel["points"]; totals: Readonly<Record<HullAlgorithm, number>>};
    private inputsMemo?: {algorithm: HullAlgorithm; step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.controller = this.createController();
    }

    /** The playback tick of an algorithm: the slow edge test ticks faster, every other trace keeps the default. */
    private intervalFor(algorithm: HullAlgorithm): number {
        return algorithm === "slow-edge-test" ? HULL_TRACE_SLOW_STEP_INTERVAL_MS : HULL_TRACE_STEP_INTERVAL_MS;
    }

    /** The controller's interval is fixed at construction, so a paused controller of another tick is replaced before it runs. */
    private syncControllerInterval(): void {
        // A disposed (unmounted) controller stays disposed: mount() creates the next one with the current interval.
        if (this.controllerDisposed || this.controllerInterval === this.intervalFor(this.algorithm)) return;
        this.controller.dispose();
        this.controller = this.createController();
    }

    private createController(): IterationController {
        this.controllerInterval = this.intervalFor(this.algorithm);
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: this.controllerInterval,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get algorithm(): HullAlgorithm {
        return ("algorithm" in this.state ? parseHullAlgorithm(this.state.algorithm) : undefined) ?? DEFAULT_HULL_ALGORITHM;
    }

    /** The step index, clamped to the current trace (a stale stored index never leaves the trace). */
    get step(): number {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        return this.run().clamp(stored ?? 0);
    }

    get isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    /** The trace of the current points and algorithm; recomputed only when either changes. */
    run(): HullRun {
        const points = this.model.points;
        const algorithm = this.algorithm;
        if (this.runMemo?.points !== points || this.runMemo.algorithm !== algorithm) {
            this.runMemo = {points, algorithm, run: runHullTrace(algorithm, points)};
        }
        return this.runMemo.run;
    }

    private totals(): Readonly<Record<HullAlgorithm, number>> {
        const points = this.model.points;
        if (this.totalsMemo?.points !== points) this.totalsMemo = {points, totals: hullPredicateTotals(points)};
        return this.totalsMemo.totals;
    }

    override getInitialState(): HullTraceGraphState {
        return {...super.getInitialState(), overlays: {trace: true, hull: true}, algorithm: DEFAULT_HULL_ALGORITHM, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the hull fields; `Partial<HullTraceGraphState>` is the one place that types them for the base store. */
    private patch(fields: Partial<HullTraceGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /**
     * Every write of a new model (edit, drag, import, example) returns the step to 0 and pauses, unless the write names
     * the step itself. This is the one choke point of the base class's edits.
     */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const before = this.state.model;
        let namedStep = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            namedStep = "step" in raw;
            // A hull is computed on points: a polygon mode (restored or imported) is shown as points.
            const patch = raw.model && raw.model.mode !== "points" ? {...raw, model: setMode(raw.model, "points")} : raw;
            if (patch.model === undefined || patch.model === state.model || "step" in patch) return patch;
            return this.patch({...patch, step: 0});
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

    setAlgorithm(algorithm: HullAlgorithm): void {
        if (parseHullAlgorithm(algorithm) === undefined) return;
        this.controller.reset(0);
        this.setState(this.patch({algorithm, step: 0}));
        this.requestRender();
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
        this.syncControllerInterval();
        this.controller.pause();
        this.controller.nextStep();
        this.requestRender();
    }

    play(): void {
        if (this.exportBusy || this.atEnd) return;
        this.syncControllerInterval();
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
        return hullTracePresetCollection(this.overlayIds());
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(HULL_TRACE_SAMPLE_1);
    }

    /** The saved scene state, with the step clamped to the trace of the saved points. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: HullTraceGraphState = {...this.state, algorithm: this.algorithm, step: this.step};
        return state;
    }

    /** An imported model keeps the algorithm and step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = serializePointSetModel(data);
        const algorithm = this.algorithm;
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        const step = runHullTrace(algorithm, model.points).clamp(stored ?? 0);
        this.setState(this.patch({model, algorithm, step}));
        this.controller.reset(step);
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const algorithm = ("algorithm" in merged ? parseHullAlgorithm(merged.algorithm) : undefined) ?? DEFAULT_HULL_ALGORITHM;
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const state: HullTraceGraphState = {...merged, algorithm, step: runHullTrace(algorithm, merged.model.points).clamp(stored ?? 0)};
        return state;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return [...super.overlayIds(), "trace" as const, "hull" as const];
    }

    protected override overlayLabel(id: HullTraceOverlayId | "grid"): string {
        if (id === "trace") return t("hulltrace_overlay_trace");
        if (id === "hull") return t("hulltrace_overlay_hull");
        return super.overlayLabel(id);
    }

    /** The trace overlay follows the algorithm and the step, which are not part of the model. */
    protected override overlayInputs(): unknown {
        const algorithm = this.algorithm;
        const step = this.step;
        const memo = this.inputsMemo;
        if (memo?.algorithm === algorithm && memo.step === step) return memo;
        this.inputsMemo = {algorithm, step};
        return this.inputsMemo;
    }

    protected override drawOverlay(id: HullTraceOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const view = this.run().view(this.step);
        const at = (index: number) => gridToBoard(model.points[index], model.gridStepExponent);
        const polyline = (indices: readonly number[], attributes: Record<string, unknown>): JXG.GeometryElement => {
            const coordinates = indices.map(at);
            return this.board.create("curve", [coordinates.map(c => c.x), coordinates.map(c => c.y)], {
                highlight: false, fixed: true, ...attributes,
            }) as JXG.GeometryElement;
        };
        if (id === "trace") {
            return [
                ...view.accepted.map(path => polyline(path, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, layer: 4})),
                ...view.probes.map(pair => polyline(pair, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 3, dash: 2, layer: 4})),
            ];
        }
        const hull = view.hull;
        if (!hull || hull.length < 2) return [];
        if (hull.length === 2) return [polyline(hull, {strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 3, layer: 3})];
        const corners = hull.map(at);
        return [this.board.create("polygon", corners.map(c => [c.x, c.y]), {
            vertices: {visible: false}, highlight: false, fixed: true, layer: 3,
            fillColor: GraphPalette.controlPolygon, fillOpacity: 0.35,
            borders: {strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 3, highlight: false, fixed: true},
        }) as JXG.GeometryElement];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly hullActions: HullTraceControlActions = {
        setAlgorithm: algorithm => this.setAlgorithm(algorithm),
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.controller.isPlaying()) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        const run = this.run();
        const step = this.step;
        return <>
            <HullTraceControls algorithm={this.algorithm} step={step} length={run.length} playing={this.controller.isPlaying()}
                               event={run.event(step)} points={this.model.points} gridStepExponent={this.model.gridStepExponent}
                               totals={run.view(step).done ? this.totals() : undefined} actions={this.hullActions}/>
            {super.workspaceEdit()}
        </>;
    }
}
