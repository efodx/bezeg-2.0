import {AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAction} from "../../learning/model";
import {PointSetModel, PointSetOptions} from "../../compgeo/pointSetModel";
import {clampTraceIndex} from "../../compgeo/trace";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {SceneStateUpdate} from "../base/SceneStore";
import {parseBezierHullsStep} from "./bezierHullsPresetCollection";
import {CurvePairGraph} from "./CurvePairGraph";
import {PointSetGraphState} from "./PointSetGraph";
import {PointSetExtension, PointSetExtraField, PointSetExtras} from "./pointSetPersistence";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {TracePlayback} from "../base/tracePlayback";

/** Time between two playback steps (one step per interval, never more), as in the hull trace. */
export const TRACE_STEP_INTERVAL_MS = 400;

/** The saved configuration beyond the points: the step index. Playback status is never state. */
export interface TraceCurvePairGraphState extends PointSetGraphState {
    step: number;
}

export interface TraceControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

/**
 * A curve pair stepped through a precomputed run (advanced Bezier AB-B-1, lifted from the convexity `BezierHullsGraph`): the
 * step state, playback, Preset step handling and disposal that the Bezier hulls and Bezier clipping graphs share. `Run` is the
 * subclass's trace. The scene state keeps only the points, the step index and whatever settings the subclass adds; the drawn
 * state is always a fold of the run. Next step and every Play tick go through the shared
 * `TracePlayback` (its injectable `AnimationScheduler` drives Play), which stops at the last step.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the run, returns the step to 0 and pauses. A scene change, a
 * figure capture and unmount pause playback; unmount disposes the controller so no scheduler callback stays pending. Overlays
 * follow the step, which is not part of the model, through `overlayInputs()`.
 *
 * A subclass implements `computeRun`. When the run depends on more than the points, it also overrides `runSettingsKey`, which
 * keeps the memo and the overlay inputs correct, and writes those settings together with a `step`, which resets the controller.
 *
 * Reads: `step`, `run()`, `isPlaying`; actions `nextStep()`, `play()`, `pause()`, `resetTrace()`.
 */
export abstract class TraceCurvePairGraph<Extra extends string, Run extends readonly unknown[]> extends CurvePairGraph<Extra> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; settings: unknown; run: Run};
    private inputsMemo?: {step: number; settings: unknown};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => TRACE_STEP_INTERVAL_MS,
        }, scheduler);
    }

    // ---- Run -----------------------------------------------------------------------------------------------------

    /** The run of `model` under the settings of `state`. Pure; called only when the points or `runSettingsKey` change. */
    protected abstract computeRun(model: PointSetModel, state: PointSetGraphState): Run;

    /** A value that changes exactly when the settings of `state` that `computeRun` reads change. A run of the points alone has none. */
    protected runSettingsKey(_state: PointSetGraphState): unknown {
        return undefined;
    }

    /** The run of `points` under the settings of `state`; recomputed only when either changes. */
    protected runFor(points: PointSetModel["points"], state: PointSetGraphState = this.state): Run {
        const settings = this.runSettingsKey(state);
        if (this.runMemo?.points !== points || this.runMemo.settings !== settings) {
            this.runMemo = {points, settings, run: this.computeRun({...this.model, points}, state)};
        }
        return this.runMemo.run;
    }

    run(): Run {
        return this.runFor(this.model.points);
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The step index, clamped to the current run (a stale stored index never leaves it). */
    get step(): number {
        const stored = "step" in this.state ? parseBezierHullsStep(this.state.step) : undefined;
        return Math.min(stored ?? 0, this.run().length - 1);
    }

    get isPlaying(): boolean {
        return this.playback.isPlaying;
    }

    override getInitialState(): TraceCurvePairGraphState {
        return {...super.getInitialState(), step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the step; `Partial<TraceCurvePairGraphState>` is the one place that types it for the base store. */
    protected patch(fields: Partial<TraceCurvePairGraphState>): Partial<PointSetGraphState> {
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
     * Lesson actions: the `algorithm-trace` animation runs the very transitions of the buttons (`registerLessonActions`);
     * `set-trace-step` pauses playback and shows the step (a number is clamped like a stored Preset step, `'end'` is the last
     * step), the write a Preset restore makes. `set-points` (inherited) replaces the curve pair, returns to step 0 and pauses;
     * it places points on the whole-number grid only, so a half-unit pair is given as its doubled-grid twin (same counts).
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "set-trace-step") {
            const run = this.run();
            this.setState(this.patch({step: clampTraceIndex(run, requestedTraceStep(action, run.length))}));
            this.requestRender();
            return;
        }
        super.applyPointSetAction(action);
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

    /** The saved scene state, with the step clamped to the run of the saved points. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: TraceCurvePairGraphState = {...this.state, step: this.step};
        return state;
    }

    private extensionMemo?: PointSetExtension;

    /** The persisted fields beyond the step that the run depends on (the clipping tolerance); the step is clamped under them. */
    protected settingFields(): readonly PointSetExtraField[] {
        return [];
    }

    /**
     * The declared scene beyond the point set: the step (a nonnegative whole number, clamped to the run of the data under the
     * settings) and the subclass's setting fields. An omitted step or setting is 0 or its default, never the preceding scene's
     * (a Preset that names none shows the default).
     */
    protected override persistenceExtension(): PointSetExtension {
        if (!this.extensionMemo) {
            this.extensionMemo = Object.freeze({
                fields: [{name: "step", parse: parseBezierHullsStep, fallback: 0}, ...this.settingFields()],
                settle: (model: PointSetModel, values: PointSetExtras): PointSetExtras => {
                    const stored = typeof values.step === "number" ? values.step : 0;
                    // The run depends on the settings in `values` alone, not on the live scene.
                    const run = this.computeRun(model, {...this.getInitialState(), ...values});
                    return {...values, step: Math.min(stored, run.length - 1)};
                },
            });
        }
        return this.extensionMemo;
    }

    /** An imported model keeps the step and settings that the Preset's `graphState` just set (the declaration), clamped to the new run; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        super.importPresetData(data);
        this.playback.restoreTo(this.step);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected readonly traceActions: TraceControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
    };

    // ---- Overlays ------------------------------------------------------------------------------------------------

    /** The overlays follow the step and the run settings, which are not part of the model or of the shown set. */
    protected override overlayInputs(): unknown {
        const step = this.step;
        const settings = this.runSettingsKey(this.state);
        if (this.inputsMemo?.step === step && this.inputsMemo.settings === settings) return this.inputsMemo;
        this.inputsMemo = {step, settings};
        return this.inputsMemo;
    }
}
