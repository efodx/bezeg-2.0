import type {StoredGraphState} from "../base/presets/Presets";
import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {gridToBoard, intervalRow, intervalsOf, PointSetModel, PointSetOptions, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_INTERVALS} from "../../compgeo/sweep/limits";
import type {Interval} from "../../compgeo/sweep/intervalSweep";
import type {LessonAction} from "../../learning/model";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {TracePlayback} from "../base/tracePlayback";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {IntervalSweepControlActions, IntervalSweepControls, IntervalSweepLists} from "./IntervalSweepControls";
import {runIntervalSweep, IntervalRun} from "./intervalSweepRun";
import {INTERVAL_SWEEP_EXAMPLE_1, INTERVAL_SWEEP_OVERLAY_IDS, intervalSweepCollection} from "./intervalSweepPresetCollection";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per interval, never more). */
export const INTERVAL_SWEEP_STEP_INTERVAL_MS = 400;

export type IntervalSweepOverlayId = "sweep";

/** The saved configuration beyond the intervals: the step index. Playback status is never state. */
export interface IntervalSweepGraphState extends PointSetGraphState {
    step: number;
}

/**
 * A point-set graph in intervals mode that sweeps a vertical line over the intervals and steps through the trace of
 * `intervalSweepTrace` (task 08, spec sweep-algorithms-lessons C1). Shaped like `HullTraceGraph`: the scene state keeps only the
 * intervals and the step index; the drawn state is always recomputed from the trace. Next step and every Play tick go through the
 * shared `TracePlayback` (its injectable `AnimationScheduler` drives Play), which stops at the last step.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the trace, returns the step to 0 and pauses. A scene change,
 * a figure capture and unmount pause playback; unmount disposes the controller. A refused input (`checkIntervals`) gives an empty
 * run, a message in the panel and no trace objects. The intervals mode has no toggle: the graph only works on intervals.
 * The side lists (event queue, status) are rendered by `sideLists()`; hovering or focusing a status entry highlights its interval.
 */
