import type {PresetCollection} from '../../base/presets/PresetCollection';
import {circleConstructionPresetCollection} from './circleConstructionPresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `circleConstructionPresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in the state model only, no graph.
 */
export const circleConstructionCollections: readonly PresetCollection<unknown>[] = [
    circleConstructionPresetCollection(),
];
