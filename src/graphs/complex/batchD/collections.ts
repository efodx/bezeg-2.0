import type {PresetCollection} from '../../base/presets/PresetCollection';
import {complexPowerPresetCollection} from '../complexPowerPresetCollection';
import {eulerCirclePresetCollection} from '../eulerCirclePresetCollection';

/**
 * The Batch D Preset collections, referenced from their canonical definitions (not redefined here). `PresetImport.ts` spreads this
 * list; it pulls in the state models only, no graph.
 */
export const complexBatchDCollections: readonly PresetCollection<unknown>[] = [
    complexPowerPresetCollection,
    eulerCirclePresetCollection,
];
