import React from "react";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel, PointSetOptions, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from "../../compgeo/sweep/limits";
import type {RationalBox} from "../../compgeo/voronoi";
import {fitBoundingBox} from "../base/fitBoundingBox";
import {BaseGraphState} from "../base/BaseGraph";
import type {GraphSession} from "../base/GraphSession";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {FortuneControlActions, FortuneControls} from "./FortuneControls";
import {runFortune, siteName, type FortuneRun} from "./fortuneRun";
import {
    FORTUNE_COCIRCULAR, FORTUNE_COLLINEAR, FORTUNE_EXAMPLE_1, FORTUNE_EXAMPLE_2, FORTUNE_OVERLAY_IDS, fortuneCollection,
    randomGeneralSites, type FortuneExampleId,
} from "./fortunePresetCollection";
import {createFortuneSweepDrawing, type FortuneSweepHandle} from "./fortuneDrawing";
import {followedGridBox, visibleGridBox} from "./followBox";
import {createVoronoiDrawing, type VoronoiDrawingHandle, type VoronoiDrawingStats} from "./voronoiDrawing";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per pop group, never more). */
export const FORTUNE_STEP_INTERVAL_MS = 400;
/** The controller's documented step limit: far above the longest trace of 12 sites. */
const MAX_PLAYBACK_STEPS = 100000;

/** The saved configuration beyond the sites: the step index. Playback status is never state. */
export interface FortuneGraphState extends PointSetGraphState {
    step: number;
}

/**
 * A point-set graph (points mode, at most 12 sites, named A, B, C, ...) that sweeps a horizontal line downward and steps
 * through the exact Fortune trace (`fortuneTrace`, task sweep-algorithms/23). Shaped like `BentleyOttmannGraph`: the scene
 * state keeps only the sites and the step index; everything drawn is recomputed from the run.
 *
 * Steps are pop groups (accepted decision): step 0 is the queue filled, then one step per group of events popped at the same
 * sweep position, the last step is `done`. Every step therefore shows a consistent beach line. Next step and every Play tick
 * run the one `advance()`; Play uses the shared `IterationController` and stops at `done`.
 *
 * Unlike the Bentley-Ottmann graph, a change of the sites (a drag, an edit, an import) recomputes the whole trace and KEEPS
 * the step index, clamped to the new trace; it pauses playback. A Reset or an example returns to step 0.
 *
 * Board: while the sweep runs, `createFortuneSweepDrawing` draws the sweep line, the beach line (double precision, drawn
 * approximately), breakpoints, traced half-edges, scheduled and cancelled circles and the vertices so far; at `done` the sweep
 * objects are emptied and the finished diagram goes to `createVoronoiDrawing(...).update` like the Voronoi graph. Both
 * drawings follow the visible area of the board (rounded inward, inset for the markers). The drawing objects are created once,
 * reused across steps and drags, and removed with the figure scene and before the board is freed on unmount.
 */
export class FortuneGraph extends PointSetGraph<never> {
    private controller: IterationController;
    private controllerDisposed = false;
    private advancing = false;
    private runMemo?: {points: readonly GridPoint[]; run: FortuneRun};
    private sweep?: {handle: FortuneSweepHandle; scale: number};
    private final?: {handle: VoronoiDrawingHandle; scale: number};
    private drawnFor?: {run: FortuneRun; step: number; box: RationalBox; scale: number};
    private followBox?: RationalBox;
    private followScale?: number;
    private startView?: readonly number[];
    /** What the last update of the final drawing drew; undefined while the sweep runs (as `VoronoiGraph.drawingStats`). */
    private statsValue?: VoronoiDrawingStats;
    /** The session whose board the drawing handles above draw on. */
    private ownedBy?: GraphSession;
    private seed = 0;

