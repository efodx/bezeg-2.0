import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import {EAR_CLIPPING_MAX_VERTICES, guardView} from "../../compgeo/earClipping";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import type {LessonAction, LessonAnimationCommand} from "../../learning/model";
import {BaseGraphState} from "../base/BaseGraph";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {EarClippingControlActions, EarClippingControls} from "./EarClippingControls";
import {
    EAR_CLIPPING_EXAMPLE_1, EAR_CLIPPING_EXAMPLE_2, EAR_CLIPPING_OVERLAY_IDS, earClippingCollection,
} from "./earClippingPresetCollection";
import {diagonalsOf, EarRun, runEarClipping} from "./earClippingRun";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per interval, never more). */
export const EAR_CLIPPING_STEP_INTERVAL_MS = 600;
/** The controller's documented step limit, far above the longest trace (about n^2 events for 40 vertices). */
const MAX_PLAYBACK_STEPS = 100000;

export type EarClippingOverlayId = "trace" | "reflex" | "triangulation" | "colouring" | "guards";

/** The saved configuration beyond the polygon: the step index. Playback status is never state. */
export interface EarClippingGraphState extends PointSetGraphState {
    step: number;
}

/** The `algorithm-trace` commands the lessons may send; each runs the transition of the button of the same name. */
const EAR_LESSON_COMMANDS: readonly LessonAnimationCommand[] = ["next-step", "reset", "play", "pause", "replay"];

/** The colour letters: a cue that does not depend on colour vision. */
const COLOUR_LETTERS = ["A", "B", "C"] as const;
const COLOUR_FACES = ["o", "[]", "^"] as const;

/** The polygon the ear clipping graph works on: always a closed polygon, whatever mode a restored or imported model names. */
function asClosedPolygon(model: PointSetModel): PointSetModel {
    return model.mode === "polygon" && model.closed ? model : {...model, mode: "polygon", closed: true};
}

/**
 * A point-set graph in polygon mode that clips the ears of its polygon one at a time (task 07, spec B1). Shaped like
 * `HullTraceGraph`: the scene state keeps the polygon and the step index, the drawn state is recomputed from
 * `earClippingTrace` through `runEarClipping`; Next step and every Play tick run one `advance()` on the shared
 * `IterationController`. A model change (edit, import, drag) recomputes the trace, returns to step 0 and pauses.
 *
 * A clockwise polygon is reversed by the kernel for the trace; the stored model is never changed. A refused polygon
 * (fewer than three vertices, not simple, three collinear vertices) shows a message and draws no trace objects.
 * The triangulation, colouring and guard overlays need the finished trace and draw only at `done`. Board text is the
 * language-neutral letters A, B, C; the panel is the only localized text, so no board text needs a language listener.
 */
export class EarClippingGraph extends PointSetGraph<EarClippingOverlayId> {
    private controller: IterationController;
    private controllerDisposed = false;
    private advancing = false;
    private runMemo?: {points: PointSetModel["points"]; run: EarRun};
    private inputsMemo?: {step: number; selected: number | undefined};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({pointLimit: EAR_CLIPPING_MAX_VERTICES, ...options});
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: EAR_CLIPPING_STEP_INTERVAL_MS,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The step index, clamped to the current trace (a stale stored index never leaves the trace). */
    get step(): number {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        return this.run().clamp(stored ?? 0);
    }

    get isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    /** The trace of the current polygon; recomputed only when the points change. */
    run(): EarRun {
        const points = this.model.points;
        if (this.runMemo?.points !== points) this.runMemo = {points, run: runEarClipping(points)};
        return this.runMemo.run;
    }

