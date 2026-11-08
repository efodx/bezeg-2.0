import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {PointSetModel, PointSetOptions, segmentsOf, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import {Rational} from "../../compgeo/rational";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from "../../compgeo/sweep/limits";
import type {Segment} from "../../compgeo/sweep/segments";
import {BaseGraphState} from "../base/BaseGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {BentleyOttmannControlActions, BentleyOttmannControls, BentleyOttmannLists} from "./BentleyOttmannControls";
import {BentleyOttmannRun, runBentleyOttmann} from "./bentleyOttmannRun";
import {BENTLEY_OTTMANN_EXAMPLE_1, BENTLEY_OTTMANN_OVERLAY_IDS, bentleyOttmannCollection} from "./bentleyOttmannPresetCollection";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {TracePlayback} from "./tracePlayback";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per trace event, never more). */
export const BENTLEY_OTTMANN_STEP_INTERVAL_MS = 400;
export type BentleyOttmannOverlayId = "sweep";

/** The saved configuration beyond the segments: the step index. Playback status is never state. */
export interface BentleyOttmannGraphState extends PointSetGraphState {
    step: number;
}

/**
 * A point-set graph in segments mode that sweeps a horizontal line downward over the segments and steps through the trace of
 * `bentleyOttmannTrace` (task 09, spec sweep-algorithms-lessons C2). Shaped like `IntervalSweepGraph`: the scene state keeps
 * only the segments and the step index; the drawn state is always recomputed from the trace. Next step and every Play tick run
 * the one `advance()`; Play uses the shared `IterationController` (an injectable `AnimationScheduler`) and stops at `done`.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the trace, returns the step to 0 and pauses. A scene change,
 * a figure capture and unmount pause playback; unmount disposes the controller. A refused input (too many segments, a
 * coordinate the sweep cannot take, a collinear overlap) gives an empty run, a message in the panel and no trace objects. The
 * graph has no mode toggle: it only works on segments. Rational positions are drawn at their double value only.
 * `sideLists()` renders the event queue and status lists; hovering or focusing a status entry highlights its segment.
 */
