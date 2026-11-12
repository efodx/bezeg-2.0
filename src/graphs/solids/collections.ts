import type {PresetCollection} from '../base/presets/PresetCollection';
import {solidsPresetCollection} from './solidsPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definition in `solidsPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const solidsCollections: readonly PresetCollection<unknown>[] = [
    solidsPresetCollection,
];
