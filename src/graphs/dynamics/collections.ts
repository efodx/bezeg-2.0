import type {PresetCollection} from '../base/presets/PresetCollection';
import {logisticMapPresetCollection, phasePortraitPresetCollection} from './dynamicsPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `dynamicsPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const dynamicsCollections: readonly PresetCollection<unknown>[] = [
    phasePortraitPresetCollection(),
    logisticMapPresetCollection(),
];
