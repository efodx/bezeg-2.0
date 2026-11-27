import React from "react";
import {message, Message, t} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ReadoutNote} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {GraphPalette} from "../styles/GraphPalette";
import {bezierHullsNotes, type BezierHullsNoteId} from "./bezierHullsNotes";
import {
    CURVE_PAIR_INITIAL_STATE, CurvePairState, CurvePairTrace, curvePairRun, curvePairStateAt, curvePieces, pieceHull,
} from "../../compgeo/curvePairSubdivision";
import {PointSetModel} from "../../compgeo/pointSetModel";
import type {HullPoint} from "../../compgeo/hullSeparation";
import {PresetCollection} from "../base/presets/PresetCollection";
import {CurveName, CurvePairOverlayId, isCurvePairModel} from "./CurvePairGraph";
import {BezierHullsControls} from "./BezierHullsControls";
import {BEZIER_HULLS_OVERLAY_IDS, bezierHullsCollection} from "./compgeoPresetCollections";
import {TRACE_STEP_INTERVAL_MS, TraceCurvePairGraph, TraceCurvePairGraphState} from "./TraceCurvePairGraph";

/** Time between two playback steps, shared with every traced curve pair. */
export const BEZIER_HULLS_STEP_INTERVAL_MS = TRACE_STEP_INTERVAL_MS;

export type BezierHullsOverlayId = "pieces";
export {BEZIER_HULLS_OVERLAY_IDS};

/** The ids of this graph's declaration (frames name them): the readout sentences, the legend, the switches and the playback. */
export type BezierHullsIds = {
    param: never; row: never; note: BezierHullsNoteId;
    legend: "points" | "curveA" | "curveB" | CurvePairOverlayId | BezierHullsOverlayId;
    section: "playback";
    action: CurvePairOverlayId | BezierHullsOverlayId | "next-step" | "play" | "reset";
};

/** The saved configuration beyond the points: the step index. Playback status is never state. */
export type BezierHullsGraphState = TraceCurvePairGraphState;

/**
 * How a group of drawn pieces looks. Every group keeps its curve's dash (A solid, B dashed), so the two curves differ by more
 * than colour at every step; the groups differ in fill, stroke width and opacity.
 */
type PieceLook = Record<string, unknown>;
/** The stroke of a kept piece: wider than the curve, so a depth 4 piece, a sliver along the curve, still shows. */
const KEPT_WIDTH = 6;
/** Hull rings of these looks sit above the curves (layer 5): at depth 3 and 4 they would otherwise hide under the curve's stroke. */
const ABOVE_CURVE_LAYER = 6;
/** Past step 0 the whole-curve hull is context, a faint outline with no fill, so the pieces carry the picture. */
const WHOLE_HULL_CONTEXT = {fillOpacity: 0, borders: {strokeOpacity: 0.35, strokeWidth: 1, highlight: false, fixed: true}};
/** Split step: a candidate is an outline with no fill. */
const CANDIDATE_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 1, strokeWidth: 3.5, layer: ABOVE_CURVE_LAYER};
/** Split step: the parent whose halves are the candidates, a thin outline. */
const PARENT_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 0.7, strokeWidth: 1};
/** Discard step: a piece in a kept pair is filled, full strength and thick. */
const KEPT_LOOK: PieceLook = {fillOpacity: 0.25, strokeOpacity: 1, strokeWidth: KEPT_WIDTH, layer: ABOVE_CURVE_LAYER};
/** Discard step: a piece in no kept pair is faded and thin with no fill (not by colour alone); 0.5 stays legible when projected. */
const FADED_LOOK: PieceLook = {fillOpacity: 0, strokeOpacity: 0.5, strokeWidth: 1.5};
/** The control polygons of the pieces: the base look of a control polygon, fainter for the faded pieces. */
const CONTROL_LOOK: PieceLook = {strokeOpacity: 0.7, strokeWidth: 1.5};
const FADED_CONTROL_LOOK: PieceLook = {strokeOpacity: 0.35, strokeWidth: 1};

/** The groups a step draws, per curve: one JSXGraph curve each for the hull rings and one for the control polygons. */
export type PieceGroup = "candidate" | "parent" | "kept" | "faded";
const GROUP_LOOKS: Record<PieceGroup, PieceLook> = {candidate: CANDIDATE_LOOK, parent: PARENT_LOOK, kept: KEPT_LOOK, faded: FADED_LOOK};
const GROUP_CONTROL_LOOKS: Record<PieceGroup, PieceLook | undefined> = {candidate: CONTROL_LOOK, parent: undefined, kept: CONTROL_LOOK, faded: FADED_CONTROL_LOOK};
/** Board object names of the grouped curves: `pieceHullA-kept`, `pieceControlB-faded`. */
export const pieceHullName = (name: CurveName, group: PieceGroup) => `pieceHull${name}-${group}`;
export const pieceControlName = (name: CurveName, group: PieceGroup) => `pieceControl${name}-${group}`;

type BoardPoint = {x: number; y: number};

const unique = (values: readonly number[]): number[] => [...new Set(values)];

