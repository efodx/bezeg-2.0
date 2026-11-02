import {PointSetModel} from "../../compgeo/pointSetModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {
    MONOTONE_PARTITION_EXAMPLE_1, MONOTONE_PARTITION_EXAMPLE_2, MONOTONE_PARTITION_OVERLAY_IDS, monotonePartitionPresetCollection,
} from "./monotonePartitionPresetCollection";

/** The file contract key of the monotone triangulation graph's own Preset collection. Not registered in `presetCollections`: the route that first uses the graph does that. */
export const MONOTONE_TRIANGULATION_PRESET_KEY = "compgeo-monotone-triangulation";
export const MONOTONE_TRIANGULATION_OVERLAY_IDS = MONOTONE_PARTITION_OVERLAY_IDS;

/** The two examples of spec C3 (task 17 item 6): a split vertex, and two merge vertices with no split. */
export const MONOTONE_TRIANGULATION_EXAMPLE_1: PointSetModel = MONOTONE_PARTITION_EXAMPLE_1;
export const MONOTONE_TRIANGULATION_EXAMPLE_2: PointSetModel = MONOTONE_PARTITION_EXAMPLE_2;

/**
 * A polygon that is already y-monotone (all heights differ), counter-clockwise, simple, no three consecutive vertices
 * collinear: the top (5,9) and the bottom (4,0) are joined by a left chain (1,8), (3,6), (0,5) and a right chain
 * (9,7), (6,4), (8,2). Its vertices (3,6) and (6,4) are reflex and each is followed by a vertex of its own
 * chain, so the visibility test runs on both chains. The partition adds no diagonal and finds one piece.
 */
export const MONOTONE_TRIANGULATION_EXAMPLE_3: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0,
    points: [[4, 0], [8, 2], [6, 4], [9, 7], [5, 9], [1, 8], [3, 6], [0, 5]].map(([x, y]) => ({x, y})),
};

/** The same checks as the monotone partition graph's Preset collection, under the triangulation graph's own key. */
export const monotoneTriangulationCollection: PresetCollection<PointSetModel> =
    monotonePartitionPresetCollection(MONOTONE_TRIANGULATION_OVERLAY_IDS, MONOTONE_TRIANGULATION_PRESET_KEY);
