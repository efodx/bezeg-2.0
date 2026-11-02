import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {VoronoiExampleId} from "./VoronoiControls";
import {type VoronoiMode, voronoiPresetCollection} from "./voronoiPresetCollection";

/** The file contract key of the degenerate-sites Preset collection (not yet listed in `presetCollections`: no route uses it). */
export const DEGENERATE_PRESET_KEY = "compgeo-voronoi-degenerate";

export interface DegenerateExample {
    readonly points: readonly GridPoint[];
    readonly mode: VoronoiMode;
}

/**
 * The B5 examples (grid units, coordinates derived and checked with `incircleValue`, task 20). Sites are listed so that the
 * first three are counter-clockwise; the readout does not depend on it.
 * - `square`: the unit square; the determinant is 0.
 * - `trapezoid`: the symmetric trapezoid of the spec; the determinant is 0.
 * - `near`: four points one grid step off a circle of radius 5 (the determinant is -30); moving P4 from (1, -5) to (0, -5) puts it on
 *   the circle (determinant 0).
 * - `collinear`: five sites on the line y = x / 2, in `sites` mode.
 */
export const DEGENERATE_EXAMPLES: Readonly<Record<VoronoiExampleId, DegenerateExample>> = Object.freeze({
    square: {points: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}], mode: "four-point"},
    trapezoid: {points: [{x: 0, y: 0}, {x: 8, y: 0}, {x: 9, y: 5}, {x: -1, y: 5}], mode: "four-point"},
    near: {points: [{x: 5, y: 0}, {x: 3, y: 4}, {x: -4, y: 3}, {x: 1, y: -5}], mode: "four-point"},
    collinear: {points: [{x: -4, y: -2}, {x: -2, y: -1}, {x: 0, y: 0}, {x: 2, y: 1}, {x: 4, y: 2}], mode: "sites"},
});

/** The Preset data of an example: sites on the unit grid, points mode. */
export function degenerateExampleModel(id: VoronoiExampleId): PointSetModel {
    return serializePointSetModel({mode: "points", points: DEGENERATE_EXAMPLES[id].points, closed: false, gridStepExponent: 0});
}

/** The degenerate-sites Preset collection: the Voronoi collection under its own key (the `mode` field is validated there). */
export const degenerateCollection: PresetCollection<PointSetModel> = voronoiPresetCollection(DEGENERATE_PRESET_KEY);
