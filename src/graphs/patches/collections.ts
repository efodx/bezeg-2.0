import type {PresetCollection} from "../base/presets/PresetCollection";
import {coonsPresetCollection} from "./coonsPresetCollection";
import {patchPresetCollections} from "./patchPresetCollections";

/**
 * The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph).
 * `patchPresetCollections` is already family-owned (six entries, no other family in it), so it stays in its module for the
 * many graph and test importers; this list composes it with the standalone Coons collection.
 */
export const patchesCollections: readonly PresetCollection<unknown>[] = [
    patchPresetCollections["patch-tensor"], patchPresetCollections["patch-decasteljau"], patchPresetCollections["patch-derivatives"],
    patchPresetCollections["patch-subdivision"], patchPresetCollections["patch-joins"], patchPresetCollections["patch-triangular"],
    coonsPresetCollection,
];
