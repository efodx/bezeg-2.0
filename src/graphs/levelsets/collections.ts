import type {PresetCollection} from '../base/presets/PresetCollection';
import {contourPresetCollection} from './contourPresetCollection';
import {lpPresetCollection} from './lpPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `contourPresetCollection.ts` and
 * `lpPresetCollection.ts` (not redefined here). `PresetImport.ts` spreads this list; it pulls in the state models only, no graph.
 */
export const levelSetsCollections: readonly PresetCollection<unknown>[] = [
    contourPresetCollection,
    lpPresetCollection,
];
