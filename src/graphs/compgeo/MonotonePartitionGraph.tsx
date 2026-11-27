import React from "react";
import {currentLanguage, message, onLanguageChange, t, type Message} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ReadoutNote} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {monotonePartitionNotes, type MonotonePartitionNoteId} from "./monotonePartitionNotes";
import {AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import type {GridPoint} from "../../compgeo/grid";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_MAX_POLYGON_VERTICES} from "../../compgeo/sweep/limits";
import type {VertexType} from "../../compgeo/sweep/monotonePartition";
import {GraphSession} from "../base/GraphSession";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
import {asClosedPolygon} from "./EarClippingGraph";
import {PointSetStepDeclaration} from "./pointSetPersistence";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {MonotonePartitionControlActions, MonotonePartitionControls, MonotonePartitionLists, vertexTypeText} from "./MonotonePartitionControls";
import {
    MONOTONE_PARTITION_EXAMPLE_1, MONOTONE_PARTITION_EXAMPLE_2, MONOTONE_PARTITION_OVERLAY_IDS, monotonePartitionCollection,
} from "./monotonePartitionPresetCollection";
import {PartitionRun, runMonotonePartition, vertexName} from "./monotonePartitionRun";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {matchingExample} from "./ExampleSelect";
import {TracePlayback} from "../base/tracePlayback";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per trace event, never more). */
export const MONOTONE_PARTITION_STEP_INTERVAL_MS = 500;
export type MonotonePartitionOverlayId = "sweep";

/** The ids of this graph's declaration (frames name them): the readout sentences, the legend, the switches and the playback. */
export type MonotonePartitionIds = {
    param: never; row: never; note: MonotonePartitionNoteId;
    legend: "points" | "sweep" | "status" | "diagonal" | "pieces" | "types";
    section: "display" | "playback";
    action: "grid" | MonotonePartitionOverlayId | "next-step" | "play" | "reset";
};

/** The saved configuration beyond the polygon: the step index. Playback status is never state. */
export interface MonotonePartitionGraphState extends PointSetGraphState {
    step: number;
}

/** Marker shape per vertex type, so the type is never carried by colour alone. */
const TYPE_FACES: Record<VertexType, string> = {start: "^", end: "v", split: "diamond", merge: "[]", regular: "o"};
const TYPE_COLOURS: Record<VertexType, string> = {
    start: GraphPalette.constructionLevels[4], end: GraphPalette.constructionLevels[2], split: GraphPalette.warningText,
    merge: GraphPalette.constructionLevels[3], regular: GraphPalette.referenceCurve,
};
/** Fills of the finished pieces, cycled. */
const PIECE_FILLS = [
    GraphPalette.constructionLevels[1], GraphPalette.constructionLevels[2], GraphPalette.constructionLevels[4],
    GraphPalette.constructionLevels[3], GraphPalette.constructionLevels[5],
];

/**
 * A point-set graph in closed-polygon mode that sweeps a horizontal line downward over its polygon and steps through
 * the trace of `monotonePartitionTrace` (task 16, spec sweep-algorithms-lessons C3). Shaped like `EarClippingGraph` and
 * `BentleyOttmannGraph`: the scene state keeps the polygon and the step index; the drawn state is recomputed from the
 * trace. Next step and every Play tick run the one transition of `TracePlayback`.
 *
 * Any change of the model (an edit, an import, a drag) recomputes the trace, returns the step to 0 and pauses. A scene
 * change, a figure capture and unmount pause playback; unmount disposes the controller. A refused polygon gives an
 * empty run, a message in the panel and no trace objects. A clockwise polygon is reversed by the kernel; the stored
 * model never changes. Board labels are functions of the current language and redrawn on a language switch.
 */
export class MonotonePartitionGraph extends PointSetGraph<MonotonePartitionOverlayId> {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {points: PointSetModel["points"]; run: PartitionRun};
    private inputsMemo?: {step: number};

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({pointLimit: SWEEP_MAX_POLYGON_VERTICES, ...options});
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.patch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => MONOTONE_PARTITION_STEP_INTERVAL_MS,
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

