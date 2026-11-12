import React from "react";
import {t} from "../../localization";
import {clipBezierPair, ClipPoint, ClipRange, ClipState, clipFold, ClipTrace, INITIAL_CLIP_STATE, subNet} from "../../bezeg/impl/kernels/bezier-clipping";
import type {LessonAction} from "../../learning/model";
import {bezierAt} from "../../compgeo/curvePairNets";
import {hullsSeparated} from "../../compgeo/hullSeparation";
import {isGridStepExponent, parsePointSetModel, PointSetModel} from "../../compgeo/pointSetModel";
import {stateAt} from "../../compgeo/trace";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {CURVE_PAIR_SAMPLES, CurveName, CurvePairOverlayId} from "./CurvePairGraph";
import {PointSetGraphState} from "./PointSetGraph";
import {aliveRanges, ClippingStepView, clippingStepView, discardedRanges, fatLineStrip} from "./bezierClippingView";
import {DEFAULT_CLIP_TOLERANCE_EXPONENT, parseClipToleranceExponent} from "./bezierClippingPresetCollection";
import type {PointSetExtraField} from "./pointSetPersistence";
import {BEZIER_CLIPPING_OVERLAY_IDS, bezierClippingCollection} from "./compgeoPresetCollections";
import {BezierClippingControls} from "./BezierClippingControls";
import {ClipDistancePlotController} from "./ClipDistancePlot";
import {TRACE_STEP_INTERVAL_MS, TraceCurvePairGraph, TraceCurvePairGraphState} from "./TraceCurvePairGraph";

/** Time between two playback steps, shared with every traced curve pair. */
export const BEZIER_CLIPPING_STEP_INTERVAL_MS = TRACE_STEP_INTERVAL_MS;

export type BezierClippingOverlayId = "fatLine" | "kept" | "discarded";
export {BEZIER_CLIPPING_OVERLAY_IDS};

/** The saved configuration beyond the points: the step index and the tolerance exponent k (tolerance 10^-k). Playback is never state. */
export interface BezierClippingGraphState extends TraceCurvePairGraphState {
    clipToleranceExponent: number;
}

/** The kept parts are drawn wider than the curve (3), the discarded parts as wide as it, so thick versus thin is the second signal. */
const KEPT_WIDTH = 6;
const DISCARDED_WIDTH = 3;
/** Above the curves (layer 5), as the pieces of the Bezier hulls graph. */
const ABOVE_CURVE_LAYER = 6;
/** The fat line sits under the curves and the control polygons. */
const FAT_LINE_LAYER = 1;
const FAT_LINE_FILL_OPACITY = 0.15;

type BoardPoint = {x: number; y: number};

/** Board object names of the grouped curves: `clipKept-A`, `clipDiscarded-B`; the fat line is `fatLineBand` and `fatLineEdges`. */
export const clipKeptName = (name: CurveName) => `clipKept-${name}`;
export const clipDiscardedName = (name: CurveName) => `clipDiscarded-${name}`;
export const FAT_LINE_BAND_NAME = "fatLineBand";
export const FAT_LINE_EDGES_NAME = "fatLineEdges";

/**
 * Bezier clipping (advanced Bezier D2, AB-B-2a1/2a2): the graph and its inspector (tolerance select, playback, status, interval
 * table and the distance inset), without a route. Two Bezier curves are
 * intersected by `clipBezierPair` (kernel `bezier-clipping`); the step, playback and disposal are `TraceCurvePairGraph`; the
 * drawn state is always the fold of the run (`clipState`). The run is recomputed only when the points or the tolerance
 * exponent change, and either change returns to step 0 and pauses.
 *
 * The inset (`ClipDistancePlotController`) is fed from `syncScene`, which runs on every state change (step, drag, tolerance), so
 * no React renders for a drag. Reads: `step`, `run()` (the trace), `clipState`, `isPlaying`, `clipToleranceExponent`, `tolerance`,
 * `stepView` (the fat line, distance control points, band and clipped range of the shown step, or null), `hullsApart`; actions
 * `nextStep()`, `play()`, `pause()`, `resetTrace()`, `setClipTolerance(exponent)`.
 *
 * Overlays: `fatLine` (a translucent strip of the clipping curve's fat line in that curve's colour), `kept` (the alive parameter
 * ranges of both curves, thick) and `discarded` (the complement, as wide as the curve and neutral grey). A and B keep solid and
 * dashed in every group. Each overlay is a fixed set of JSXGraph curves, an empty set of ranges being a curve of one NaN point.
 */
