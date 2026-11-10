import type {PresetCollection} from '../base/presets/PresetCollection';
import {
    crossRatioPresetCollection, fivePointPresetCollection, pascalPresetCollection, polePolarPresetCollection, threeViewsPresetCollection,
} from './projectivePresetCollection';

/**
 * The family's Preset collections, referenced from their canonical definitions in `projectivePresetCollection.ts` (not
 * redefined here). `PresetImport.ts` spreads this list; it pulls in models and validation only, no graph.
 */
export const projectiveCollections: readonly PresetCollection<unknown>[] = [
    crossRatioPresetCollection(), pascalPresetCollection(), polePolarPresetCollection(), fivePointPresetCollection(), threeViewsPresetCollection(),
];
