import React from "react";
import {t} from "../../localization";
import {AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {PointSetModel, PointSetOptions, segmentsOf, serializePointSetModel, setMode} from "../../compgeo/pointSetModel";
import {Rational} from "../../compgeo/rational";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from "../../compgeo/sweep/limits";
import type {Segment} from "../../compgeo/sweep/segments";
import {PresetCollection} from "../base/presets/PresetCollection";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
import {PointSetStepDeclaration} from "./pointSetPersistence";
import {nameBox, PlacedLabels, pxFrame, type PlacementInput, type PxFrame} from "../legend/pointNamePlacement";
import type {LabelItem, PxBox} from "../legend/boardLabelPlacement";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {BentleyOttmannControlActions, BentleyOttmannControls, BentleyOttmannLists} from "./BentleyOttmannControls";
import {BentleyOttmannRun, runBentleyOttmann} from "./bentleyOttmannRun";
import {BENTLEY_OTTMANN_EXAMPLE_1, BENTLEY_OTTMANN_OVERLAY_IDS, bentleyOttmannCollection} from "./bentleyOttmannPresetCollection";
import {registerTraceCommands, requestedTraceStep} from "./traceLessonActions";
import {TracePlayback} from "../base/tracePlayback";
import {parseHullStep} from "./hullTraceRun";

/** Time between two playback steps (one step per trace event, never more). */
export const BENTLEY_OTTMANN_STEP_INTERVAL_MS = 400;
export type BentleyOttmannOverlayId = "sweep";
/** A JSXGraph text, for the attributes its typings leave out. */

/** The saved configuration beyond the segments: the step index. Playback status is never state. */
export interface BentleyOttmannGraphState extends PointSetGraphState {
    step: number;
}

/**
 * A point-set graph in segments mode that sweeps a horizontal line downward over the segments and steps through the trace of
 * `bentleyOttmannTrace` (task 09, spec sweep-algorithms-lessons C2). Shaped like `IntervalSweepGraph`: the scene state keeps
 * only the segments and the step index; the drawn state is always recomputed from the trace. Next step and every Play tick go
 * through the shared `TracePlayback` (its injectable `AnimationScheduler` drives Play), which stops at the last step.
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
        this.names.clear();
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        this.playback?.halt();
        this.names.clear();
        super.syncReplacedScene();
    }

    // ---- Names ---------------------------------------------------------------------------------------------------

    /** The placed boxes of the endpoint names P_i and the segment names s_k, shared by the labels of one board state (boxes only, no board reference). */
    private readonly names = new PlacedLabels();

    /** The names of one board state: the placed boxes of the shown points, keyed by their positions and the font. */
    private placed(): Record<string, PxBox> {
        const shown = this.shownPoints(), fontPx = this.nameFontPx();
        return this.names.boxes(this.board, [shown.map(p => `${p.name}:${p.x},${p.y},${p.r}`).join(";"), fontPx()], frame => this.nameInput(frame, shown, fontPx()));
    }

    protected override endpointLabelStyle(name: string, point: () => JXG.Point | undefined): Record<string, unknown> {
        return {
            anchorX: "middle", anchorY: "middle",
            offset: () => {
                const frame = pxFrame(this.board), element = point();
                return frame && element ? this.names.offset(this.placed()[name], frame.toPx(element.X(), element.Y()), [8, 8]) : [8, 8];
            },
        };
    }

    /** A segment name sits at the centre of its placed box instead of on the segment. */
    protected override segmentLabelStyle(name: string, centre: readonly [() => number, () => number]) {
        const at = (axis: 0 | 1) => () => {
            const frame = pxFrame(this.board), box = this.placed()[name];
            if (!frame || !box) return centre[axis]();
            return axis === 0 ? frame.left + (box.x0 + box.x1) / 2 / this.board.unitX : frame.top - (box.y0 + box.y1) / 2 / this.board.unitY;
        };
        return {centre: [at(0), at(1)] as const, attributes: {anchorX: "middle", anchorY: "middle"}};
    }

    private nameFontPx(): () => number {
        const size = (this.styles.point.default.label as unknown as {fontSize?: number | (() => number)}).fontSize;
        return () => typeof size === "function" ? size() : size ?? 15;
    }

    /** The drawn points: the endpoints and the sweep overlay's marks (centre in board units, radius in px). */
    private shownPoints(): Array<{name: string; x: number; y: number; r: number}> {
        return (this.board.objectsList as unknown as Array<JXG.GeometryElement & {X?: () => number; Y?: () => number; evalVisProp(name: string): unknown}>)
            .filter(o => o.elType === "point" && o.X && o.Y && o.name !== "pending" && Boolean(o.evalVisProp("visible")))
            .map(o => ({name: o.name, x: o.X!(), y: o.Y!(), r: Number(o.evalVisProp("size")) + 1 || 7}));
    }

    private nameInput(frame: PxFrame, shown: ReadonlyArray<{name: string; x: number; y: number; r: number}>, fontPx: number): PlacementInput {
        const px = shown.map(p => ({...p, at: frame.toPx(p.x, p.y)}));
        const markers = px.map(p => [p.at[0], p.at[1], Math.max(p.r, 7)] as const);
        const ends = px.filter(p => /^P\d+$/.test(p.name)).sort((a, b) => Number(a.name.slice(1)) - Number(b.name.slice(1)));
        const segments: Array<[readonly [number, number], readonly [number, number]]> = [];
        for (let k = 0; 2 * k + 1 < ends.length; k++) segments.push([ends[2 * k].at, ends[2 * k + 1].at]);
        const samples: Array<readonly [number, number]> = [];
        for (const [a, b] of segments) {
            const n = Math.max(1, Math.min(600, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)));
            for (let i = 0; i <= n; i++) samples.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
        }
        const crossings: Array<readonly [number, number]> = [];
        segments.forEach(([p, q], i) => segments.forEach(([r, u], j) => {
            if (j <= i) return;
            const d = (q[0] - p[0]) * (u[1] - r[1]) - (q[1] - p[1]) * (u[0] - r[0]);
            if (d === 0) return;
            const t = ((r[0] - p[0]) * (u[1] - r[1]) - (r[1] - p[1]) * (u[0] - r[0])) / d;
            const w = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
            if (t >= 0 && t <= 1 && w >= 0 && w <= 1) crossings.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }));
        const items: LabelItem[] = ends.map(p => ({id: p.name, ax: p.at[0], ay: p.at[1], ...nameBox(p.name, fontPx)}));
        segments.forEach(([a, b], k) => {
            const at = (f: number) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as const;
            // The anchor farthest (up to 120 px) from every crossing with another segment first; a tie keeps the order 0,5, 0,3, 0,7, 0,2, 0,8.
            const clear = (f: number) => Math.min(120, ...crossings.map(c => Math.hypot(c[0] - at(f)[0], c[1] - at(f)[1])));
            const order = [0.5, 0.3, 0.7, 0.2, 0.8].map((f, i) => ({f, i, c: Math.round(clear(f) / 4)})).sort((x, y) => y.c - x.c || x.i - y.i);
            const [first, ...rest] = order.map(o => at(o.f));
            items.push({id: `s${k + 1}`, ax: first[0], ay: first[1], alts: rest, ...nameBox(`s${k + 1}`, fontPx)});
        });
        return {items, markers, samples};
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

    /** The declared step of the persisted scene (task 08): the trace length of the data decides the clamp. */
    private readonly stepDeclaration: PointSetStepDeclaration = {
        clamp: (model, step) => runBentleyOttmann(segmentsOf(model)).clamp(step),
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