export class BezierClippingGraph extends TraceCurvePairGraph<BezierClippingOverlayId, ClipTrace> {
    private clipStateMemo?: {trace: ClipTrace; step: number; tolerance: number; state: ClipState};
    private stepViewMemo?: {trace: ClipTrace; step: number; tolerance: number; view: ClippingStepView | null};
    private apartMemo?: {points: PointSetModel["points"]; apart: boolean};
    private readonly inset = new ClipDistancePlotController();

    // ---- State ---------------------------------------------------------------------------------------------------

    /** The tolerance exponent of `state`; a state that names none (or an invalid one) has the default. */
    private exponentOf(state: PointSetGraphState): number {
        const stored = "clipToleranceExponent" in state ? parseClipToleranceExponent(state.clipToleranceExponent) : undefined;
        return stored ?? DEFAULT_CLIP_TOLERANCE_EXPONENT;
    }

    /** A patch with the step and the tolerance exponent; `Partial<BezierClippingGraphState>` is the one place that types them. */
    private clipPatch(fields: Partial<BezierClippingGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    override getInitialState(): BezierClippingGraphState {
        return {
            ...super.getInitialState(), clipToleranceExponent: DEFAULT_CLIP_TOLERANCE_EXPONENT,
            overlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true},
        };
    }

    get clipToleranceExponent(): number {
        return this.exponentOf(this.state);
    }

    /** The stopping tolerance on both parameter widths, 10^-k. */
    get tolerance(): number {
        return 10 ** -this.clipToleranceExponent;
    }

    /**
     * Sets the tolerance to 10^-`exponent`. An exponent that is not a whole number from 3 to 10 changes nothing and returns false,
     * as does the exponent already set; otherwise the tolerance and step 0 are written together (the run changes, playback stops)
     * and it returns true.
     */
    setClipTolerance(exponent: number): boolean {
        const valid = parseClipToleranceExponent(exponent);
        if (valid === undefined || valid === this.clipToleranceExponent) return false;
        this.setState(this.clipPatch({clipToleranceExponent: valid, step: 0}));
        this.requestRender();
        return true;
    }

    // ---- Run -----------------------------------------------------------------------------------------------------

    /** The nets of `model` in board units, as the kernel's points. */
    private boardNets(model: PointSetModel): {a: ClipPoint[]; b: ClipPoint[]} {
        const {a, b} = this.curvePairNets(model);
        const tuples = (net: readonly {x: number; y: number}[]): ClipPoint[] => net.map(p => {
            const q = this.toBoard(p, model);
            return [q.x, q.y] as const;
        });
        return {a: tuples(a), b: tuples(b)};
    }

    protected override computeRun(model: PointSetModel, state: PointSetGraphState): ClipTrace {
        const {a, b} = this.boardNets(model);
        return clipBezierPair(a, b, {tolerance: 10 ** -this.exponentOf(state)}).trace;
    }

    protected override runSettingsKey(state: PointSetGraphState): unknown {
        return this.exponentOf(state);
    }

    /** The fold of the run up to the shown step; refolded only when the run, the step or the tolerance changes. */
    get clipState(): ClipState {
        const trace = this.run();
        const step = this.step;
        const tolerance = this.tolerance;
        const memo = this.clipStateMemo;
        if (memo?.trace === trace && memo.step === step && memo.tolerance === tolerance) return memo.state;
        const state = stateAt(trace, step, clipFold(tolerance), INITIAL_CLIP_STATE);
        this.clipStateMemo = {trace, step, tolerance, state};
        return state;
    }

