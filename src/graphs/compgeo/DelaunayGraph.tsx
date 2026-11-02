import React from "react";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import {gridToBoard, PointSetModel, PointSetOptions} from "../../compgeo/pointSetModel";
import {createTriangulation, type Triangulation, type TriangulationEdge} from "../../compgeo/triangulation";
import {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {DelaunayControlActions, DelaunayControls, DelaunaySelection, DelaunayStatus} from "./DelaunayControls";
import {DELAUNAY_EXAMPLES, delaunayCollection} from "./delaunayPresetCollection";
import {angleSummary, circumcircle, DelaunayRun, edgeQuad, runDelaunay, triangleNeighbours} from "./delaunayRun";
import {parseHullStep} from "./hullTraceRun";
import {PointSetGraphState} from "./PointSetGraph";
import {TriangulationGraph, type TriangulationGraphState} from "./TriangulationGraph";
import {parseTriangleList} from "./triangulationPresetCollection";

/** Time between two playback steps (one step per interval, never more). */
export const DELAUNAY_STEP_INTERVAL_MS = 600;
/** The controller's documented step limit, far above the longest trace. */
const MAX_PLAYBACK_STEPS = 100000;

/** The saved configuration beyond the triangulation: the trace step. Playback status is never state. */
export interface DelaunayGraphState extends PointSetGraphState {
    step: number;
}

const runFor = (points: PointSetModel["points"], triangles: unknown): DelaunayRun => {
    const result = createTriangulation(points, parseTriangleList(triangles) ?? []);
    return runDelaunay(result.ok ? result.value : undefined);
};

/**
 * The triangulation graph with the Lawson flip trace (task 13, spec B3). The scene state keeps the points, the starting
 * triangle list (as `TriangulationGraph`) and the step index; the shown triangulation is `lawsonStateAt` of the trace of the
 * starting list, so `triangulation()` is the triangulation at the current step. Next step and every Play tick run one
 * `advance()` on the shared `IterationController`. Any edit (point add, move or remove, manual flip, example) recomputes the
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
    private controller: IterationController;
    private controllerDisposed = false;
    private advancing = false;
    private runMemo?: {start: Triangulation | undefined; run: DelaunayRun};
    private displayMemo?: {run: DelaunayRun; step: number; tri: Triangulation | undefined};
    private traceInputs?: {base: unknown; step: number; triangle: string};
    private selectedTriangleValue?: readonly [number, number, number];

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super(options);
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: DELAUNAY_STEP_INTERVAL_MS,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
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
        return this.controller.isPlaying();
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
        const beforeStep = this.controller ? this.step : 0;
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
        // The controller does not exist yet while the base class is being constructed.
        if (!this.controller) return;
        const afterTriangles = "triangles" in this.state ? this.state.triangles : undefined;
        if (this.state.model !== beforeModel || afterTriangles !== beforeTriangles || this.step !== beforeStep) this.selectedTriangleValue = undefined;
        if (this.state.model !== beforeModel || afterTriangles !== beforeTriangles) {
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
            this.setState(this.stepPatch({step: next}));
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
        this.setState(this.stepPatch({step: 0}));
        this.requestRender();
    }

    /** Loads one of the three Presets (quad, seven points in T0, unit square) at step 0. */
    loadExample(index: 0 | 1 | 2): void {
        this.setState(this.stepPatch({step: 0}));
        this.importPresetData(DELAUNAY_EXAMPLES[index].data);
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
        this.selectedTriangleValue = undefined;
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        if (this.controller) this.controller.pause();
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
                strokeColor: GraphPalette.warningText, strokeWidth: 3.5, dash: 3,
            }) as JXG.GeometryElement);
            objects.push(this.board.create("text", [(from.x + to.x) / 2, (from.y + to.y) / 2, () => t("del_illegal_label")], {
                name: "delaunay-illegal-label", fixed: true, highlight: false, anchorX: "left", anchorY: "bottom", layer: 5,
                fontSize: 12, strokeColor: GraphPalette.warningText,
            }) as JXG.GeometryElement);
        }
        const edge = run.state(step).testing?.edge;
        const quad = edge ? edgeQuad(tri, edge[0], edge[1]) : undefined;
        if (quad) {
            // The two triangles of the edge under test, the edge itself, and the circle of the triangle (a, b, c); d is tested.
            const triangle = (corners: readonly number[]) => this.board.create("polygon", corners.map(i => [at(i).x, at(i).y]), {
                name: "delaunay-test-triangle", vertices: {visible: false}, highlight: false, fixed: true, layer: 1,
                fillColor: GraphPalette.constructionAccent, fillOpacity: 0.15, borders: {visible: false, highlight: false, fixed: true},
            }) as JXG.GeometryElement;
            objects.push(triangle([quad.a, quad.b, quad.c]), triangle([quad.b, quad.a, quad.d]));
            const from = at(quad.a);
            const to = at(quad.b);
            objects.push(this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name: "delaunay-test-edge", highlight: false, fixed: true, layer: 5,
                strokeColor: GraphPalette.constructionAccent, strokeWidth: 6,
            }) as JXG.GeometryElement);
            const circle = this.drawCircle(tri, [quad.a, quad.b, quad.c], model, "delaunay-circumcircle");
            if (circle) objects.push(circle);
        }
        return [...objects, ...this.drawExtras(tri, model)];
    }

    /** One polygon per triangle (clickable inside); the selected one is filled and outlined, with its dashed circumcircle. */
    protected drawExtras(tri: Triangulation, model: PointSetModel): JXG.GeometryElement[] {
        const selected = this.selectedTriangle();
        const objects: JXG.GeometryElement[] = [];
        tri.triangles.forEach((corners, index) => {
            const isSelected = index === selected;
            const polygon = this.board.create("polygon", corners.map(i => {
                const p = gridToBoard(tri.points[i], model.gridStepExponent);
                return [p.x, p.y];
            }), {
                name: isSelected ? "delaunay-selected-triangle" : "delaunay-triangle", vertices: {visible: false}, highlight: false, fixed: true,
                hasInnerPoints: true, layer: isSelected ? 2 : 0, fillColor: GraphPalette.constructionAccent, fillOpacity: isSelected ? 0.2 : 0,
                borders: {visible: false, highlight: false, fixed: true},
            }) as JXG.GeometryElement;
            polygon.on("down", () => this.afterBoardPress(() => this.selectTriangle(this.selectedTriangle() === index ? undefined : index)));
            objects.push(polygon);
        });
        const chosen = selected === undefined ? undefined : tri.triangles[selected];
        const circle = chosen && this.drawCircle(tri, chosen, model, "delaunay-selected-circle", 2);
        if (circle) objects.push(circle);
        return objects;
    }

    /** The circumcircle of the triangle `corners`: centre and radius from the exact rationals, converted to doubles here for drawing only. */
    protected drawCircle(tri: Triangulation, corners: readonly [number, number, number], model: PointSetModel, name: string, dash = 0): JXG.GeometryElement | undefined {
        const circle = circumcircle(tri.points[corners[0]], tri.points[corners[1]], tri.points[corners[2]]);
        if (!circle) return undefined;
        const scale = 2 ** model.gridStepExponent;
        return this.board.create("circle", [[circle.x * scale, circle.y * scale], circle.r * scale], {
            name, withLabel: false, fixed: true, highlight: false, layer: 3, fillOpacity: 0,
            strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash,
        }) as JXG.GeometryElement;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly delaunayActions: DelaunayControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.controller.isPlaying()) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: index => this.loadExample(index),
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
            <DelaunayControls status={this.status()} playing={this.controller.isPlaying()} actions={this.delaunayActions}/>
            {super.workspaceEdit()}
        </>;
    }
}

const sortedTriple = (corners: readonly number[]): readonly [number, number, number] => {
    const [a, b, c] = [...corners].sort((x, y) => x - y);
    return [a, b, c];
};
const sameTriple = (x: readonly number[], y: readonly number[]) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
