import type {StoredGraphState} from "../base/presets/Presets";
import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {EAR_CLIPPING_MAX_VERTICES, guardView} from "../../compgeo/earClipping";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import type {LessonAction} from "../../learning/model";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {matchingExample} from "./ExampleSelect";
import {TracePlayback} from "../base/tracePlayback";
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
export type EarClippingOverlayId = "trace" | "reflex" | "triangulation" | "colouring" | "guards";

/** The saved configuration beyond the polygon: the step index. Playback status is never state. */
export interface EarClippingGraphState extends PointSetGraphState {
    step: number;
}


/** The colour letters: a cue that does not depend on colour vision. */
const COLOUR_LETTERS = ["A", "B", "C"] as const;
const COLOUR_FACES = ["o", "[]", "^"] as const;

/** Quiet region washes leave the tested ear, rejection marks and finished diagonals distinct. */
const EAR_REGION_COLORS = {
    clippedFill: "#d9eee4",
    clippedBoundary: "#54806e",
    candidateFill: "#fae8c8",
    candidateBoundary: "#b47b35",
    triangulationFill: "#e8eff3",
    triangulationBoundary: "#8aa0ab",
} as const;

/** The polygon the ear clipping graph works on: always a closed polygon, whatever mode a restored or imported model names. */
export function asClosedPolygon(model: PointSetModel): PointSetModel {
    return model.mode === "polygon" && model.closed ? model : {...model, mode: "polygon", closed: true};
}

/**
 * A point-set graph in polygon mode that clips the ears of its polygon one at a time (task 07, spec B1). Shaped like
 * `HullTraceGraph`: the scene state keeps the polygon and the step index, the drawn state is recomputed from
 * `earClippingTrace` through `runEarClipping`; Next step and every Play tick run the one transition of
 * `TracePlayback`. A model change (edit, import, drag) recomputes the trace, returns to step 0 and pauses.
 *
 * A clockwise polygon is reversed by the kernel for the trace; the stored model is never changed. A refused polygon
 * (fewer than three vertices, not simple, three collinear vertices) shows a message and draws no trace objects.
 * The triangulation, colouring and guard overlays need the finished trace and draw only at `done`. Board text is the
 * language-neutral letters A, B, C; the panel is the only localized text, so no board text needs a language listener.
 */
export class EarClippingGraph extends PointSetGraph<EarClippingOverlayId> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; run: EarRun};
    private inputsMemo?: {step: number; selected: number | undefined};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({pointLimit: EAR_CLIPPING_MAX_VERTICES, ...options});
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => EAR_CLIPPING_STEP_INTERVAL_MS,
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
        this.playback.restoreTo(step);
    }

    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): PointSetGraphState {
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
                    layer: 2, fillColor: EAR_REGION_COLORS.clippedFill, fillOpacity: 0.82,
                }, {strokeColor: EAR_REGION_COLORS.clippedBoundary, strokeWidth: 2}));
                const candidate = state.candidate;
                if (candidate && candidate.points.length === 3) {
                    objects.push(triangle(candidate.points, {
                        layer: 4, fillColor: EAR_REGION_COLORS.candidateFill, fillOpacity: candidate.ear ? 0.86 : 0.24,
                    }, {strokeColor: EAR_REGION_COLORS.candidateBoundary, strokeWidth: 3, dash: candidate.ear ? 0 : 2}));
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
                    layer: 1, fillColor: EAR_REGION_COLORS.triangulationFill, fillOpacity: 0.8,
                }, {strokeColor: EAR_REGION_COLORS.triangulationBoundary, strokeWidth: 1}));
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
        playPause: () => { if (this.playback.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: id => this.loadModel(id === "example-1" ? EAR_CLIPPING_EXAMPLE_1 : EAR_CLIPPING_EXAMPLE_2),
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
            <EarClippingControls refusal={run.refusal} reversed={run.reversed} step={step} length={run.length} playing={this.playback.isPlaying}
                                 event={run.event(step)} trianglesSoFar={state.triangles.length}
                                 summary={state.done ? run.summary : undefined}
                                 exampleId={matchingExample(this.model, [{id: "example-1", ...EAR_CLIPPING_EXAMPLE_1}, {id: "example-2", ...EAR_CLIPPING_EXAMPLE_2}])}
                                 actions={this.earActions}/>
            {super.workspaceEdit()}
        </>;
    }
}
