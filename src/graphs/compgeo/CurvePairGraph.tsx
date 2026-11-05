import {t, message} from "../../localization";
import {bezierAt, splitCurvePair} from "../../compgeo/curvePairNets";
import {pieceHull} from "../../compgeo/curvePairSubdivision";
import {SWEEP_COORD_LIMIT} from "../../compgeo/sweep/limits";
import {gridToBoard, PointSetMode, PointSetModel, PointSetOptions} from "../../compgeo/pointSetModel";
import type {GridPoint} from "../../compgeo/grid";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

export const CURVE_PAIR_PRESET_KEY = "compgeo-curve-pair";

/** The crossing pair of task 24: two quadratics that meet twice. Net A, then net B. */
export const CURVE_PAIR_CROSSING: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0,
    points: [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]].map(([x, y]) => ({x, y})),
};

/** Each curve is drawn as a polyline through this many equal-parameter steps of its exact de Casteljau evaluation. */
export const CURVE_PAIR_SAMPLES = 96;

export type CurvePairOverlayId = "control" | "hull";
export const CURVE_PAIR_OVERLAY_IDS = ["grid", "control", "hull"] as const;

/** Which of the two curves: A is solid, B is dashed, so colour is not the only difference. */
export type CurveName = "A" | "B";

/** True when `model` is a pair of Bezier nets of degree 2 or 3 in points mode: 6 or 8 points. */
export function isCurvePairModel(model: PointSetModel): boolean {
    return model.mode === "points" && !model.closed && splitCurvePair(model.points) !== undefined;
}

/**
 * The Preset collection of a curve pair graph: the point-set checks (grid coordinates within 2^10) plus the shape of the pair.
 * Not yet listed in `compgeoPresetCollections` (task 27 registers the route that uses it).
 */
export function curvePairPresetCollection(overlayIds: readonly string[], options: PointSetOptions = {}): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(CURVE_PAIR_PRESET_KEY, overlayIds, options);
    return Object.freeze({
        ...base,
        check(data: unknown) {
            const checked = base.check(data);
            if ("data" in checked && !isCurvePairModel(checked.data)) return {rejection: message("curvepair_invalid_point_count")};
            return checked;
        },
    });
}

const CURVE_PAIR_COLLECTION = curvePairPresetCollection(CURVE_PAIR_OVERLAY_IDS, {pointLimit: 8, coordinateLimit: SWEEP_COORD_LIMIT});

/**
 * Two Bezier curves of the same degree on the grid (convexity task 25, spec A6; the Curves D2 clipping graph reuses it).
 * `model.points` holds net A and then net B, so the degree is `points.length / 2 - 1` and the scene state is the point-set
 * state unchanged. The point count is fixed at 6 or 8 (`fixesPointCount`); coordinates are limited to 2^10.
 *
 * Board: both curves (A solid, B dashed; points named A_0.., B_0..) are `drawModelObjects`, always shown, evaluated exactly
 * by de Casteljau from the grid points at CURVE_PAIR_SAMPLES + 1 parameters (fixed arrays, like every overlay's data). Overlays `control` (the two control polygons) and `hull` (the hull of each whole curve,
 * the exact hull of its net) are rebuilt from the model like every overlay. All board units are grid * 2^gridStepExponent.
 *
 * For a subclass (the `pieces` overlay of task 25b, D2): the type parameter adds overlay ids; `curvePairNets(model)`, `toBoard`,
 * `drawControlPolygon` and `drawHull` are the building blocks, and `curveStyle(name)` the shared look. A subclass that adds
 * overlays overrides `overlayIds()` (spread `super.overlayIds()`), `overlayLabel` and `drawOverlay` (fall through to `super`),
 * and `presetCollection()` with `curvePairPresetCollection(ids, ...)`.
 */
export class CurvePairGraph<Extra extends string = never> extends PointSetGraph<CurvePairOverlayId | Extra> {
    constructor(options: PointSetOptions = {}) {
        super({...options, pointLimit: 8, coordinateLimit: SWEEP_COORD_LIMIT});
    }

    override getInitialState(): PointSetGraphState {
        return {...super.getInitialState(), overlays: {control: true, hull: true}};
    }

    // ---- Model ---------------------------------------------------------------------------------------------------

    /** The curve pair is always in points mode; the other modes are refused and not offered. */
    override setPointSetMode(_mode: PointSetMode): boolean {
        return false;
    }

    /** Rejects (throws, changes nothing) a model that is not a pair of nets of degree 2 or 3; the caller has checked the grid and the limit. */
    override loadModel(model: PointSetModel): void {
        if (!isCurvePairModel(model)) throw new RangeError(`A curve pair needs 6 or 8 points in points mode, got ${model.points.length} in ${model.mode} mode.`);
        super.loadModel(model);
    }

