import React from "react";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {gridToBoard, PointSetModel, PointSetOptions} from "../../compgeo/pointSetModel";
import {createTriangulation, type Triangulation, type TriangulationEdge} from "../../compgeo/triangulation";
import {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {CompgeoRegionPalette} from "./CompgeoRegionPalette";
import {DelaunayControlActions, DelaunayControls, DelaunaySelection, DelaunayStatus} from "./DelaunayControls";
import {DELAUNAY_EXAMPLES, delaunayCollection} from "./delaunayPresetCollection";
import {drawCircumcircle, drawSelectableTriangles, sameTriple, sortedTriple, type TriangleSelectionNames} from "./circumcircleDrawing";
import {angleSummary, DelaunayRun, edgeQuad, runDelaunay, triangleNeighbours} from "./delaunayRun";
import {parseHullStep} from "./hullTraceRun";
import {PointSetGraphState} from "./PointSetGraph";
import {TriangulationGraph, type TriangulationGraphState} from "./TriangulationGraph";
import {parseTriangleList} from "./triangulationPresetCollection";
import {matchingExample} from "./ExampleSelect";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {TracePlayback} from "../base/tracePlayback";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The chooser id of each example, as its place in `DELAUNAY_EXAMPLES`. */
const EXAMPLE_INDEX = {quad: 0, seven: 1, square: 2} as const;

/** Time between two playback steps (one step per interval, never more). */
export const DELAUNAY_STEP_INTERVAL_MS = 600;
/** The saved configuration beyond the triangulation: the trace step. Playback status is never state. */
export interface DelaunayGraphState extends PointSetGraphState {
    step: number;
}

const DELAUNAY_NAMES: TriangleSelectionNames = {
    triangle: "delaunay-triangle", selectedTriangle: "delaunay-selected-triangle", selectedCircle: "delaunay-selected-circle",
};

const runFor = (points: PointSetModel["points"], triangles: unknown): DelaunayRun => {
    const result = createTriangulation(points, parseTriangleList(triangles) ?? []);
    return runDelaunay(result.ok ? result.value : undefined);
};

/**
 * The triangulation graph with the Lawson flip trace (task 13, spec B3). The scene state keeps the points, the starting
 * triangle list (as `TriangulationGraph`) and the step index; the shown triangulation is `lawsonStateAt` of the trace of the
 * starting list, so `triangulation()` is the triangulation at the current step. Next step and every Play tick run the one
 * transition of `TracePlayback`. Any edit (point add, move or remove, manual flip, example) recomputes the
 * trace, returns to step 0 and pauses; a manual flip at a later step flips the triangulation shown and makes it the new start.
 *
 * Board: illegal edges are dashed and labelled (text, not colour only); at a `test` event the edge under test is highlighted
 * with its two triangles and the circumcircle of the triangle whose opposite vertex is tested, from the exact rational
 * circumcentre and radius, converted to doubles only for drawing.
 *
 * Triangle selection (task 13b): a board click on a triangle or the triangle list in the panel selects it; its circumcircle
 * is drawn dashed and the panel lists, across each interior edge, the neighbour's opposite vertex with the exact incircle
 * determinant (bigint text) and a sign word. Edges on the hull have no neighbour and are only counted. The selection is
 * transient (not in the scene state or Presets), kept as the sorted vertex triple, and cleared by any edit of the points or
 * the triangle list, by any change of the trace step, and when its triangle no longer exists. The solid circle of a trace
 * `test` event and the dashed selected circle may show together; they differ in dash, not only in position.
 */
export class DelaunayGraph extends TriangulationGraph {
    /** Playback policy: scheduling, advancement and end, reset and lifecycle (the step index stays in the scene store). */
    private playback: TracePlayback;
    private runMemo?: {start: Triangulation | undefined; run: DelaunayRun};
    private displayMemo?: {run: DelaunayRun; step: number; tri: Triangulation | undefined};
    private traceInputs?: {base: unknown; step: number; triangle: string};
    private selectedTriangleValue?: readonly [number, number, number];

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.playback = new TracePlayback({
            runLength: () => this.run().length,
            step: () => this.step,
            writeStep: step => this.setState(this.stepPatch({step})),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => DELAUNAY_STEP_INTERVAL_MS,
        }, scheduler);
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The trace of the starting triangulation; recomputed only when the starting list or the points change. */
    run(): DelaunayRun {
        const start = super.triangulation();
        const memo = this.runMemo;
        if (memo && memo.start === start) return memo.run;
        const run = runDelaunay(start);
        this.runMemo = {start, run};
        return run;
    }

    /** The step index, clamped to the current trace (a stale stored index never leaves the trace). */
    get step(): number {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        return this.run().clamp(stored ?? 0);
    }

    get isPlaying(): boolean {
        return this.playback.isPlaying;
    }

    /** The triangulation at the current step (the starting one at step 0), or undefined while the points allow none. */
    override triangulation(): Triangulation | undefined {
        const run = this.run();
        if (!run.start) return undefined;
        const step = this.step;
        if (this.displayMemo?.run !== run || this.displayMemo.step !== step) {
            this.displayMemo = {run, step, tri: run.state(step).triangulation ?? run.start};
        }
        return this.displayMemo.tri;
    }

    override getInitialState(): TriangulationGraphState & DelaunayGraphState {
        return {...super.getInitialState(), step: 0};
    }

    /** The default quad (x 0 to 5, y 0 to 3) and the circumcircle of abc (y up to about 5.4) with a margin, for projection. */
    protected override initialView(): [number, number, number, number] {
        return [-2, 6, 7, -1.5];
    }

    /** The index in the shown triangulation of the selected triangle, while it still exists. */
    selectedTriangle(): number | undefined {
        const tri = this.triangulation();
        const chosen = this.selectedTriangleValue;
        if (!tri || !chosen) return undefined;
        const index = tri.triangles.findIndex(corners => sameTriple(sortedTriple(corners), chosen));
        return index < 0 ? undefined : index;
    }

    /** Selects the triangle at `index` of `triangulation().triangles`, or clears the selection (undefined or out of range). */
    selectTriangle(index: number | undefined): void {
        const tri = this.triangulation();
        const corners = index === undefined ? undefined : tri?.triangles[index];
        this.selectedTriangleValue = corners ? sortedTriple(corners) : undefined;
        this.requestRender();
        this.syncScene();
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    private stepPatch(fields: Partial<PointSetGraphState> & {step?: number}): Partial<PointSetGraphState> {
        return fields;
    }

    /** Every write of a new model or triangle list returns the step to 0 and pauses, unless the write names the step itself. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const beforeModel = this.state.model;
        const beforeStep = this.playback ? this.step : 0;
        const beforeTriangles = "triangles" in this.state ? this.state.triangles : undefined;
        let namedStep = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            namedStep = "step" in raw;
            const edit = ("triangles" in raw) || (raw.model !== undefined && raw.model !== state.model);
            return edit && !namedStep ? this.stepPatch({...raw, step: 0}) : raw;
        };
        super.setState(wrapped, callback);
        // The playback does not exist yet while the base class is being constructed.
        if (!this.playback) return;
        const afterTriangles = "triangles" in this.state ? this.state.triangles : undefined;
        const edited = this.state.model !== beforeModel || afterTriangles !== beforeTriangles;
        if (edited || this.step !== beforeStep) this.selectedTriangleValue = undefined;
        this.playback.settle(edited, namedStep);
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

    /** Loads one of the three Presets (quad, seven points in T0, unit square) at step 0. */
    loadExample(index: 0 | 1 | 2): void {
        this.setState(this.stepPatch({step: 0}));
        this.importPresetData(DELAUNAY_EXAMPLES[index].data);
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------

    /**
     * Lesson actions: the `algorithm-trace` animation runs the very transitions of the buttons (`registerLessonActions`),
     * `set-trace-step` pauses playback and sets the step (a number is clamped like a stored Preset step, `'end'` is the last
     * step) and `select-triangle` is the board click on a triangle of the triangulation shown at the current step (`null`
     * clears; a non-integer or out-of-range index is a lesson-content error and changes nothing).
     *
     * The 15a operations act on the starting triangulation exactly as the panel does, so trace and drawing never disagree:
     * `set-triangulation` (and `set-points`) replace the start, recompute the trace, return to step 0 and pause; `flip-edge`
     * flips an edge of the triangulation shown at the current step and makes the result the new start (step 0, paused);
     * `select-edge` only selects. Selections are cleared by any step change or edit.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "set-trace-step") {
            this.setTraceStep(requestedTraceStep(action, this.run().length));
            return;
        }
        if (action.operation === "select-triangle") {
            const index: unknown = action.triangle;
            if (index === null) {
                this.selectTriangle(undefined);
                return;
            }
            const count = this.triangulation()?.triangles.length ?? 0;
            if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= count) {
                throw new Error(`point-set select-triangle: triangle must be null or an integer from 0 to ${String(count - 1)} (the triangles shown at this step), got ${String(index)}.`);
            }
            this.selectTriangle(index);
            return;
        }
        super.applyPointSetAction(action);
    }

    /** Shows the trace at `step` (clamped); the same write as a Preset restore. A named step resets the controller in `setState`, which pauses playback. */
    private setTraceStep(step: number): void {
        this.setState(this.stepPatch({step: this.run().clamp(step)}));
        this.requestRender();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registerTraceCommands(registry, this);
    }

    // ---- Lifecycle -----------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        // The label text on the board is a function of the current language; a switch only has to redraw it.
        let language = currentLanguage();
        const unsubscribe = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            if (this.hasBoard) this.board.fullUpdate();
        });
        session.registerCleanup(unsubscribe);
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
        this.selectedTriangleValue = undefined;
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        this.playback?.halt();
        this.selectedTriangleValue = undefined;
        super.syncReplacedScene();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return delaunayCollection;
    }

    override defaultPreset(): PointSetModel {
        return DELAUNAY_EXAMPLES[0].data;
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: DelaunayGraphState = {...super.sceneGraphState(), step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        super.importPresetData(data);
        this.setState(this.stepPatch({step: this.run().clamp(stored ?? 0)}));
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const run = runFor(merged.model.points, "triangles" in merged ? merged.triangles : undefined);
        const state: DelaunayGraphState = {...merged, step: run.clamp(stored ?? 0)};
        return state;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The drawing follows the step as well as the triangle list and the selected edge. */
    protected override overlayInputs(): unknown {
        const base = super.overlayInputs();
        const step = this.step;
        const triangle = String(this.selectedTriangle() ?? "");
        const memo = this.traceInputs;
        if (memo && memo.base === base && memo.step === step && memo.triangle === triangle) return memo;
        this.traceInputs = {base, step, triangle};
        return this.traceInputs;
    }

    protected override drawTriangulation(tri: Triangulation, selected: TriangulationEdge | undefined, model: PointSetModel): JXG.GeometryElement[] {
        const objects = super.drawTriangulation(tri, selected, model);
        const run = this.run();
        const step = this.step;
        const at = (index: number) => gridToBoard(tri.points[index], model.gridStepExponent);
        // Illegal edges: dashed over the thin edge, and a text label.
        for (const [a, b] of run.illegal(step)) {
            const from = at(a);
            const to = at(b);
            objects.push(this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name: "delaunay-illegal-edge", highlight: false, fixed: true, layer: 4,
                strokeColor: CompgeoRegionPalette.illegalEdge, strokeWidth: 2.8, dash: 3,
            }) as JXG.GeometryElement);
            objects.push(this.board.create("text", [(from.x + to.x) / 2, (from.y + to.y) / 2, () => t("del_illegal_label")], {
                name: "delaunay-illegal-label", fixed: true, highlight: false, anchorX: "left", anchorY: "bottom", layer: 5,
                fontSize: 12, strokeColor: CompgeoRegionPalette.illegalEdge,
            }) as JXG.GeometryElement);
        }
        const edge = run.state(step).testing?.edge;
        const quad = edge ? edgeQuad(tri, edge[0], edge[1]) : undefined;
        if (quad) {
            // The two triangles of the edge under test, the edge itself, and the circle of the triangle (a, b, c); d is tested.
            const triangle = (corners: readonly number[]) => this.board.create("polygon", corners.map(i => [at(i).x, at(i).y]), {
                name: "delaunay-test-triangle", vertices: {visible: false}, highlight: false, fixed: true, layer: 1,
                fillColor: CompgeoRegionPalette.illegalWash, fillOpacity: 0.8, borders: {visible: false, highlight: false, fixed: true},
            }) as JXG.GeometryElement;
            objects.push(triangle([quad.a, quad.b, quad.c]), triangle([quad.b, quad.a, quad.d]));
            const from = at(quad.a);
            const to = at(quad.b);
            objects.push(this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name: "delaunay-test-edge", highlight: false, fixed: true, layer: 5,
                strokeColor: CompgeoRegionPalette.illegalEdge, strokeWidth: 2.8,
            }) as JXG.GeometryElement);
            const circle = this.drawCircle(tri, [quad.a, quad.b, quad.c], model, "delaunay-circumcircle");
            if (circle) objects.push(circle);
        }
        return [...objects, ...this.drawExtras(tri, model)];
    }

    /** One polygon per triangle (clickable inside); the selected one is filled and outlined, with its dashed circumcircle. */
    protected drawExtras(tri: Triangulation, model: PointSetModel): JXG.GeometryElement[] {
        return drawSelectableTriangles(this.board, tri, model, this.selectedTriangle(), DELAUNAY_NAMES,
            index => this.afterBoardPress(() => this.selectTriangle(this.selectedTriangle() === index ? undefined : index)));
    }

    /** The circumcircle of the triangle `corners` (exact centre and radius, doubles for drawing only). */
    protected drawCircle(tri: Triangulation, corners: readonly [number, number, number], model: PointSetModel, name: string, dash = 0): JXG.GeometryElement | undefined {
        return drawCircumcircle(this.board, tri, corners, model, name, dash);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly delaunayActions: DelaunayControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.playback.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: id => this.loadExample(EXAMPLE_INDEX[id]),
        selectTriangle: index => this.selectTriangle(index),
    };

    private status(): DelaunayStatus | undefined {
        const run = this.run();
        if (!run.start || run.length === 0) return undefined;
        const step = this.step;
        const state = run.state(step);
        const info = run.event(step);
        const tri = state.triangulation ?? run.start;
        const now = angleSummary(tri);
        const first = angleSummary(run.start);
        const payload = state.testing;
        const test = payload?.edge && payload.apexes && payload.value !== undefined && payload.sign !== undefined
            ? {edge: payload.edge, apexes: payload.apexes, value: `${payload.value > 0n ? "+" : ""}${payload.value}`, sign: payload.sign}
            : undefined;
        const selectedIndex = this.selectedTriangle();
        const detailed = selectedIndex === undefined ? undefined : triangleNeighbours(tri, selectedIndex);
        const selection: DelaunaySelection | undefined = detailed && {
            corners: detailed.corners, hullCount: detailed.hullCount,
            neighbours: detailed.neighbours.map(n => ({edge: n.edge, vertex: n.vertex, value: `${n.value > 0n ? "+" : ""}${n.value}`, sign: n.sign})),
        };
        return {
            triangles: tri.triangles, selectedIndex, selection,
            step, length: run.length, note: info?.note ?? "phase-start", flips: state.flips, illegalCount: run.illegal(step).length, test,
            minNow: now.min, minStart: first.min, anglesNow: now.vector, anglesStart: first.vector,
            done: state.done ? {cocircular: run.cocircular} : undefined,
        };
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <DelaunayControls status={this.status()} playing={this.playback.isPlaying} exampleId={matchingExample(this.model, DELAUNAY_EXAMPLES.map(example => ({id: example.id, ...example.data})))} actions={this.delaunayActions}/>
            {super.workspaceEdit()}
        </>;
    }
}
