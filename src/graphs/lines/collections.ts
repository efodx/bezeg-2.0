import type {PresetCollection} from '../base/presets/PresetCollection';
import {lineGeometryPresetCollection} from './linePresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `linePresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const lineCollections: readonly PresetCollection<unknown>[] = [
    lineGeometryPresetCollection(),
];
