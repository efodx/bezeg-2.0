import type {PresetCollection} from '../base/presets/PresetCollection';
import {randomPresetCollection} from './randomPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `randomPresetCollection.ts` (not redefined here).
 * `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const randomCollections: readonly PresetCollection<unknown>[] = [
    randomPresetCollection(),
];