export class BentleyOttmannGraph extends PointSetGraph<BentleyOttmannOverlayId> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; run: BentleyOttmannRun};
    private inputsMemo?: {step: number; hovered: number | undefined};
    /** The segment whose status entry is hovered or focused; highlighted on the board. Never saved. */
    protected hovered: number | undefined;
    /** The run and step `hovered` was set at; a hover is dropped when either changes (step, Reset, points, preset restore). */
    private hoveredAt?: {run: BentleyOttmannRun; step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({coordinateLimit: SWEEP_COORD_LIMIT, segmentLimit: SWEEP_MAX_SEGMENTS, ...options});
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => BENTLEY_OTTMANN_STEP_INTERVAL_MS,
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

    /** The segments handed to the trace; a subclass may override it (tests do, to reach refusals the model prevents). */
    protected segmentsForTrace(): readonly Segment[] {
        return segmentsOf(this.model);
    }

    /** The trace of the current segments; recomputed only when the points change. */
    run(): BentleyOttmannRun {
        const points = this.model.points;
        if (this.runMemo?.points !== points) this.runMemo = {points, run: runBentleyOttmann(this.segmentsForTrace())};
        return this.runMemo.run;
    }

    override getInitialState(): BentleyOttmannGraphState {
        return {...super.getInitialState(), overlays: {sweep: true}, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the sweep fields; `Partial<BentleyOttmannGraphState>` is the one place that types them for the base store. */
    private patch(fields: Partial<BentleyOttmannGraphState>): Partial<PointSetGraphState> {
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
            // The sweep works on segments: a model of another mode (restored or loaded) is shown as segments.
            const patch = raw.model && raw.model.mode !== "segments" ? {...raw, model: setMode(raw.model, "segments")} : raw;
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
     * Every edit action (`set-points`, segments mode) pauses and returns to step 0; `set-overlay` keeps the step.
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
        return bentleyOttmannCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(BENTLEY_OTTMANN_EXAMPLE_1);
    }

    /** The default example (x 0 to 6, y -1 to 5) with a half-unit margin; the app default box would put its edge on the frame. */
    protected override initialView(): [number, number, number, number] {
        return [-0.5, 5.5, 6.5, -1.5];
    }

    /** The saved scene state, with the step clamped to the trace of the saved segments. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: BentleyOttmannGraphState = {...this.state, step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = serializePointSetModel(data);
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        const step = runBentleyOttmann(segmentsOf(model)).clamp(stored ?? 0);
        this.setState(this.patch({model, step}));
        this.playback.restoreTo(step);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const state: BentleyOttmannGraphState = {...merged, step: runBentleyOttmann(segmentsOf(merged.model)).clamp(stored ?? 0)};
        return state;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return BENTLEY_OTTMANN_OVERLAY_IDS;
    }

    protected override overlayLabel(id: BentleyOttmannOverlayId | "grid"): string {
        if (id === "sweep") return t("bentleyottmann_overlay_sweep");
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

    protected override drawOverlay(id: BentleyOttmannOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const run = this.run();
        if (run.refusal || run.length === 0) return [];
        const view = run.view(this.step);
        if (view.position === null) return [];
        const scale = 2 ** model.gridStepExponent;
        const sweepY = view.position.y.toNumber() * scale;
        const sweepX = view.position.x.toNumber() * scale;
        const segments = run.segments;
        const curve = (name: string, xs: number[], ys: number[], attributes: Record<string, unknown>) =>
            this.board.create("curve", [xs, ys], {name, withLabel: false, highlight: false, fixed: true, ...attributes}) as JXG.GeometryElement;
        const along = (name: string, k: number, attributes: Record<string, unknown>) => {
            const {a, b} = segments[k];
            return curve(name, [a.x * scale, b.x * scale], [a.y * scale, b.y * scale], attributes);
        };
        const mark = (name: string, x: number, y: number, attributes: Record<string, unknown>) =>
            this.board.create("point", [x, y], {
                name, withLabel: false, fixed: true, highlight: false, ...attributes,
            }) as JXG.GeometryElement;
        const objects: JXG.GeometryElement[] = [];
        // The sweep line spans all segments, a unit beyond them; the event point sits on it.
        const xs = segments.flatMap(s => [s.a.x, s.b.x]).map(x => x * scale);
        const margin = scale;
        objects.push(curve("sweep-line", [Math.min(...xs) - margin, Math.max(...xs) + margin], [sweepY, sweepY], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, layer: 3,
        }));
        objects.push(mark("sweep-event", sweepX, sweepY, {
            face: "o", size: 6, strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 1.5, fillColor: GraphPalette.constructionAccent, layer: 7,
        }));
        // Status segments retain the resting sage weight; current-event segments use the active construction.
        const current = new Set([...view.current.starts, ...view.current.ends, ...view.current.passes]);
        for (const k of view.status) {
            const emphasised = current.has(k);
            objects.push(along(emphasised ? "sweep-current" : "sweep-open", k, {
                strokeColor: emphasised ? ACTIVE_CONSTRUCTION_COLOR : GraphPalette.primaryCurve,
                strokeWidth: emphasised ? 3 : 2, layer: 5,
            }));
        }
        // A segment of the current event that is not in the status (just popped, or just removed) is emphasised and dashed.
        for (const k of current) {
            if (view.status.includes(k)) continue;
            objects.push(along("sweep-current-idle", k, {strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 3, dash: 2, layer: 5}));
        }
        // Draw hover/focus last so it remains a single blue stroke over any status cue.
        const hovered = this.liveHovered();
        if (hovered !== undefined && view.status.includes(hovered)) {
            objects.push(along("sweep-hover", hovered, {strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 4, layer: 5}));
        }
        // The neighbour test shown while it is the current step: both segments marked where they meet the sweep line, joined by a dashed link.
        if (view.test) {
            const at = view.test.pair.map(k => this.xAt(segments[k], view.position!.y, view.position!.x) * scale);
            objects.push(curve("sweep-test-link", at, [sweepY, sweepY], {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 3, dash: 2, layer: 5}));
            for (const x of at) {
                objects.push(mark("sweep-test-mark", x, sweepY, {
                    face: "diamond", size: 7, strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve, layer: 6,
                }));
            }
        }
        // Reported intersection points, at their double value.
        for (const report of view.reports) {
            objects.push(mark("sweep-crossing", report.point.x.toNumber() * scale, report.point.y.toNumber() * scale, {
                face: "cross", size: 6, strokeColor: GraphPalette.selectedControlPointOutline, fillColor: GraphPalette.selectedControlPointOutline, layer: 6,
            }));
        }
        return objects;
    }

    /**
     * The x (grid units, double, for drawing only) of segment `s` on the horizontal line at `y`; a horizontal segment lies on
     * the line, so the sweep position `x0` (clamped to its extent) stands for it.
     */
    private xAt(s: Segment, y: Rational, x0: Rational): number {
        const dy = s.b.y - s.a.y;
        if (dy === 0) return Math.min(Math.max(x0.toNumber(), Math.min(s.a.x, s.b.x)), Math.max(s.a.x, s.b.x));
        return Rational.fromInt(s.a.x).add(y.sub(Rational.fromInt(s.a.y)).mul(Rational.of(s.b.x - s.a.x, dy))).toNumber();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly sweepActions: BentleyOttmannControlActions = {
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

    protected override allowsSegments(): boolean {
        return true;
    }

    /** The hovered segment, or undefined (and forgotten) once the run or step changed since the hover. */
    protected liveHovered(): number | undefined {
        if (this.hovered !== undefined && (this.hoveredAt?.run !== this.run() || this.hoveredAt.step !== this.step)) {
            this.hovered = undefined;
            this.hoveredAt = undefined;
        }
        return this.hovered;
    }

    /** Hover or focus of a status entry (for the side lists): highlights the segment on the board. */
    protected hover = (segment: number | undefined) => {
        if (this.liveHovered() === segment) return;
        this.hovered = segment;
        this.hoveredAt = segment === undefined ? undefined : {run: this.run(), step: this.step};
        // The highlight is not scene state: redraw the overlays directly, then the panel.
        this.syncScene();
        this.requestRender();
    };

    /** The event queue and the status (task 09 item 3): panel content rendered below the readouts. */
    protected sideLists(): React.ReactNode {
        return <BentleyOttmannLists run={this.run()} step={this.step} exponent={this.model.gridStepExponent}
                                    hovered={this.liveHovered()} onHover={this.hover}/>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <BentleyOttmannControls run={this.run()} step={this.step} playing={this.playback.isPlaying}
                                    exponent={this.model.gridStepExponent} actions={this.sweepActions}>
                {this.sideLists()}
            </BentleyOttmannControls>
            {super.workspaceEdit()}
        </>;
    }
}
