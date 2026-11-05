import {PointSetModel} from "../../compgeo/pointSetModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {bezierHullsPresetCollection} from "./bezierHullsPresetCollection";
import {bentleyOttmannCollection} from "./bentleyOttmannPresetCollection";
import {CURVE_PAIR_OVERLAY_IDS} from "./curvePairPresetCollection";
import {degenerateCollection} from "./degenerateSitesPresets";
import {delaunayCollection} from "./delaunayPresetCollection";
import {earClippingCollection} from "./earClippingPresetCollection";
import {fortuneCollection} from "./fortunePresetCollection";
import {hullRobustnessPresetCollection} from "./hullRobustnessPresetCollection";
import {hullTracePresetCollection} from "./hullTracePresetCollection";
import {intervalSweepCollection} from "./intervalSweepPresetCollection";
import {pointInPolygonPresetCollection} from "./pointInPolygonPresetCollection";
import {monotonePartitionCollection} from "./monotonePartitionPresetCollection";
import {monotoneTriangulationCollection} from "./monotoneTriangulationPresetCollection";
import {pointSetPresetCollection} from "./pointSetPresetCollection";
import {triangulationCollection} from "./triangulationPresetCollection";
import {voronoiCollection} from "./voronoiPresetCollection";

/**
 * The computational-geometry Demonstrations' Preset collections: module-level singletons (the Preset catalog test compares
 * identity and rejects shared collections), listed in `presetCollections` (`PresetImport.ts`). The keys are a file contract.
 * Each lists the overlay ids its graph offers and the point limit it enforces, so the graph classes read them from here.
 */
export const ORIENTATION_PRESET_KEY = "compgeo-orientation";
export const POLYGON_AREA_PRESET_KEY = "compgeo-polygon-area";

export const ORIENTATION_POINT_LIMIT = 3;
export const ORIENTATION_OVERLAY_IDS = ["grid", "turn", "values"] as const;
export const POLYGON_AREA_OVERLAY_IDS = ["grid", "fan", "lattice", "values"] as const;
export const HULL_TRACE_OVERLAY_IDS = ["grid", "trace", "hull"] as const;

export const orientationPresetCollection: PresetCollection<PointSetModel> =
    pointSetPresetCollection(ORIENTATION_PRESET_KEY, ORIENTATION_OVERLAY_IDS, {pointLimit: ORIENTATION_POINT_LIMIT});
export const polygonAreaPresetCollection: PresetCollection<PointSetModel> =
    pointSetPresetCollection(POLYGON_AREA_PRESET_KEY, POLYGON_AREA_OVERLAY_IDS);
/** The hull trace graph validates with the default point limit, as it always has. */
export const hullTraceCollection: PresetCollection<PointSetModel> = hullTracePresetCollection(HULL_TRACE_OVERLAY_IDS);

/** The robustness graph shows the hull trace's overlays and stores its own mode, rule and cell fields. */
export const hullRobustnessCollection: PresetCollection<PointSetModel> = hullRobustnessPresetCollection(HULL_TRACE_OVERLAY_IDS);

/** The Bezier hulls graph's overlays: the curve pair's own and the piece hulls (convexity task 27). */
export const BEZIER_HULLS_OVERLAY_IDS = [...CURVE_PAIR_OVERLAY_IDS, "pieces"] as const;

/** The Bezier hulls graph's collection, key `compgeo-bezier-hulls`: the curve pair model plus the validated `step`. */
export const bezierHullsCollection: PresetCollection<PointSetModel> = bezierHullsPresetCollection(BEZIER_HULLS_OVERLAY_IDS);

export const compgeoPresetCollections = [orientationPresetCollection, polygonAreaPresetCollection, hullTraceCollection,
    pointInPolygonPresetCollection, hullRobustnessCollection, bezierHullsCollection,
    earClippingCollection, intervalSweepCollection, bentleyOttmannCollection, triangulationCollection, delaunayCollection,
    monotonePartitionCollection, monotoneTriangulationCollection, voronoiCollection, degenerateCollection, fortuneCollection] as const;
