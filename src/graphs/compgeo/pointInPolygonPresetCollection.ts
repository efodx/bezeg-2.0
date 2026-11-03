import {message, Message} from "../../localization";
import {isGridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/**
 * The file contract key of the point-in-polygon graph's Preset collection. Like the other convexity graphs it is not yet listed in
 * `compgeoPresetCollections` / `presetCollections`: the route that first uses the graph (task 20) registers it.
 */
export const POINT_IN_POLYGON_PRESET_KEY = "compgeo-point-in-polygon";
export const POINT_IN_POLYGON_OVERLAY_IDS = ["grid", "ray", "winding", "values"] as const;

/**
 * `data` is the polygon, checked like any point set. `graphState` adds the query point `query` (grid coordinates, integers within the
 * grid limit; anything else is rejected) next to `initialized` and `overlays`.
 */
export const pointInPolygonPresetCollection: PresetCollection<PointSetModel> = (() => {
    const base = pointSetPresetCollection(POINT_IN_POLYGON_PRESET_KEY, POINT_IN_POLYGON_OVERLAY_IDS);
    return Object.freeze({
        key: POINT_IN_POLYGON_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {query, ...rest} = graphState;
            if (query !== undefined && !isGridPoint(query)) return message("invalid_value", {value0: "query"});
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
})();
