import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {registerTraceCommands} from "./traceLessonActions";
import {TracePlayback} from "../base/tracePlayback";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {finiteNumberField, PointSetExtension, PointSetExtraField, PointSetExtras} from "./pointSetPersistence";
import {HullTraceControlActions, HullTraceControls} from "./HullTraceControls";
import {HULL_TRACE_OVERLAY_IDS, hullTraceCollection} from "./compgeoPresetCollections";
import {
    DEFAULT_HULL_ALGORITHM, HullAlgorithm, hullPredicateTotals, HullRun, parseHullAlgorithm, parseHullStep, runHullTrace,
} from "./hullTraceRun";

/** Time between two playback steps (one step per interval, never more). */
export const HULL_TRACE_STEP_INTERVAL_MS = 400;
/** The slow edge test has hundreds of steps even for sample 1 (see its test for the count); a shorter tick keeps its Play watchable. */
export const HULL_TRACE_SLOW_STEP_INTERVAL_MS = 50;

/** Sample 1 of the convexity lessons, in input order: the hull is (-1,3), (0,0), (4,0), (5,3), (2,5) for every algorithm. */
export const HULL_TRACE_SAMPLE_1: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0,
    points: [[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]].map(([x, y]) => ({x, y})),
};

export type HullTraceOverlayId = "trace" | "hull";

/** The persisted `algorithm`: one of the three ids, the default when omitted. */
export const HULL_ALGORITHM_FIELD: PointSetExtraField = {name: "algorithm", fallback: DEFAULT_HULL_ALGORITHM, parse: parseHullAlgorithm};
/** The persisted `step`: any finite number (the declaration clamps it to the trace), 0 when omitted. */
export const HULL_STEP_FIELD: PointSetExtraField = finiteNumberField("step", 0);

/**
 * The hull trace's declared scene beyond the point set: the algorithm and the step into its trace. A hull is computed on
 * points, so a polygon mode is shown as points; the step is clamped to the run of those points under the algorithm.
 */
const HULL_TRACE_EXTENSION: PointSetExtension = Object.freeze({
    normalise: (model: PointSetModel) => setMode(model, "points"),
    fields: [HULL_ALGORITHM_FIELD, HULL_STEP_FIELD],
    settle(model: PointSetModel, values: PointSetExtras): PointSetExtras {
        const algorithm = parseHullAlgorithm(values.algorithm) ?? DEFAULT_HULL_ALGORITHM;
        const step = typeof values.step === "number" ? values.step : 0;
        return {...values, algorithm, step: runHullTrace(algorithm, model.points).clamp(step)};
    },
});

/** The saved configuration beyond the points: the algorithm and the step index. Playback status is never state. */
export interface HullTraceGraphState extends PointSetGraphState {
    algorithm: HullAlgorithm;
    step: number;
}

/**
 * A point-set graph that runs one of three convex hull algorithms on its points and steps through the trace (task 10,
 * spec convexity-hulls-lessons A4). The scene state keeps only the points, the algorithm and the step index; the drawn
 * state is always recomputed from the algorithm's `...StateAt`. Next step and every Play tick go through the shared
 * `TracePlayback` (its injectable `AnimationScheduler` drives Play), which stops at the last step.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the trace, returns the step to 0 and pauses; so does a
 * change of the algorithm. A scene change, a figure capture and unmount pause playback; unmount disposes the controller
 * so no scheduler callback stays pending. `PointSetGraph` is reused unchanged except for its `overlayInputs()` hook: the
 * trace overlay depends on the step, which is not part of the model or of the shown set.
 */