    /** The fat line, distance control points, band and clipped range of the shown step; null when no clip is shown or previewed. */
    get stepView(): ClippingStepView | null {
        const trace = this.run();
        const step = this.step;
        const tolerance = this.tolerance;
        const memo = this.stepViewMemo;
        if (memo?.trace === trace && memo.step === step && memo.tolerance === tolerance) return memo.view;
        const {a, b} = this.boardNets(this.model);
        const view = clippingStepView(trace, step, tolerance, a, b);
        this.stepViewMemo = {trace, step, tolerance, view};
        return view;
    }

    /** True when the control hulls of the two whole nets are certified disjoint (`hullsSeparated`); memoised on the points. */
    get hullsApart(): boolean {
        const points = this.model.points;
        if (this.apartMemo?.points !== points) {
            const {a, b} = this.curvePairNets(this.model);
            const board = (net: readonly {x: number; y: number}[]) => net.map(p => this.toBoard(p, this.model));
            this.apartMemo = {points, apart: hullsSeparated(board(a), board(b)).separated};
        }
        return this.apartMemo.apart;
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------

    /**
     * `load-model` replaces the whole curve pair with points in board units on the grid of step 2^exponent (it exists because
     * `set-points` places whole numbers only), returns to step 0 and pauses; `set-clip-tolerance` is `setClipTolerance`. An
     * off-grid point, a non-pair or an invalid exponent is a lesson-content error. Everything else is `TraceCurvePairGraph`'s.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "load-model") {
            const {gridStepExponent: exponent, points: raw} = action;
            if (!Array.isArray(raw) || !raw.every(p => Array.isArray(p) && p.length === 2)) throw new Error("point-set load-model: points must be a list of [x, y] pairs.");
            if (!isGridStepExponent(exponent)) throw new Error("point-set load-model: gridStepExponent must be an integer the grid allows.");
            const scale = 2 ** -exponent;
            const points = raw.map(([x, y]) => {
                if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x * scale) || !Number.isInteger(y * scale)) {
                    throw new Error(`point-set load-model: (${String(x)}, ${String(y)}) is not on the grid of step ${2 ** exponent}.`);
                }
                return {x: x * scale, y: y * scale};
            });
            const parsed = parsePointSetModel({mode: "points", gridStepExponent: exponent, points}, {pointLimit: this.pointLimit, coordinateLimit: this.coordinateLimit});
            if (!parsed.ok) throw new Error(`point-set load-model: rejected (${parsed.reason}${parsed.limit !== undefined ? `, limit ${parsed.limit}` : ""}${parsed.bound !== undefined ? `, bound ${parsed.bound}` : ""}).`);
            this.loadModel(parsed.model);
            return;
        }
        if (action.operation === "set-clip-tolerance") {
            if (parseClipToleranceExponent(action.exponent) === undefined) {
                throw new Error("point-set set-clip-tolerance: exponent must be a whole number from 3 to 10.");
            }
            this.setClipTolerance(action.exponent);
            return;
        }
        super.applyPointSetAction(action);
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return bezierClippingCollection;
    }

    /** The tolerance exponent is persisted; a Preset that names none (or an invalid one) shows the default 6. */
    protected override settingFields(): readonly PointSetExtraField[] {
        return [{name: "clipToleranceExponent", parse: parseClipToleranceExponent, fallback: DEFAULT_CLIP_TOLERANCE_EXPONENT}];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <BezierClippingControls state={this.clipState} step={this.step} length={this.run().length} playing={this.isPlaying}
                                    hullsApart={this.hullsApart} toleranceExponent={this.clipToleranceExponent}
                                    onTolerance={exponent => { this.setClipTolerance(exponent); }} actions={this.traceActions}
                                    inset={this.inset} fontSize={this.displaySettings.fontSize}/>
            {super.workspaceEdit()}
        </>;
    }

    /** The scene sync runs after every state change, so the inset follows the step, the points and the tolerance. */
    protected override syncScene(): void {
        super.syncScene();
        // Not yet built while the base class is being constructed.
        if (this.inset) this.inset.push(this.stepView);
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return BEZIER_CLIPPING_OVERLAY_IDS;
    }

    protected override overlayLabel(id: CurvePairOverlayId | BezierClippingOverlayId | "grid"): string {
        if (id === "fatLine") return t("bezierclipping_overlay_fatline");
        if (id === "kept") return t("bezierclipping_overlay_kept");
        if (id === "discarded") return t("bezierclipping_overlay_discarded");
        return super.overlayLabel(id);
    }

    protected override drawOverlay(id: CurvePairOverlayId | BezierClippingOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "fatLine") return this.drawFatLine();
        if (id !== "kept" && id !== "discarded") return super.drawOverlay(id, model);
        const nets = this.boardNets(model);
        const state = this.clipState;
        return ([["A", nets.a], ["B", nets.b]] as const).map(([name, net]) => {
            const ranges = (id === "kept" ? aliveRanges : discardedRanges)(state, name);
            const style = this.curveStyle(name);
            const look = id === "kept"
                ? {strokeColor: style.strokeColor, strokeWidth: KEPT_WIDTH, name: clipKeptName(name)}
                : {strokeColor: GraphPalette.referenceCurve, strokeWidth: DISCARDED_WIDTH, name: clipDiscardedName(name)};
            return this.curveOfPolylines(ranges.map(range => this.sampleRange(net, range)),
                {...look, dash: style.dash, layer: ABOVE_CURVE_LAYER, highlight: false, fixed: true, withLabel: false, linecap: "round"});
        });
    }

