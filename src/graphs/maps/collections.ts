import type {PresetCollection} from "../base/presets/PresetCollection";
import {complexReciprocalPresetCollection} from "../complex/complexReciprocalPresets";
import {complexRootsPresetCollection} from "../complex/complexRootsPresets";
import {linearMapPresetCollection} from "../linear/linearMapPresetCollection";

/** The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const mapsCollections: readonly PresetCollection<unknown>[] = [
    linearMapPresetCollection, complexReciprocalPresetCollection, complexRootsPresetCollection,
];