    protected override fixesPointCount(): boolean {
        return true;
    }

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return CURVE_PAIR_COLLECTION;
    }

    override defaultPreset(): PointSetModel {
        return {...CURVE_PAIR_CROSSING, points: CURVE_PAIR_CROSSING.points.map(p => ({x: p.x, y: p.y}))};
    }

    /** The crossing pair (x 0 to 4, y -1 to 4) with a one-unit margin. */
    protected override initialView(): [number, number, number, number] {
        return [-1, 5, 5, -2];
    }

    protected override pointName(index: number): string {
        const half = this.model.points.length / 2;
        return index < half ? `A_${index}` : `B_${index - half}`;
    }

    /** The inspector rows and their accessible names read A_0, A_1, ... B_2 like the board labels. */
    protected override pointLabel(): (index: number) => string {
        return index => this.pointName(index);
    }

    // ---- Drawing -------------------------------------------------------------------------------------------------

    /** Nets A and B of the model, and the degree. */
    protected curvePairNets(model: PointSetModel) {
        const nets = splitCurvePair(model.points);
        if (!nets) throw new RangeError("not a curve pair");
        return nets;
    }

    /** A point in grid units (a net point or a hull vertex) in board units. */
    protected toBoard(point: {readonly x: number; readonly y: number}, model: PointSetModel): {x: number; y: number} {
        return gridToBoard(point, model.gridStepExponent);
    }

    /** The shared look: A solid in the curve green, B dashed (JSXGraph dash style 2) in the construction accent. */
    protected curveStyle(name: CurveName): {strokeColor: string; dash: number} {
        return name === "A" ? {strokeColor: GraphPalette.primaryCurve, dash: 0} : {strokeColor: GraphPalette.constructionAccent, dash: 2};
    }

    protected override drawModelObjects(model: PointSetModel): JXG.GeometryElement[] {
        const {a, b} = this.curvePairNets(model);
        return ([["A", a], ["B", b]] as const).map(([name, net]) => {
            const scaled = net.map(p => this.toBoard(p, model));
            const samples = Array.from({length: CURVE_PAIR_SAMPLES + 1}, (_, i) => bezierAt(scaled, i / CURVE_PAIR_SAMPLES));
            return this.board.create("curve", [samples.map(p => p.x), samples.map(p => p.y)], {
                ...this.curveStyle(name), strokeWidth: 3, highlight: false, fixed: true, layer: 5, name: `curve${name}`, withLabel: false,
            }) as JXG.GeometryElement;
        });
    }

    protected override overlayIds(): readonly (CurvePairOverlayId | Extra | "grid")[] {
        return CURVE_PAIR_OVERLAY_IDS;
    }

    protected override overlayLabel(id: CurvePairOverlayId | Extra | "grid"): string {
        if (id === "control") return t("control_polygons");
        if (id === "hull") return t("hulltrace_overlay_hull");
        return super.overlayLabel(id);
    }

    protected override drawOverlay(id: CurvePairOverlayId | Extra | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id !== "control" && id !== "hull") return super.drawOverlay(id, model);
        const {a, b, degree} = this.curvePairNets(model);
        return ([["A", a], ["B", b]] as const).flatMap(([name, net]) => id === "control"
            ? [this.drawControlPolygon(net, name, model)]
            : this.drawHull(pieceHull(net, 0, degree).map(i => net[i]), name, model));
    }

    /** The control polygon of a net: a thin polyline through its points, in the curve's colour and dash. */
    protected drawControlPolygon(net: readonly GridPoint[], name: CurveName, model: PointSetModel): JXG.GeometryElement {
        const corners = net.map(p => this.toBoard(p, model));
        return this.board.create("curve", [corners.map(c => c.x), corners.map(c => c.y)], {
            ...this.curveStyle(name), strokeWidth: 1.5, strokeOpacity: 0.7, highlight: false, fixed: true, layer: 3,
        }) as JXG.GeometryElement;
    }

    /**
     * A convex hull given by its vertices in order (grid units, or the dyadic units of a piece): a filled polygon for three or
     * more, a segment for two, nothing for one. The outline keeps the curve's dash; `attributes` override the look (a later slice
     * fades or unfills pieces).
     */
    protected drawHull(vertices: readonly {readonly x: number; readonly y: number}[], name: CurveName, model: PointSetModel,
                       attributes: Record<string, unknown> = {}): JXG.GeometryElement[] {
        if (vertices.length < 2) return [];
        const corners = vertices.map(p => this.toBoard(p, model));
        const style = this.curveStyle(name);
        if (corners.length === 2) {
            return [this.board.create("curve", [corners.map(c => c.x), corners.map(c => c.y)], {
                ...style, strokeWidth: 2.5, highlight: false, fixed: true, layer: 2, ...attributes,
            }) as JXG.GeometryElement];
        }
        return [this.board.create("polygon", corners.map(c => [c.x, c.y]), {
            vertices: {visible: false}, highlight: false, fixed: true, layer: 2, fillColor: style.strokeColor, fillOpacity: 0.12,
            borders: {strokeColor: style.strokeColor, strokeWidth: 2.5, dash: style.dash, highlight: false, fixed: true}, ...attributes,
        }) as JXG.GeometryElement];
    }
}
