import {message, Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {PointSetExtension, PointSetExtraField, PointSetExtras} from "./pointSetPersistence";
import {pointSetPresetCollection} from "./pointSetPresetCollection";
import {TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_MAX_POINTS} from "./triangulationPresetCollection";
import {parseRationalText} from "./voronoiConstruction";

/**
 * The file contract key of the Voronoi graph's Preset collection. Not yet listed in `presetCollections` (`PresetImport.ts`):
 * that registration belongs to the route that first uses the graph (task 19 is F2a, no route).
 */
export const VORONOI_PRESET_KEY = "compgeo-voronoi";
export const VORONOI_OVERLAY_IDS = ["grid", "diagram", "delaunay"] as const;
/** The modes of the scene field `mode`: any number of sites (the default), or exactly four (the incircle readout of B5). */
export const VORONOI_MODES = ["sites", "four-point"] as const;
export type VoronoiMode = typeof VORONOI_MODES[number];
export const FOUR_POINT_SITES = 4;
export const isVoronoiMode = (value: unknown): value is VoronoiMode => VORONOI_MODES.some(mode => mode === value);
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
 * is clamped on restore, not rejected. The optional `mode` is `sites` (default) or `four-point`; any other value is refused with
 * an actionable message. The diagram is derived and never stored.
 */
export function voronoiPresetCollection(key: string = VORONOI_PRESET_KEY): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(key, VORONOI_OVERLAY_IDS, {pointLimit: VORONOI_MAX_POINTS});
    return Object.freeze({
        key,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {cellSite, construction, query, mode, ...rest} = graphState;
            if (mode !== undefined && !isVoronoiMode(mode)) return message("deg_invalid_mode");
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

// ---- The scene fields of the persisted state ----------------------------------------------------------------------

/** A stored site as a site of `sites` points, else none. */
export const storedSite = (value: unknown, sites: number): number | null =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < sites ? value : null;
/** A stored bisector count within `0..total`; anything else 0. */
export const storedCount = (value: unknown, total: number): number =>
    typeof value === "number" && Number.isInteger(value) ? Math.max(0, Math.min(total, value)) : 0;
export const storedMode = (value: unknown): VoronoiMode => (isVoronoiMode(value) ? value : "sites");
/** A stored query whose coordinates are rational texts, else the default query. */
export const storedQuery = (value: unknown): VoronoiQuery => {
    const record: {x?: unknown; y?: unknown} = typeof value === "object" && value !== null ? value : {};
    const ok = typeof record.x === "string" && typeof record.y === "string"
        && parseRationalText(record.x) !== undefined && parseRationalText(record.y) !== undefined;
    return ok ? {x: String(record.x), y: String(record.y)} : VORONOI_DEFAULT_QUERY;
};

const cellSiteField: PointSetExtraField = {
    name: "cellSite", fallback: null, resetOnBareImport: true,
    parse: value => value === null || (typeof value === "number" && Number.isInteger(value)) ? value : undefined,
};
const constructionField: PointSetExtraField = {
    name: "construction", fallback: 0, resetOnBareImport: true,
    parse: value => typeof value === "number" && Number.isInteger(value) ? value : undefined,
};
const queryField: PointSetExtraField = {
    name: "query", fallback: VORONOI_DEFAULT_QUERY, resetOnBareImport: true,
    parse: value => validQuery(value) ? storedQuery(value) : undefined,
};
const modeField: PointSetExtraField = {
    name: "mode", fallback: "sites",
    parse: value => isVoronoiMode(value) ? value : undefined,
};

/**
 * The Voronoi graphs' declared scene fields beyond `initialized`, `model` and `overlays`, as `voronoiPresetCollection` permits
 * them: the chosen site, the construction count, the query point and the mode. A stored `graphState` that omits a field gets the
 * fresh scene's (no site, count 0, the default query, mode `sites`), never the preceding scene's; a Preset without a
 * `graphState` starts from the graph's initial state (`PointSetGraph.storedSource`), so degenerate sites start in four-point mode.
 * `settle` bounds the fields by the sites: a stale site is none, the count lies within the other sites, and four-point mode needs
 * exactly `FOUR_POINT_SITES` sites (backward compatibility: a four-point Preset with another count loads in `sites` mode). A bare
 * data import resets the site, the count and the query and keeps the mode (`resetOnBareImport`).
 */
export const voronoiPersistenceExtension: PointSetExtension = Object.freeze({
    fields: [cellSiteField, constructionField, queryField, modeField],
    settle(model: PointSetModel, values: PointSetExtras): PointSetExtras {
        const sites = model.points.length;
        const site = storedSite(values.cellSite, sites);
        return {
            cellSite: site,
            construction: site === null ? 0 : storedCount(values.construction, sites - 1),
            query: storedQuery(values.query),
            mode: values.mode === "four-point" && sites === FOUR_POINT_SITES ? "four-point" : "sites",
        };
    },
});