/**
/**
 * Back to Bezier hulls of control polygons (convexity task 25b, spec A6): two Bezier curves halved at t = 1/2, the hull of
 * every piece drawn, pairs of hulls that cannot be certified apart kept for the next depth (`curvePairRun`, task 24).
 * The step, playback and disposal are `TraceCurvePairGraph`; the drawn state is always `curvePairStateAt` of the run.
 *
 * Reads for a readout (task 26): `step`, `run()`, `pairState` (depth, candidates, kept, discarded, tests, phase),
 * `isPlaying`; actions `nextStep()`, `play()`, `pause()`, `resetTrace()`.
 */
export class BezierHullsGraph extends TraceCurvePairGraph<BezierHullsOverlayId, CurvePairTrace> {
    protected override computeRun(model: PointSetModel): CurvePairTrace {
        const {a, b} = this.curvePairNets(model);
        return curvePairRun(a, b);
    }

    override getInitialState(): BezierHullsGraphState {
        return {...super.getInitialState(), overlays: {control: true, hull: true, pieces: true}};
    }

    /** What the shown step knows: the depth, the candidate pairs, the verdicts so far, the test count and the phase. */
    get pairState(): CurvePairState {
        return this.run().length === 0 ? CURVE_PAIR_INITIAL_STATE : curvePairStateAt(this.run(), this.step);
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return bezierHullsCollection;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <BezierHullsControls state={this.pairState} step={this.step} length={this.run().length} playing={this.isPlaying}
                                 actions={this.traceActions}/>
            {super.workspaceEdit()}
        </>;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return BEZIER_HULLS_OVERLAY_IDS;
    }

    protected override overlayLabel(id: CurvePairOverlayId | BezierHullsOverlayId | "grid"): string {
        if (id === "pieces") return t("bezierhulls_overlay_pieces");
        return super.overlayLabel(id);
    }

    // ---- Declaration (task 08): marks, legend and switches from the point-set base, the readout sentences as notes -----------

    protected override declaresPointSetWorkspace() { return true; }

    protected override overlayMessage(id: CurvePairOverlayId | BezierHullsOverlayId | "grid"): Message {
        if (id === "control") return message("control_polygons");
        if (id === "hull") return message("hulltrace_overlay_hull");
        if (id === "pieces") return message("bezierhulls_overlay_pieces");
        return super.overlayMessage(id);
    }

    /** What the lessons flip while watching the halving (the hulls of the pieces) is a puck; control polygons and hulls of the whole curves are display settings. */
    protected override overlayIsPuck(id: CurvePairOverlayId | BezierHullsOverlayId | "grid"): boolean {
        return id === "pieces";
    }

    protected override overlaySwatch(id: CurvePairOverlayId | BezierHullsOverlayId | "grid") {
        if (id === "control") return {kind: "line" as const, color: GraphPalette.primaryCurve};
        if (id === "hull" || id === "pieces") return {kind: "area" as const, color: GraphPalette.primaryCurve};
        return undefined;
    }

    /** The sentences of the readout (step, depth, pairs and verdicts), in the order the panel shows them. */
    protected override pointSetNotes(): readonly ReadoutNote<BezierHullsIds>[] {
        // Before the first Preset is applied the model is not yet a curve pair, so there is no run to read.
        if (!isCurvePairModel(this.model)) return [];
        return bezierHullsNotes(this.pairState, this.step, this.run().length);
    }