export class IntervalSweepGraph extends PointSetGraph<IntervalSweepOverlayId> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; run: IntervalRun};
    private inputsMemo?: {step: number; hovered: number | undefined};
    /** The interval whose status entry is hovered or focused; highlighted on the board. Never saved. */
    private hovered: number | undefined;
    /** The run and step `hovered` was set at; a hover is dropped when either changes (step, Reset, points, preset restore). */
    private hoveredAt?: {run: IntervalRun; step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({coordinateLimit: SWEEP_COORD_LIMIT, intervalLimit: SWEEP_MAX_INTERVALS, ...options});
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => INTERVAL_SWEEP_STEP_INTERVAL_MS,
        }, scheduler);
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The step index, clamped to the current trace (a stale stored index never leaves the trace). */
    get step(): number {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        return this.run().clamp(stored ?? 0);
    }

    get isPlaying(): boolean {
        return this.playback.isPlaying;
    }

    /** The intervals handed to the trace; a subclass may override it (tests do, to reach refusals the model prevents). */
    protected intervalsForTrace(): readonly Interval[] {
        return intervalsOf(this.model);
    }

    /** The trace of the current intervals; recomputed only when the points change. */
    run(): IntervalRun {
        const points = this.model.points;
        if (this.runMemo?.points !== points) this.runMemo = {points, run: runIntervalSweep(this.intervalsForTrace())};
        return this.runMemo.run;
    }

    override getInitialState(): IntervalSweepGraphState {
        return {...super.getInitialState(), overlays: {sweep: true}, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the sweep fields; `Partial<IntervalSweepGraphState>` is the one place that types them for the base store. */
    private patch(fields: Partial<IntervalSweepGraphState>): Partial<PointSetGraphState> {
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
            // The sweep works on intervals: a model of another mode (restored or loaded) is shown as intervals.
            const patch = raw.model && raw.model.mode !== "intervals" ? {...raw, model: setMode(raw.model, "intervals")} : raw;
            if (patch.model === undefined || patch.model === state.model || "step" in patch) return patch;
            return this.patch({...patch, step: 0});
        };
        super.setState(wrapped, callback);
        // The playback does not exist yet while the base class is being constructed.
        this.playback?.settle(this.state.model !== before, namedStep);
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
     * Lesson actions: the `algorithm-trace` animation runs the very transitions of the buttons, and `point-set`
     * `set-trace-step` is handled here only (the base class throws `UnsupportedLessonActionError` for it). It pauses
     * playback and sets the step: a number is clamped to the trace like a stored Preset step, `'end'` is the last step.
     * Every edit action (`set-points`) pauses and returns to step 0; `set-overlay` is a display change and keeps the step.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation !== "set-trace-step") {
            super.applyPointSetAction(action);
            return;
        }
        this.setTraceStep(requestedTraceStep(action, this.run().length));
    }

    /** Shows the trace at `step` (clamped); the same write as a Preset restore. A named step resets the controller in `setState`, which pauses playback. */
    private setTraceStep(step: number): void {
        this.setState(this.patch({step: this.run().clamp(step)}));
        this.requestRender();
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
        this.hovered = undefined;
        this.hoveredAt = undefined;
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
        return intervalSweepCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(INTERVAL_SWEEP_EXAMPLE_1);
    }

    /** The default example (x 0 to 10, rows y 1 to 5) with a unit margin; the app default box would put its edge on the frame. */
    protected override initialView(): [number, number, number, number] {
        return [-1, 6, 11, 0];
    }

    /** The saved scene state, with the step clamped to the trace of the saved intervals. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: IntervalSweepGraphState = {...this.state, step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = serializePointSetModel(data);
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        const step = runIntervalSweep(intervalsOf(model)).clamp(stored ?? 0);
        this.setState(this.patch({model, step}));
        this.playback.restoreTo(step);
    }

    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const state: IntervalSweepGraphState = {...merged, step: runIntervalSweep(intervalsOf(merged.model)).clamp(stored ?? 0)};
        return state;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return INTERVAL_SWEEP_OVERLAY_IDS;
    }

    protected override overlayLabel(id: IntervalSweepOverlayId | "grid"): string {
        if (id === "sweep") return t("intervalsweep_overlay_sweep");
        return super.overlayLabel(id);
    }

    /** The sweep overlay follows the step, which is not part of the model. */
    protected override overlayInputs(): unknown {
        const step = this.step;
        const hovered = this.liveHovered();
        if (this.inputsMemo?.step === step && this.inputsMemo.hovered === hovered) return this.inputsMemo;
        this.inputsMemo = {step, hovered};
        return this.inputsMemo;
    }

    protected override drawOverlay(id: IntervalSweepOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const run = this.run();
        if (run.refusal || run.length === 0) return [];
        const view = run.view(this.step);
        if (view.x === null) return [];
        const exponent = model.gridStepExponent;
        const at = (x: number, k: number) => gridToBoard({x, y: intervalRow(k)}, exponent);
        const curve = (name: string, from: {x: number; y: number}, to: {x: number; y: number}, attributes: Record<string, unknown>) =>
            this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name, withLabel: false, highlight: false, fixed: true, ...attributes,
            }) as JXG.GeometryElement;
        const objects: JXG.GeometryElement[] = [];
        // The sweep line spans the rows of all intervals.
        const bottom = gridToBoard({x: view.x, y: 0}, exponent);
        const top = gridToBoard({x: view.x, y: run.intervals.length + 1}, exponent);
        objects.push(curve("sweep-line", bottom, top, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, layer: 3}));
        // Every open interval is active in the sweep status; resting intervals remain on the base layer.
        for (const k of view.open) {
            const {lo, hi} = run.intervals[k];
            const emphasised = k === view.current;
            objects.push(curve(emphasised ? "sweep-current" : "sweep-open", at(lo, k), at(hi, k), {
                strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 3, layer: 5,
            }));
        }
        // Draw hover/focus last so it remains a single blue stroke over any status cue.
        const hovered = this.liveHovered();
        if (hovered !== undefined && run.view(this.step).open.includes(hovered)) {
            const {lo, hi} = run.intervals[hovered];
            objects.push(curve("sweep-hover", at(lo, hovered), at(hi, hovered), {
                strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 4, layer: 5,
            }));
        }
        // The current interval that is not in the status (just popped, or just removed) is emphasised and dashed.
        const current = view.current;
        if (current !== undefined && !view.open.includes(current)) {
            const {lo, hi} = run.intervals[current];
            objects.push(curve("sweep-current-idle", at(lo, current), at(hi, current), {
                strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 3, dash: 2, layer: 5,
            }));
        }
        // A reported pair is marked on both intervals at the sweep line and joined by a dashed link.
        if (view.pair) {
            const [p, q] = view.pair;
            objects.push(curve("sweep-pair-link", at(view.x, p), at(view.x, q), {
                strokeColor: GraphPalette.comparisonCurve, strokeWidth: 3, dash: 2, layer: 5,
            }));
            for (const k of view.pair) {
                const where = at(view.x, k);
                objects.push(this.board.create("point", [where.x, where.y], {
                    name: "sweep-pair-mark", withLabel: false, face: "diamond", size: 7, fixed: true, highlight: false,
                    strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve, layer: 6,
                }) as JXG.GeometryElement);
            }
        }
        return objects;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly sweepActions: IntervalSweepControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.playback.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    protected override allowsIntervals(): boolean {
        return true;
    }

    /** The hovered interval, or undefined (and forgotten) once the run or step changed since the hover. */
    private liveHovered(): number | undefined {
        if (this.hovered !== undefined && (this.hoveredAt?.run !== this.run() || this.hoveredAt.step !== this.step)) {
            this.hovered = undefined;
            this.hoveredAt = undefined;
        }
        return this.hovered;
    }

    private hover = (interval: number | undefined) => {
        if (this.liveHovered() === interval) return;
        this.hovered = interval;
        this.hoveredAt = interval === undefined ? undefined : {run: this.run(), step: this.step};
        // The highlight is not scene state: redraw the overlays directly, then the panel.
        this.syncScene();
        this.requestRender();
    };

    /** The event queue and the status (task 08 item 3): panel content rendered below the readouts. */
    protected sideLists(): React.ReactNode {
        return <IntervalSweepLists run={this.run()} step={this.step} scale={2 ** this.model.gridStepExponent}
                                   hovered={this.liveHovered()} onHover={this.hover}/>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <IntervalSweepControls run={this.run()} step={this.step} playing={this.playback.isPlaying}
                                   scale={2 ** this.model.gridStepExponent} actions={this.sweepActions}>
                {this.sideLists()}
            </IntervalSweepControls>
            {super.workspaceEdit()}
        </>;
    }
}