    override getInitialState(): EarClippingGraphState {
        return {...super.getInitialState(), overlays: {trace: true, reflex: true}, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the step field; `Partial<EarClippingGraphState>` is the one place that types it for the base store. */
    private patch(fields: Partial<EarClippingGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /** Every write of a new model returns the step to 0 and pauses, unless the write names the step itself. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const before = this.state.model;
        let namedStep = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            namedStep = "step" in raw;
            const patch = raw.model ? {...raw, model: asClosedPolygon(raw.model)} : raw;
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
        const requested: unknown = action.step;
        if (requested !== "end" && (typeof requested !== "number" || !Number.isFinite(requested))) {
            throw new Error("point-set set-trace-step: step must be a finite number or \"end\".");
        }
        this.setTraceStep(requested === "end" ? this.run().length - 1 : requested);
    }

    /** Shows the trace at `step` (clamped); the same write as a Preset restore. A named step resets the controller in `setState`, which pauses playback. */
    private setTraceStep(step: number): void {
        this.setState(this.patch({step: this.run().clamp(step)}));
        this.requestRender();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated("animation", "algorithm-trace", action => this.lessonCommand(action.command), {
            supports: action => EAR_LESSON_COMMANDS.includes(action.command),
        });
    }

    private lessonCommand(command: LessonAnimationCommand): void {
        if (command === "next-step") this.nextStep();
        else if (command === "play") this.play();
        else if (command === "pause") this.pause();
        else if (command === "reset") this.resetTrace();
        else if (command === "replay") {
            this.resetTrace();
            this.play();
        }
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
        return earClippingCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(EAR_CLIPPING_EXAMPLE_1);
    }

    /** The default example (x 0 to 6, y 0 to 4) with a half-unit margin; the app default box would put its edge on the frame. */
    protected override initialView(): [number, number, number, number] {
        return [-0.5, 4.5, 6.5, -0.5];
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: EarClippingGraphState = {...this.state, step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = asClosedPolygon(serializePointSetModel(data));
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        const step = runEarClipping(model.points).clamp(stored ?? 0);
        this.setState(this.patch({model, step}));
        this.controller.reset(step);
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const model = asClosedPolygon(merged.model);
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const state: EarClippingGraphState = {...merged, model, step: runEarClipping(model.points).clamp(stored ?? 0)};
        return state;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return EAR_CLIPPING_OVERLAY_IDS;
    }

    protected override overlayLabel(id: EarClippingOverlayId | "grid"): string {
        switch (id) {
            case "trace": return t("earclip_overlay_trace");
            case "reflex": return t("earclip_overlay_reflex");
            case "triangulation": return t("earclip_overlay_triangulation");
            case "colouring": return t("earclip_overlay_colouring");
            case "guards": return t("earclip_overlay_guards");
            default: return super.overlayLabel(id);
        }
    }

    /** The trace overlay follows the step and the guard view follows the selected vertex; neither is part of the model. */
    protected override overlayInputs(): unknown {
        const step = this.step;
        const selected = this.selectedIndex;
        const memo = this.inputsMemo;
        if (memo?.step === step && memo.selected === selected) return memo;
        this.inputsMemo = {step, selected};
        return this.inputsMemo;
    }

    /** The guard whose view is shaded: the selected vertex when it is a guard, otherwise the first guard. */
    guardShown(): number | undefined {
        const guards = this.run().guards.vertices;
        const selected = this.selectedIndex;
        return selected !== undefined && guards.includes(selected) ? selected : guards[0];
    }

    protected override drawOverlay(id: EarClippingOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const run = this.run();
        if (run.refusal !== undefined || run.length === 0) return [];
        const state = run.state(this.step);
        const at = (index: number) => gridToBoard(model.points[index], model.gridStepExponent);
        const triangle = (tri: readonly number[], attributes: Record<string, unknown>, borders: Record<string, unknown>): JXG.GeometryElement => {
            const corners = tri.map(at);
            return this.board.create("polygon", corners.map(c => [c.x, c.y]), {
                vertices: {visible: false}, highlight: false, fixed: true, ...attributes,
                borders: {highlight: false, fixed: true, ...borders},
            }) as JXG.GeometryElement;
        };
        const marker = (index: number, attributes: Record<string, unknown>): JXG.GeometryElement => {
            const c = at(index);
            return this.board.create("point", [c.x, c.y], {
                name: "earclip-marker", withLabel: false, highlight: false, fixed: true, showInfobox: false, ...attributes,
            }) as JXG.GeometryElement;
        };
        switch (id) {
            case "trace": {
                const objects = state.triangles.map(tri => triangle(tri, {
                    layer: 2, fillColor: GraphPalette.primaryCurve, fillOpacity: 0.25,
                }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 2}));
                const candidate = state.candidate;
                if (candidate && candidate.points.length === 3) {
                    objects.push(triangle(candidate.points, {
                        layer: 4, fillColor: GraphPalette.constructionAccent, fillOpacity: candidate.ear ? 0.4 : 0.08,
                    }, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 3, dash: candidate.ear ? 0 : 2}));
                    if (typeof candidate.rejected === "number") {
                        objects.push(marker(candidate.rejected, {
                            layer: 6, face: "x", size: 7, strokeColor: GraphPalette.warningText, strokeWidth: 3,
                        }));
                    }
                }
                return objects;
            }
            case "reflex":
                return run.reflex.map(i => marker(i, {
                    layer: 6, face: "diamond", size: 8, fillColor: GraphPalette.warningText, strokeColor: GraphPalette.pointOutline, strokeWidth: 1,
                }));
            case "triangulation": {
                if (!state.done) return [];
                const triangles = run.triangles.map(tri => triangle(tri, {
                    layer: 1, fillColor: GraphPalette.controlPolygon, fillOpacity: 0.2,
                }, {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1}));
                const diagonals = diagonalsOf(run.triangles, model.points.length).map(([a, b]) => {
                    const from = at(a);
                    const to = at(b);
                    return this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                        highlight: false, fixed: true, strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 2, dash: 2, layer: 3,
                    }) as JXG.GeometryElement;
                });
                return [...triangles, ...diagonals];
            }
            case "colouring": {
                if (!state.done) return [];
                return run.colours.flatMap((colour, i) => {
                    const c = at(i);
                    return [
                        marker(i, {
                            layer: 6, face: COLOUR_FACES[colour], size: 7, fillColor: GraphPalette.constructionLevels[colour + 1],
                            strokeColor: GraphPalette.selectedControlPointOutline, strokeWidth: 2,
                        }),
                        this.board.create("text", [c.x, c.y, COLOUR_LETTERS[colour]], {
                            name: COLOUR_LETTERS[colour], anchorX: "right", anchorY: "top", fixed: true, highlight: false, display: "internal",
                            fontSize: 14, strokeColor: GraphPalette.label, layer: 6,
                        }) as JXG.GeometryElement,
                    ];
                });
            }
            case "guards": {
                if (!state.done) return [];
                const shown = this.guardShown();
                const view = shown === undefined ? [] : guardView(run.triangles, shown).map(tri => triangle(tri, {
                    layer: 2, fillColor: GraphPalette.comparisonCurve, fillOpacity: 0.3,
                }, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1}));
                const stars = run.guards.vertices.map(i => marker(i, {
                    layer: 5, face: "circle", size: i === shown ? 13 : 11, fillOpacity: 0, highlightFillOpacity: 0,
                    strokeColor: GraphPalette.comparisonCurve, strokeWidth: i === shown ? 4 : 3,
                }));
                return [...view, ...stars];
            }
        }
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly earActions: EarClippingControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.controller.isPlaying()) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: index => this.loadModel(index === 1 ? EAR_CLIPPING_EXAMPLE_1 : EAR_CLIPPING_EXAMPLE_2),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        const run = this.run();
        const step = this.step;
        const state = run.state(step);
        return <>
            <EarClippingControls refusal={run.refusal} reversed={run.reversed} step={step} length={run.length} playing={this.controller.isPlaying()}
                                 event={run.event(step)} trianglesSoFar={state.triangles.length}
                                 summary={state.done ? run.summary : undefined} actions={this.earActions}/>
            {super.workspaceEdit()}
        </>;
    }
}
