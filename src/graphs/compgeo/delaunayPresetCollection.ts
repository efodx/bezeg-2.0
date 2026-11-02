import {message, Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {
    TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_MAX_POINTS, TRIANGULATION_OVERLAY_IDS, TRIANGULATION_T0, TriangulationPresetData,
    triangulationPresetCollection,
} from "./triangulationPresetCollection";

/** The file contract key of the Delaunay graph's own Preset collection. Listed in `presetCollections` through compgeoPresetCollections. */
export const DELAUNAY_PRESET_KEY = "compgeo-delaunay";
export const DELAUNAY_OVERLAY_IDS = TRIANGULATION_OVERLAY_IDS;
export const DELAUNAY_MAX_POINTS = TRIANGULATION_MAX_POINTS;

const grid = (points: number[][]): GridPoint[] => points.map(([x, y]) => ({x, y}));
const model = (points: GridPoint[]): PointSetModel => ({mode: "points", closed: false, gridStepExponent: 0, points});
const withTriangles = (points: PointSetModel, triangles: readonly (readonly number[])[]): TriangulationPresetData =>
    ({...points, points: points.points.map(p => ({x: p.x, y: p.y})), triangles: triangles.map(tri => [...tri])});

/** Spec B3 example 1: a, b, c, d with the diagonal ac (illegal: the incircle determinant is +64). */
export const DELAUNAY_QUAD = model(grid([[0, 0], [4, 0], [5, 3], [0, 2]]));
/** The unit square, four cocircular points: both diagonals are legal and the triangulation is not unique. */
export const DELAUNAY_SQUARE = model(grid([[0, 0], [1, 0], [1, 1], [0, 1]]));

/** The three Presets of the graph, in the order of the example buttons. The first is the default. */
export const DELAUNAY_EXAMPLES: readonly {readonly id: "quad" | "seven" | "square"; readonly data: TriangulationPresetData}[] = [
    {id: "quad", data: withTriangles(DELAUNAY_QUAD, [[0, 1, 2], [0, 2, 3]])},
    {id: "seven", data: withTriangles(TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_T0)},
    {id: "square", data: withTriangles(DELAUNAY_SQUARE, [[0, 1, 2], [0, 2, 3]])},
];

/**
 * The Delaunay graph's Preset collection: the triangulation collection (points plus the starting triangle list) under its own
 * key, and `graphState.step`, the trace step (any finite number; a stale step is clamped on restore, not rejected). Playback
 * status is never part of a Preset.
 */
export function delaunayPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = triangulationPresetCollection(overlayIds, DELAUNAY_PRESET_KEY);
    return Object.freeze({
        key: DELAUNAY_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("del_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}

export const delaunayCollection: PresetCollection<PointSetModel> = delaunayPresetCollection(DELAUNAY_OVERLAY_IDS);
