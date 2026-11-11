import type {PresetCollection} from '../base/presets/PresetCollection';
import {triangleSolverPresetCollection, unitCirclePresetCollection} from './trigPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `trigPresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in the state models only, no graph.
 */
export const trigCollections: readonly PresetCollection<unknown>[] = [
    unitCirclePresetCollection(), triangleSolverPresetCollection(),
];
