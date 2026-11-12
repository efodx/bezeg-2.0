import type {PresetCollection} from '../../base/presets/PresetCollection';
import {bsplinePresetCollection} from './bsplinePresetCollection';

/**
 * The family's Preset collections: the one `bspline-curve` collection all six Demonstrations share (its definition stays in
 * `bsplinePresetCollection.ts`, which the graphs import directly). `PresetImport.ts` spreads this list; it pulls in models
 * and validation only, no graph.
 */
export const bsplineCollections: readonly PresetCollection<unknown>[] = [bsplinePresetCollection];
