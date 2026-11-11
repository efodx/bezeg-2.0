import type {PresetCollection} from '../base/presets/PresetCollection';
import {countingTreePresetCollection, latticePathsPresetCollection} from './combinatoricsPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `combinatoricsPresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const combinatoricsCollections: readonly PresetCollection<unknown>[] = [
    latticePathsPresetCollection(),
    countingTreePresetCollection(),
];