    /** The fat line of the shown step: the strip (a filled ring) and its two edge lines, in the colour of the curve that gives it. */
    private drawFatLine(): JXG.GeometryElement[] {
        const view = this.stepView;
        const style = this.curveStyle(view?.source ?? "A");
        const common = {strokeColor: style.strokeColor, layer: FAT_LINE_LAYER, highlight: false, fixed: true, withLabel: false};
        const band = {...common, name: FAT_LINE_BAND_NAME, strokeWidth: 0, fillColor: style.strokeColor, fillOpacity: FAT_LINE_FILL_OPACITY};
        const edges = {...common, name: FAT_LINE_EDGES_NAME, strokeWidth: 1.5, dash: style.dash};
        if (!view) return [this.curveOfPolylines([], band), this.curveOfPolylines([], edges)];
        const [p0, p1, p2, p3] = fatLineStrip(view.fatLine, view.sourceNet).map(([x, y]) => ({x, y}));
        return [this.curveOfPolylines([[p0, p1, p2, p3, p0]], band), this.curveOfPolylines([[p0, p1], [p3, p2]], edges)];
    }

    /** The part of the curve over `range`, sampled from `subNet` of the original net, about CURVE_PAIR_SAMPLES points per full curve. */
    private sampleRange(net: readonly ClipPoint[], range: ClipRange): BoardPoint[] {
        const part = subNet(net, range[0], range[1]).map(([x, y]) => ({x, y}));
        const n = Math.max(2, Math.ceil(CURVE_PAIR_SAMPLES * (range[1] - range[0])));
        return Array.from({length: n + 1}, (_, i) => bezierAt(part, i / n));
    }

    /** One curve through several polylines, separated by NaN breaks (no trailing break); no polyline is a curve of one NaN point. */
    private curveOfPolylines(polylines: readonly BoardPoint[][], attributes: Record<string, unknown>): JXG.GeometryElement {
        const xs: number[] = [];
        const ys: number[] = [];
        polylines.forEach((line, k) => {
            if (k > 0) { xs.push(NaN); ys.push(NaN); }
            for (const p of line) { xs.push(p.x); ys.push(p.y); }
        });
        if (xs.length === 0) { xs.push(NaN); ys.push(NaN); }
        return this.board.create("curve", [xs, ys], attributes) as JXG.GeometryElement;
    }
}
