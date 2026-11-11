import type {PresetCollection} from '../base/presets/PresetCollection';
import {isometryPresetCollection} from './isometryPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `isometryPresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const isometryCollections: readonly PresetCollection<unknown>[] = [
    isometryPresetCollection(),
];