export class HullTraceGraph extends PointSetGraph<HullTraceOverlayId> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; algorithm: HullAlgorithm; run: HullRun};
    private totalsMemo?: {points: PointSetModel["points"]; totals: Readonly<Record<HullAlgorithm, number>>};
    private inputsMemo?: {algorithm: HullAlgorithm; step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => this.intervalFor(this.algorithm),
        }, scheduler);
    }

    /** The playback tick of an algorithm: the slow edge test ticks faster, every other trace keeps the default. */
    private intervalFor(algorithm: HullAlgorithm): number {
        return algorithm === "slow-edge-test" ? HULL_TRACE_SLOW_STEP_INTERVAL_MS : HULL_TRACE_STEP_INTERVAL_MS;
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
        return this.playback.isPlaying;
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
        // The playback does not exist yet while the base class is being constructed.
        this.playback?.settle(this.state.model !== before, namedStep);
    }

    setAlgorithm(algorithm: HullAlgorithm): void {
        if (parseHullAlgorithm(algorithm) === undefined) return;
        this.playback.stop();
        this.setState(this.patch({algorithm, step: 0}));
        this.requestRender();
    }

    // ---- Playback ------------------------------------------------------------------------------------------------

    nextStep(): void {
        this.playback.nextStep();
    }

    play(): void {
        this.playback.play();
    }

    pause(): void {
        this.playback.pause();
    }

    /** Back to step 0; playback stops. */
    resetTrace(): void {
        this.playback.resetTrace();
    }

    /**
     * Lesson actions: the `algorithm-trace` animation (`next-step`, `reset`, `play`, `pause`, `replay`) runs the very
     * transitions of the buttons, and `point-set` `set-algorithm` is handled here only (the base class throws
     * `UnsupportedLessonActionError` for it). Every edit action (`set-points`, `set-algorithm`) pauses and returns to
     * step 0; `set-overlay` is a display change and keeps the step.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation !== "set-algorithm") {
            super.applyPointSetAction(action);
            return;
        }
        const algorithm = parseHullAlgorithm(action.algorithm);
        if (algorithm === undefined) throw new Error("point-set set-algorithm: algorithm must be one of the hull algorithms.");
        this.setAlgorithm(algorithm);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registerTraceCommands(registry, this);
    }

    override mount(container: HTMLElement): void {
        this.playback.mount();
        super.mount(container);
    }

    override unmount(): void {
        this.playback.unmount();
        super.unmount();
    }

    protected override stopLessonAnimations(): void {
        this.pause();
    }

    protected override beforeFigureCapture(): void {
        this.pause();
    }

    protected override disposeFigureScene(): void {
        this.playback?.halt();
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        this.playback?.halt();
        super.syncReplacedScene();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return hullTraceCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(HULL_TRACE_SAMPLE_1);
    }

    /** The default example (x -1 to 5, y 0 to 5) with a half-unit margin; the app default box would put its top point on the frame. */
    protected override initialView(): [number, number, number, number] {
        return [-1.5, 5.5, 5.5, -0.5];
    }

    /** The saved scene state, with the step clamped to the trace of the saved points. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: HullTraceGraphState = {...this.state, algorithm: this.algorithm, step: this.step};
        return state;
    }

    protected override persistenceExtension(): PointSetExtension {
        return HULL_TRACE_EXTENSION;
    }

    /** An imported model keeps the algorithm and step that the Preset's `graphState` just set (the declaration), clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        super.importPresetData(data);
        this.playback.restoreTo(this.step);
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return HULL_TRACE_OVERLAY_IDS;
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

    protected readonly hullActions: HullTraceControlActions = {
        setAlgorithm: algorithm => this.setAlgorithm(algorithm),
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.playback.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    /** The playback controls and status; a derived graph (task 19) overrides it to add its own choices around them. */
    protected hullControls(): React.ReactNode {
        const run = this.run();
        const step = this.step;
        return <HullTraceControls algorithm={this.algorithm} step={step} length={run.length} playing={this.playback.isPlaying}
                                  event={run.event(step)} points={this.model.points} gridStepExponent={this.model.gridStepExponent}
                                  totals={run.view(step).done ? this.totals() : undefined} actions={this.hullActions}/>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.hullControls()}
            {super.workspaceEdit()}
        </>;
    }
}
