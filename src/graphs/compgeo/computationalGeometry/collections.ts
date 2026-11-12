import type {PresetCollection} from "../../base/presets/PresetCollection";
import {
    bezierHullsCollection, hullRobustnessCollection, hullTraceCollection, orientationPresetCollection,
    polygonAreaPresetCollection,
} from "../compgeoPresetCollections";
import {bentleyOttmannCollection} from "../bentleyOttmannPresetCollection";
import {degenerateCollection} from "../degenerateSitesPresets";
import {delaunayCollection} from "../delaunayPresetCollection";
import {earClippingCollection} from "../earClippingPresetCollection";
import {fortuneCollection} from "../fortunePresetCollection";
import {intervalSweepCollection} from "../intervalSweepPresetCollection";
import {monotonePartitionCollection} from "../monotonePartitionPresetCollection";
import {monotoneTriangulationCollection} from "../monotoneTriangulationPresetCollection";
import {pointInPolygonPresetCollection} from "../pointInPolygonPresetCollection";
import {triangulationCollection} from "../triangulationPresetCollection";
import {voronoiCollection} from "../voronoiPresetCollection";

/** The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const computationalGeometryCollections: readonly PresetCollection<unknown>[] = [
    orientationPresetCollection, polygonAreaPresetCollection, hullTraceCollection, pointInPolygonPresetCollection,
    hullRobustnessCollection, bezierHullsCollection, earClippingCollection, triangulationCollection, delaunayCollection,
    voronoiCollection, degenerateCollection, intervalSweepCollection, bentleyOttmannCollection, monotonePartitionCollection,
    monotoneTriangulationCollection, fortuneCollection,
];
