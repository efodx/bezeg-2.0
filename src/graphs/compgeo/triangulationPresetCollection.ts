import {message, Message} from "../../localization";
import {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {createTriangulation} from "../../compgeo/triangulation";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the triangulation graph's own Preset collection. Not yet listed in `presetCollections`: the route that first uses the graph does that. */
export const TRIANGULATION_PRESET_KEY = "compgeo-triangulation";
export const TRIANGULATION_MAX_POINTS = 40;
export const TRIANGULATION_OVERLAY_IDS = ["grid", "triangulation", "edges", "angles"] as const;

/** Preset data of this graph: the points as a point-set model plus the triangle list (point indices, counter-clockwise). */
export type TriangulationPresetData = PointSetModel & {readonly triangles?: readonly (readonly number[])[]};

const grid = (points: number[][]): GridPoint[] => points.map(([x, y]) => ({x, y}));
const pointsMode = (points: number[][]): PointSetModel => ({mode: "points", closed: false, gridStepExponent: 0, points: grid(points)});

/** The B2 example (spec): n = 7, hull k = 5. */
export const TRIANGULATION_EXAMPLE_POINTS: PointSetModel = pointsMode([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
/** The starting triangulation T0 of the B2 example, by point index (counter-clockwise). */
export const TRIANGULATION_T0: readonly (readonly number[])[] = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];
/** The Delaunay triangulation of the same points (spec B3, example 2). */
export const TRIANGULATION_DELAUNAY: readonly (readonly number[])[] = [[0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 6], [3, 4, 5], [3, 5, 6]];
/** The nine points of the hull lesson (sample 1): k = 6 with one collinear boundary point, so 10 triangles. */
export const TRIANGULATION_NINE_POINTS: PointSetModel = pointsMode([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]]);
/** Their triangulation by the starting rule (`incrementalTriangulation`). */
export const TRIANGULATION_NINE_POINTS_TRIANGLES: readonly (readonly number[])[] = [[5, 2, 8], [2, 7, 8], [7, 0, 8], [8, 0, 5], [0, 4, 5], [7, 6, 0], [0, 6, 4], [7, 1, 6], [6, 1, 4], [1, 3, 4]];

const withTriangles = (model: PointSetModel, triangles: readonly (readonly number[])[]): TriangulationPresetData =>
    ({...model, points: model.points.map(p => ({x: p.x, y: p.y})), triangles: triangles.map(tri => [...tri])});

/** The three Presets the collection ships as examples: T0, the Delaunay triangulation, and the nine hull-lesson points. */
export const TRIANGULATION_EXAMPLES: readonly {readonly id: "t0" | "delaunay" | "nine-points"; readonly data: TriangulationPresetData}[] = [
    {id: "t0", data: withTriangles(TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_T0)},
    {id: "delaunay", data: withTriangles(TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_DELAUNAY)},
    {id: "nine-points", data: withTriangles(TRIANGULATION_NINE_POINTS, TRIANGULATION_NINE_POINTS_TRIANGLES)},
];

/** A list of integer triples, or undefined. */
export function parseTriangleList(value: unknown): number[][] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out: number[][] = [];
    for (const item of value) {
        if (!Array.isArray(item) || item.length !== 3 || !item.every(Number.isInteger)) return undefined;
        out.push(item.map(Number));
    }
    return out;
}

/**
 * The reason `triangles` is not a valid counter-clockwise triangulation of `points`, or undefined when it is valid. A scene
 * whose points allow no triangulation (duplicates, all collinear, under three) is saved with an empty list, which is valid then.
 */
export function triangulationRejection(points: readonly GridPoint[], triangles: readonly (readonly number[])[]): Message | undefined {
    const result = createTriangulation(points, triangles);
    if (result.ok) return undefined;
    const {refusal} = result;
    switch (refusal.kind) {
        case "duplicate-point":
        case "degenerate-points":
        case "invalid-point":
            return triangles.length === 0 ? undefined : message("tri_invalid_triangulation");
        case "index-out-of-range": return message("tri_invalid_index", {value0: refusal.triangle + 1, value1: points.length - 1});
        case "not-counter-clockwise": return message("tri_invalid_clockwise", {value0: refusal.triangle + 1});
        default: return message("tri_invalid_triangulation");
    }
}

/**
 * The triangulation graph's Preset collection. `data` is the point set (points mode only, at most 40 points, integer
 * coordinates in range, checked like any point set) plus `triangles`, which must be a valid counter-clockwise triangulation of
 * the stored points. `graphState` carries only the overlay switches: the triangle list is stored once, in `data`.
 */
export function triangulationPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(TRIANGULATION_PRESET_KEY, overlayIds, {pointLimit: TRIANGULATION_MAX_POINTS});
    return Object.freeze({
        key: TRIANGULATION_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            return base.checkGraphState?.(graphState);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            if (!isRecord(data)) return base.check(data);
            if (data.mode !== undefined && data.mode !== "points") return {rejection: message("tri_invalid_mode")};
            const {triangles, ...rest} = data;
            const checked = base.check(rest);
            if (!("data" in checked)) return checked;
            const list = parseTriangleList(triangles);
            if (list === undefined) return {rejection: message("tri_invalid_triangles")};
            const rejection = triangulationRejection(checked.data.points, list);
            if (rejection) return {rejection};
            const stored: TriangulationPresetData = {...checked.data, triangles: list};
            return {data: stored};
        },
    });
}

export const triangulationCollection: PresetCollection<PointSetModel> = triangulationPresetCollection(TRIANGULATION_OVERLAY_IDS);
