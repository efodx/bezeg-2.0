import type {PresetCollection} from '../base/presets/PresetCollection';
import {growthPresetCollection, recursionCobwebPresetCollection} from './recursionPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `recursionPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const recursionCollections: readonly PresetCollection<unknown>[] = [
    recursionCobwebPresetCollection(),
    growthPresetCollection(),
];
