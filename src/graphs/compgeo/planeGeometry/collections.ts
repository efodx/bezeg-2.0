import type {PresetCollection} from "../../base/presets/PresetCollection";
import {eulerLineCollection} from "../eulerLinePresetCollection";
import {inscribedAngleCollection} from "../inscribedAnglePresetCollection";
import {inversionCollection} from "../inversionPresetCollection";
import {notablePointsCollection} from "../notablePointsPresetCollection";
import {simsonLineCollection} from "../simsonLinePresetCollection";

/** The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const planeGeometryCollections: readonly PresetCollection<unknown>[] = [
    notablePointsCollection, inscribedAngleCollection, eulerLineCollection, simsonLineCollection, inversionCollection,
];
