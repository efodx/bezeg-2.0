import type {PresetCollection} from '../../base/presets/PresetCollection';
import {kinematicsPresetCollection} from './kinematicsPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `kinematicsPresetCollection.ts` (not redefined
 * here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const kinematicsCollections: readonly PresetCollection<unknown>[] = [
    kinematicsPresetCollection(),
];