    protected override declaration(): GraphDeclaration<BezierHullsIds> | undefined {
        const common = super.declaration() as GraphDeclaration<BezierHullsIds>;
        const [points, ...overlays] = common.legend ?? [];
        const legend: LegendEntry<BezierHullsIds>[] = [
            ...(points ? [points] : []),
            {id: "curveA", label: message("bezierhulls_curve_a"), kind: "line", object: "curveA"},
            {id: "curveB", label: message("bezierhulls_curve_b"), kind: "dashed", object: "curveB"},
            ...overlays,
        ];
        const ready = isCurvePairModel(this.model);
        const atEnd = !ready || this.step >= this.run().length - 1;
        const step = ready ? this.step : 0;
        const playback = {placement: "tools" as const, section: "playback"};
        const actions: ActionDeclaration<BezierHullsIds>[] = [
            ...(common.actions ?? []),
            {id: "next-step", label: message("next_step"), enabled: !atEnd && !this.isPlaying, ...playback},
            {id: "play", label: message("play"), enabled: true, pressed: this.isPlaying, ...playback},
            {id: "reset", label: message("reset"), enabled: step > 0 || this.isPlaying, ...playback},
        ];
        return {...common, legend, actions};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id === "curveA" || id === "curveB") {
            type Drawn = JXG.GeometryElement & {evalVisProp(name: string): unknown};
            const curve = this.hasBoard ? (this.board.objectsList as JXG.GeometryElement[]).find(object => object.name === `curve${id.slice(-1)}`) as Drawn | undefined : undefined;
            return curve ? {color: String(curve.evalVisProp("strokecolor")), visible: Boolean(curve.evalVisProp("visible"))} : {color: GraphPalette.primaryCurve, visible: false};
        }
        return super.drawnObject(id);
    }

    override performAction(id: string): void {
        if (id === "next-step") { runAs("learner", () => { this.nextStep(); }); return; }
        if (id === "play") { runAs("learner", () => { if (this.isPlaying) this.pause(); else this.play(); }); return; }
        if (id === "reset") { runAs("learner", () => { this.resetTrace(); }); return; }
        super.performAction(id);
    }

    /**
     * A fixed set of JSXGraph curves instead of one object per piece: per curve (A, B) and look, one curve for the hull rings and
     * one for the control polygons, the pieces of the group separated by NaN breaks (a PenUp in the SVG path, so a filled curve
     * fills each ring on its own). Each hull ring repeats its first vertex to close it; a segment hull is the 3-vertex ring
     * there and back, a point hull two equal vertices (a dot, with round caps). Empty groups are not drawn.
     * At step 0 the whole-curve hull and control polygon are the `hull` and `control` overlays' own, so they are not drawn twice.
     */
    /** The two whole-curve hulls as faint outlines; each border keeps its curve's colour and dash. */
    private drawContextHulls(model: PointSetModel): JXG.GeometryElement[] {
        const {a, b, degree} = this.curvePairNets(model);
        return ([["A", a], ["B", b]] as const).flatMap(([name, net]) => {
            const {strokeColor, dash} = this.curveStyle(name);
            const attributes = {...WHOLE_HULL_CONTEXT, borders: {...WHOLE_HULL_CONTEXT.borders, strokeColor, dash}};
            return this.drawHull(pieceHull(net, 0, degree).map(i => net[i]), name, model, attributes);
        });
    }

    protected override drawOverlay(id: CurvePairOverlayId | BezierHullsOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "hull" && this.step > 0 && this.overlayShown("pieces")) return this.drawContextHulls(model);
        if (id !== "pieces") return super.drawOverlay(id, model);
        const {a, b, degree} = this.curvePairNets(model);
        const run = this.runFor(model.points);
        const state = curvePairStateAt(run, Math.min(this.step, run.length - 1));
        const start = state.depth === 0;
        const withHull = !(start && this.overlayShown("hull"));
        const withControl = this.overlayShown("control") && !start;
        const split = state.phase === "split";
        return ([["A", a, 0], ["B", b, 1]] as const).flatMap(([name, net, curve]) => {
            const candidates = unique(state.candidates.map(pair => pair[curve]));
            const kept = new Set(state.kept.map(pair => pair[curve]));
            const pieces = curvePieces(net, state.depth);
            const groups: Record<PieceGroup, {piece: readonly HullPoint[]; depth: number}[]> = {candidate: [], parent: [], kept: [], faded: []};
            for (const i of candidates) groups[split ? "candidate" : kept.has(i) ? "kept" : "faded"].push({piece: pieces[i], depth: state.depth});
            // A split step shows the pieces about to be tested inside the pieces they halve.
            if (split) {
                const parentPieces = curvePieces(net, state.depth - 1);
                for (const i of unique(candidates.map(c => c >> 1))) groups.parent.push({piece: parentPieces[i], depth: state.depth - 1});
            }
            return (Object.keys(groups) as PieceGroup[]).flatMap(group => {
                const members = groups[group];
                if (members.length === 0) return [];
                const style = this.curveStyle(name);
                const common = {strokeColor: style.strokeColor, dash: style.dash, highlight: false, fixed: true, withLabel: false};
                const drawn: JXG.GeometryElement[] = [];
                if (withHull) {
                    const rings = members.map(({piece, depth}) => this.hullRing(piece, depth, degree, model));
                    drawn.push(this.curveOfRings(rings, {...common, layer: 2, ...GROUP_LOOKS[group], fillColor: style.strokeColor, linecap: "round",
                        name: pieceHullName(name, group)}));
                }
                const controlLook = GROUP_CONTROL_LOOKS[group];
                if (withControl && controlLook) {
                    const rings = members.map(({piece}) => piece.map(p => this.toBoard(p, model)));
                    drawn.push(this.curveOfRings(rings, {...common, ...controlLook, layer: 3, name: pieceControlName(name, group)}));
                }
                return drawn;
            });
        });
    }

    /** The closed ring of one piece's hull in board units, exact through `pieceHull`; a point hull is its vertex twice. */
    private hullRing(piece: readonly HullPoint[], depth: number, degree: number, model: PointSetModel): BoardPoint[] {
        const corners = pieceHull(piece, depth, degree).map(i => this.toBoard(piece[i], model));
        return corners.length === 1 ? [corners[0], corners[0]] : [...corners, corners[0]];
    }

    /** One curve through several polylines, separated by NaN breaks (no trailing break). */
    private curveOfRings(rings: readonly BoardPoint[][], attributes: Record<string, unknown>): JXG.GeometryElement {
        const xs: number[] = [];
        const ys: number[] = [];
        rings.forEach((ring, k) => {
            if (k > 0) { xs.push(NaN); ys.push(NaN); }
            for (const p of ring) { xs.push(p.x); ys.push(p.y); }
        });
        return this.board.create("curve", [xs, ys], attributes) as JXG.GeometryElement;
    }
}