    constructor(options: PointSetOptions = {}, private readonly scheduler?: AnimationScheduler) {
        super({pointLimit: SWEEP_MAX_SITES, coordinateLimit: SWEEP_COORD_LIMIT, ...options});
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: FORTUNE_STEP_INTERVAL_MS,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The run of `points`; recomputed only when the points change. */
    private runFor(points: readonly GridPoint[]): FortuneRun {
        if (this.runMemo?.points !== points) this.runMemo = {points, run: runFortune(points)};
        return this.runMemo.run;
    }

    run(): FortuneRun {
        return this.runFor(this.model.points);
    }

    /** The step index, clamped to the current trace (a stale stored index never leaves the trace). */
    get step(): number {
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        return this.run().clamp(stored ?? 0);
    }

    /** What the finished diagram's drawing drew at `done`; undefined while the sweep runs. */
    drawingStats(): VoronoiDrawingStats | undefined {
        return this.statsValue;
    }

    get isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    protected override pointName(index: number): string {
        return siteName(index);
    }

    override getInitialState(): FortuneGraphState {
        return {...super.getInitialState(), step: 0};
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    private patch(fields: Partial<FortuneGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    /** A new model keeps the step (clamped to its trace), unless the write names the step itself. The sweep works on points. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const before = this.state.model;
        let namedStep = false;
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw) return raw;
            namedStep = "step" in raw;
            const patch = raw.model && raw.model.mode !== "points" ? {...raw, model: setMode(raw.model, "points")} : raw;
            if (patch.model === undefined || patch.model === state.model || "step" in patch) return patch;
            const stored = "step" in state ? parseHullStep(state.step) : undefined;
            return this.patch({...patch, step: this.runFor(patch.model.points).clamp(stored ?? 0)});
        };
        super.setState(wrapped, callback);
        // The controller does not exist yet while the base class is being constructed.
        if (!this.controller) return;
        if (this.state.model !== before) {
            this.controller.reset(this.step);
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

    /** Loads a named example at step 0; `random` draws a new set of 12 sites each time (a counting seed). */
    loadExample(id: FortuneExampleId): void {
        const models = {
            "example-1": FORTUNE_EXAMPLE_1, "example-2": FORTUNE_EXAMPLE_2, collinear: FORTUNE_COLLINEAR, cocircular: FORTUNE_COCIRCULAR,
        } as const;
        this.pause();
        this.loadModel(id === "random" ? randomGeneralSites(++this.seed) : models[id]);
        this.resetTrace();
    }

    /** Shows the box of the current run again (sweep area with its circles), fitted to the board; the drawing returns to that box too. */
    resetView(): void {
        if (!this.hasBoard) return;
        const box = this.run().box;
        if (!box) return;
        const scale = 2 ** this.model.gridStepExponent;
        const corners: [number, number, number, number] = [box.minX.toNumber() * scale, box.maxY.toNumber() * scale, box.maxX.toNumber() * scale, box.minY.toNumber() * scale];
        const fitted = fitBoundingBox([[corners[0], corners[1]], [corners[2], corners[3]]], this.board.canvasWidth, this.board.canvasHeight);
        this.board.setBoundingBox(fitted ?? corners, true);
        this.followBox = undefined;
        this.syncScene();
    }

    override mount(container: HTMLElement): void {
        // A disposed controller stays silent for good; a remount (React StrictMode) needs a new one.
        if (this.controllerDisposed) {
            this.controller = this.createController();
            this.controllerDisposed = false;
        }
        super.mount(container);
    }

    /** The drawing objects must go before the board is freed: disposing removes them from that board. */
    override unmount(): void {
        this.disposeOwned();
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
        this.disposeOwned();
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        if (this.controller) this.controller.pause();
        super.syncReplacedScene();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return fortuneCollection;
    }

    override defaultPreset(): PointSetModel {
        return serializePointSetModel(FORTUNE_EXAMPLE_1);
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: FortuneGraphState = {...this.state, step: this.step};
        return state;
    }

    /** An imported model keeps the step that the Preset's `graphState` just set, clamped to the new trace; playback is paused. */
    override importPresetData(data: PointSetModel): void {
        const model = serializePointSetModel(data);
        const stored = "step" in this.state ? parseHullStep(this.state.step) : undefined;
        const step = this.runFor(model.points).clamp(stored ?? 0);
        this.setState(this.patch({model, step}));
        this.controller.reset(step);
        this.requestRender();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const stored = "step" in merged ? parseHullStep(merged.step) : undefined;
        const state: FortuneGraphState = {...merged, step: runFortune(merged.model.points).clamp(stored ?? 0)};
        return state;
    }

    protected override overlayIds() {
        return FORTUNE_OVERLAY_IDS;
    }

    // ---- View ----------------------------------------------------------------------------------------------------

    /** The first example's box (sweep area with its circles); the app default would put the sites on the frame. */
    protected override initialView(): [number, number, number, number] {
        const box = runFortune(FORTUNE_EXAMPLE_1.points).box as RationalBox;
        return [box.minX.toNumber(), box.maxY.toNumber(), box.maxX.toNumber(), box.minY.toNumber()];
    }

    /** The box of the drawing: the board's visible area once it changed, else the run's own box. */
    private drawBox(run: FortuneRun): RationalBox | undefined {
        const scale = 2 ** this.model.gridStepExponent;
        // A box measured at another grid step is stale (a scene replacement changes the step before the board is told): measure again.
        if (this.followBox && this.followScale !== scale && this.hasBoard) {
            this.followBox = this.measureFollow();
            this.followScale = scale;
        }
        return this.followBox ?? run.box;
    }

    /** The board's visible area as integer grid units (shared with the Voronoi graph, see `visibleGridBox`). */
    private visibleBox(): RationalBox | undefined {
        return visibleGridBox(this.board, 2 ** this.model.gridStepExponent);
    }

    /** The visible box once the view differs from the starting view (loading a Preset re-applies that view, which is not a change of view). */
    private measureFollow(): RationalBox | undefined {
        return followedGridBox(this.board, 2 ** this.model.gridStepExponent, this.startView);
    }

    private followView(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        const measured = this.visibleBox();
        const next = this.measureFollow();
        if (!next) {
            if (measured && this.followBox) {
                this.followBox = undefined;
                if (this.syncFortune()) this.boardUpdate();
            }
            return;
        }
        const current = this.followBox;
        const same = current && this.followScale === 2 ** this.model.gridStepExponent
            && (["minX", "maxX", "minY", "maxY"] as const).every(k => current[k].equals(next[k]));
        if (same) return;
        this.followBox = next;
        this.followScale = 2 ** this.model.gridStepExponent;
        if (this.syncFortune()) this.boardUpdate();
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.followBox = undefined;
        this.startView = [...this.board.getBoundingBox()];
        session.on("boundingbox", () => this.followView());
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The sites (base), then the sweep objects or the finished diagram. */
    protected override syncScene(): void {
        super.syncScene();
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.syncFortune()) this.boardUpdate();
    }

    /** Draws the current step through the reused handles; true when something was redrawn. */
    private syncFortune(): boolean {
        const run = this.run();
        const scale = 2 ** this.model.gridStepExponent;
        const box = this.drawBox(run);
        if (!run.result || !box) return this.disposeOwned();
        // Ownership is explicit: the handles belong to the session whose board they draw on. Scene replacement and unmount dispose
        // them (`disposeFigureScene`, `unmount`); handles of another session cannot be disposed (their board is freed) and are forgotten.
        if (this.ownedBy !== this.graphSession) this.forgetOwned();
        if ((this.sweep && this.sweep.scale !== scale) || (this.final && this.final.scale !== scale)) this.disposeOwned();
        const step = this.step;
        const drawn = this.drawnFor;
        if (drawn && drawn.run === run && drawn.step === step && drawn.box === box && drawn.scale === scale && this.sweep) return false;
        const view = run.view(step, box);
        if (!view) return this.disposeOwned();
        this.ownedBy = this.graphSession;
        this.sweep ??= {handle: createFortuneSweepDrawing(this.board, scale), scale};
        if (view.done) {
            this.sweep.handle.clear();
            this.final ??= {handle: createVoronoiDrawing(this.board, scale), scale};
            this.statsValue = this.final.handle.update(run.result.diagram, this.model.points, box, {cells: true, edges: true, vertices: true});
        } else {
            this.final?.handle.dispose();
            this.final = undefined;
            this.statsValue = undefined;
            this.sweep.handle.update(view, box);
        }
        this.drawnFor = {run, step, box, scale};
        return true;
    }

    /** Removes every object this graph drew apart from the sites; true when there were any. */
    private disposeOwned(): boolean {
        const had = this.sweep !== undefined || this.final !== undefined;
        this.sweep?.handle.dispose();
        this.final?.handle.dispose();
        this.forgetOwned();
        return had;
    }

    /** Lets go of the handles without touching the board (it was replaced or freed with its session). */
    private forgetOwned(): void {
        this.sweep = undefined;
        this.final = undefined;
        this.ownedBy = undefined;
        this.statsValue = undefined;
        this.drawnFor = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly sweepActions: FortuneControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.controller.isPlaying()) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: id => this.loadExample(id),
        resetView: () => this.resetView(),
    };

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <FortuneControls run={this.run()} step={this.step} playing={this.controller.isPlaying()} actions={this.sweepActions}/>
            {super.workspaceEdit()}
        </>;
    }
}
