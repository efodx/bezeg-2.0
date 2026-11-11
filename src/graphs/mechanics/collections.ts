import type {PresetCollection} from '../base/presets/PresetCollection';
import {descentPresetCollection} from './descentPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `descentPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const mechanicsCollections: readonly PresetCollection<unknown>[] = [
    descentPresetCollection(),
];
