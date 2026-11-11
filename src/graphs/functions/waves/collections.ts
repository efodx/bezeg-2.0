import type {PresetCollection} from '../../base/presets/PresetCollection';
import {wavesPresetCollection} from './wavesPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `wavesPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const wavesCollections: readonly PresetCollection<unknown>[] = [
    wavesPresetCollection(),
];
