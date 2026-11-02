import {message, Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetPresetCollection} from "./pointSetPresetCollection";
import {TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_MAX_POINTS} from "./triangulationPresetCollection";
import {parseRationalText} from "./voronoiConstruction";

/**
 * The file contract key of the Voronoi graph's Preset collection. Not yet listed in `presetCollections` (`PresetImport.ts`):
 * that registration belongs to the route that first uses the graph (task 19 is F2a, no route).
 */
export const VORONOI_PRESET_KEY = "compgeo-voronoi";
export const VORONOI_OVERLAY_IDS = ["grid", "delaunay"] as const;
export const VORONOI_MAX_POINTS = TRIANGULATION_MAX_POINTS;

/** The B2/B4 example: the seven points (grid units). */
export const VORONOI_EXAMPLE: PointSetModel = TRIANGULATION_EXAMPLE_POINTS;
export const VORONOI_EXAMPLE_POINTS: readonly GridPoint[] = VORONOI_EXAMPLE.points;

/** A query point, exact, in grid units: each coordinate is an integer or `num/den` text. */
export interface VoronoiQuery {
    readonly x: string;
    readonly y: string;
}

/** The query point a fresh scene starts with: inside the cell of the example's sixth site (index 5, "P6"). */
export const VORONOI_DEFAULT_QUERY: VoronoiQuery = Object.freeze({x: "4", y: "2"});

const validQuery = (value: unknown): boolean =>
    isRecord(value) && Object.keys(value).length === 2
    && typeof value.x === "string" && typeof value.y === "string"
    && parseRationalText(value.x) !== undefined && parseRationalText(value.y) !== undefined;

/**
 * The Voronoi graph's Preset collection: the point-set collection (points, 40 at most, integer range, points mode only is the
 * graph's, see `check`) with its overlay switches. `graphState` may also carry the selected site (`cellSite`, an integer or
 * null), the construction count (`construction`, a non-negative integer) and the query point (`query`); a stale site or count
 * is clamped on restore, not rejected. The diagram is derived and never stored.
 */
export function voronoiPresetCollection(): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(VORONOI_PRESET_KEY, VORONOI_OVERLAY_IDS, {pointLimit: VORONOI_MAX_POINTS});
    return Object.freeze({
        key: VORONOI_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {cellSite, construction, query, ...rest} = graphState;
            if (cellSite !== undefined && cellSite !== null && !Number.isInteger(cellSite)) return message("vor_invalid_state");
            if (construction !== undefined && !(typeof construction === "number" && Number.isInteger(construction) && construction >= 0)) return message("vor_invalid_state");
            if (query !== undefined && !validQuery(query)) return message("vor_invalid_state");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const checked = base.check(data);
            if ("rejection" in checked) return checked;
            return checked.data.mode === "points" ? checked : {rejection: message("vor_invalid_mode")};
        },
    });
}

export const voronoiCollection: PresetCollection<PointSetModel> = voronoiPresetCollection();