    /** The vertices handed to the trace; a subclass may override it (tests do, to reach refusals the model prevents). */
    protected verticesForTrace(): readonly GridPoint[] {
        return this.model.points;
    }

    /** The trace of the current polygon; recomputed only when the points change. */
    run(): PartitionRun {
        const points = this.model.points;
        if (this.runMemo?.points !== points) this.runMemo = {points, run: this.buildRun(this.verticesForTrace())};
        return this.runMemo.run;
    }

    /** The run of a polygon; the triangulation graph (task 17) replaces it with its longer run. */
    protected buildRun(vertices: readonly GridPoint[]): PartitionRun {
        return runMonotonePartition(vertices);
    }

    override getInitialState(): MonotonePartitionGraphState {
        return {...super.getInitialState(), overlays: {sweep: true}, step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the step field; `Partial<MonotonePartitionGraphState>` is the one place that types it for the base store. */
    private patch(fields: Partial<MonotonePartitionGraphState>): Partial<PointSetGraphState> {
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
     * `set-trace-step` is handled here only. It pauses playback and sets the step (clamped; `'end'` is the last step).
     * Every edit action pauses and returns to step 0; `set-overlay` keeps the step.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation !== "set-trace-step") {
            super.applyPointSetAction(action);
            return;
        }
        this.setTraceStep(requestedTraceStep(action, this.run().length));
    }

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

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        // The type labels on the board are functions of the current language; a switch only has to redraw them.
        let language = currentLanguage();
        const unsubscribe = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            if (this.hasBoard) this.board.fullUpdate();
        });
        session.registerCleanup(unsubscribe);
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
        return monotonePartitionCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(MONOTONE_PARTITION_EXAMPLE_1);
    }

    /** The default example (x 0 to 12, y 0 to 8) with a margin on every side, room for the sweep line above it. */
    protected override initialView(): [number, number, number, number] {
        return [-1.5, 10, 13.5, -1.5];
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: MonotonePartitionGraphState = {...this.state, step: this.step};
        return state;
    }

    /** The declared step of the persisted scene (task 08): the trace length of the data decides the clamp. */
    private readonly stepDeclaration: PointSetStepDeclaration = {
        normalise: asClosedPolygon,
        clamp: (model, step) => this.buildRun(model.points).clamp(step),
    };

    protected override persistenceStep(): PointSetStepDeclaration {
        return this.stepDeclaration;
    }

    /** The imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace (the declaration); playback is paused. */
    override importPresetData(data: PointSetModel): void {
        super.importPresetData(data);
        this.playback.restoreTo(this.step);
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return MONOTONE_PARTITION_OVERLAY_IDS;
    }

    protected override overlayLabel(id: MonotonePartitionOverlayId | "grid"): string {
        if (id === "sweep") return t("monotonepartition_overlay_sweep");
        return super.overlayLabel(id);
    }

    /** The sweep overlay follows the step, which is not part of the model. */
    protected override overlayInputs(): unknown {
        const step = this.step;
        if (this.inputsMemo?.step === step) return this.inputsMemo;
        this.inputsMemo = {step};
        return this.inputsMemo;
    }

    protected override drawOverlay(id: MonotonePartitionOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const run = this.run();
        if (run.refusal !== undefined || run.length === 0) return [];
        const view = run.view(this.step);
        const at = (index: number) => gridToBoard(model.points[index], model.gridStepExponent);
        const scale = 2 ** model.gridStepExponent;
        const curve = (name: string, xs: number[], ys: number[], attributes: Record<string, unknown>) =>
            this.board.create("curve", [xs, ys], {name, withLabel: false, highlight: false, fixed: true, ...attributes}) as JXG.GeometryElement;
        const marker = (name: string, index: number, attributes: Record<string, unknown>) => {
            const c = at(index);
            return this.board.create("point", [c.x, c.y], {
                name, withLabel: false, highlight: false, fixed: true, showInfobox: false, ...attributes,
            }) as JXG.GeometryElement;
        };
        const objects: JXG.GeometryElement[] = [];
        // Finished: the pieces, each with its own fill, an outline and its number (language-neutral).
        if (view.done) {
            run.pieces.forEach((piece, k) => {
                const corners = piece.map(at);
                const fill = PIECE_FILLS[k % PIECE_FILLS.length];
                objects.push(this.board.create("polygon", corners.map(c => [c.x, c.y]), {
                    name: "monotone-piece", vertices: {visible: false}, highlight: false, fixed: true, layer: 2,
                    fillColor: fill, fillOpacity: 0.4, borders: {highlight: false, fixed: true, strokeColor: fill, strokeWidth: 3},
                }) as JXG.GeometryElement);
                const cx = corners.reduce((sum, c) => sum + c.x, 0) / corners.length;
                const cy = corners.reduce((sum, c) => sum + c.y, 0) / corners.length;
                objects.push(this.board.create("text", [cx, cy, String(k + 1)], {
                    name: "monotone-piece-number", fixed: true, highlight: false, display: "internal", fontSize: 16,
                    strokeColor: GraphPalette.selectedControlPointOutline, layer: 6,
                }) as JXG.GeometryElement);
            });
        }
        // The sweep line: above the polygon at step 0, then through the current vertex; it spans the polygon a unit beyond it.
        const xs = model.points.map(p => p.x * scale);
        const ys = model.points.map(p => p.y * scale);
        const lineY = view.vertex === null ? Math.max(...ys) + scale : at(view.vertex).y;
        objects.push(curve("monotone-sweep-line", [Math.min(...xs) - scale, Math.max(...xs) + scale], [lineY, lineY], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, layer: 3,
        }));
        // Status edges sit over the base polygon edges; current edges use the active blue.
        for (const edge of view.status) {
            const [from, to] = run.edgeEnds(edge).map(at);
            const emphasised = view.current.has(edge);
            objects.push(curve(emphasised ? "monotone-status-current" : "monotone-status", [from.x, to.x], [from.y, to.y], {
                strokeColor: emphasised ? ACTIVE_CONSTRUCTION_COLOR : GraphPalette.primaryCurve,
                strokeWidth: emphasised ? 3 : 2, layer: 5,
            }));
        }
        // Diagonals as they are reported.
        for (const [a, b] of view.diagonals) {
            objects.push(curve("monotone-diagonal", [at(a).x, at(b).x], [at(a).y, at(b).y], {
                strokeColor: GraphPalette.warningText, strokeWidth: 3, dash: 2, layer: 5,
            }));
        }
        // Every processed vertex: a marker whose shape and colour follow its type, and a text label.
        for (const v of view.processed) {
            const type = run.types[v];
            const c = at(v);
            objects.push(marker("monotone-type-marker", v, {
                face: TYPE_FACES[type], size: 7, fillColor: TYPE_COLOURS[type], strokeColor: GraphPalette.selectedControlPointOutline,
                strokeWidth: 1, layer: 6,
            }));
            objects.push(this.board.create("text", [c.x, c.y, () => `${vertexName(v)} ${vertexTypeText(t, type)}`], {
                name: "monotone-type-label", anchorX: "left", anchorY: "bottom", fixed: true, highlight: false, display: "internal",
                fontSize: 14, strokeColor: GraphPalette.label, layer: 6,
            }) as JXG.GeometryElement);
        }
        // The current vertex: a ring around its marker.
        if (view.vertex !== null) {
            objects.push(marker("monotone-current", view.vertex, {
                face: "circle", size: 8, fillOpacity: 0, highlightFillOpacity: 0, strokeColor: ACTIVE_CONSTRUCTION_COLOR,
                strokeWidth: 1.5, layer: 7,
            }));
        }
        return objects;
    }

    // ---- Declaration (task 08): marks, legend and switches from the point-set base, the readout sentences as notes -----------

    /** Whether this class declares its workspace; the triangulation graph (a later session) inherits the class and says no until it is converted. */
    protected declaresPartitionWorkspace(): boolean { return true; }

    protected override declaresPointSetWorkspace() { return this.declaresPartitionWorkspace(); }

    protected override overlayMessage(id: MonotonePartitionOverlayId | "grid"): Message {
        return id === "sweep" ? message("monotonepartition_overlay_sweep") : super.overlayMessage(id);
    }

    // The sweep line is the only overlay and a display switch in Orodja (the lessons set it by scene action); its name is longer than a puck label.
    protected override overlaySwatch(id: MonotonePartitionOverlayId | "grid") {
        return id === "sweep" ? {kind: "line" as const, color: GraphPalette.constructionAccent} : undefined;
    }

    protected override pointSetNotes(): readonly ReadoutNote<MonotonePartitionIds>[] {
        return monotonePartitionNotes(this.run(), this.step);
    }

    /** What the sweep draws at this step beyond the overlay switch: status edges, diagonals, the finished pieces and the type markers. */
    private partitionDrawn(): {status: boolean; diagonals: boolean; pieces: boolean; types: boolean} {
        const run = this.run();
        if (!this.hasBoard || run.refusal !== undefined || run.length === 0) return {status: false, diagonals: false, pieces: false, types: false};
        const view = run.view(this.step);
        return {status: view.status.length > 0, diagonals: view.diagonals.length > 0, pieces: view.done, types: view.processed.length > 0};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.partitionDrawn();
        switch (id) {
            case "status": return {color: GraphPalette.primaryCurve, visible: drawn.status};
            case "diagonal": return {color: GraphPalette.warningText, visible: drawn.diagonals};
            case "pieces": return {color: PIECE_FILLS[0], visible: drawn.pieces};
            case "types": return {color: TYPE_COLOURS.split, visible: drawn.types};
            default: return super.drawnObject(id);
        }
    }

    protected override declaration(): GraphDeclaration<MonotonePartitionIds> | undefined {
        const common = super.declaration() as GraphDeclaration<MonotonePartitionIds> | undefined;
        if (!common) return undefined;
        const run = this.run();
        const traced = run.refusal === undefined && run.length > 0;
        const legend: LegendEntry<MonotonePartitionIds>[] = [
            ...(common.legend ?? []),
            {id: "status", label: message("monotonepartition_legend_status"), kind: "line", object: "status"},
            {id: "diagonal", label: message("monotonepartition_legend_diagonal"), kind: "dashed", object: "diagonal"},
            {id: "pieces", label: message("monotonepartition_legend_pieces"), kind: "area", object: "pieces"},
            {id: "types", label: message("monotonepartition_legend_types"), kind: "point", object: "types"},
        ];
        const playback = {placement: "tools" as const, section: "playback"};
        const actions: ActionDeclaration<MonotonePartitionIds>[] = [
            ...(common.actions ?? []),
            {id: "next-step", label: message("next_step"), enabled: traced && this.step < run.length - 1 && !this.isPlaying, ...playback},
            {id: "play", label: message("play"), enabled: traced, pressed: this.isPlaying, ...playback},
            {id: "reset", label: message("reset"), enabled: this.step > 0 || this.isPlaying, ...playback},
        ];
        return {...common, legend, actions};
    }

    override performAction(id: string): void {
        if (id === "next-step") { runAs("learner", () => { this.nextStep(); }); return; }
        if (id === "play") { runAs("learner", () => { if (this.isPlaying) this.pause(); else this.play(); }); return; }
        if (id === "reset") { runAs("learner", () => { this.resetTrace(); }); return; }
        super.performAction(id);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly sweepActions: MonotonePartitionControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.playback.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: id => this.loadModel(id === "example-1" ? MONOTONE_PARTITION_EXAMPLE_1 : MONOTONE_PARTITION_EXAMPLE_2),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    /** The event queue and the status (item 3): panel content rendered below the readouts. */
    protected sideLists(): React.ReactNode {
        return <MonotonePartitionLists run={this.run()} step={this.step}/>;
    }

    /** The playback controls, readouts and side lists; the triangulation graph (task 17) replaces them. */
    protected sweepControls(): React.ReactNode {
        return <MonotonePartitionControls run={this.run()} step={this.step} playing={this.playback.isPlaying} actions={this.sweepActions}
            exampleId={matchingExample(this.model, [{id: "example-1", ...MONOTONE_PARTITION_EXAMPLE_1}, {id: "example-2", ...MONOTONE_PARTITION_EXAMPLE_2}])}>
            {this.sideLists()}
        </MonotonePartitionControls>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.sweepControls()}
            {super.workspaceEdit()}
        </>;
    }
}
