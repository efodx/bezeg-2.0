import type {PresetCollection} from "../base/presets/PresetCollection";
import {probabilityFamilyPresetCollections} from "../functions/functionPresetCollections";

/**
 * The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph).
 * The five entries stay in `../functions/functionPresetCollections.ts`, next to the shared `functionCollection` helper and the
 * graph importers of `functionPresetCollections[...]`; `probabilityFamilyPresetCollections` names exactly them and this list orders them.
 */
export const probabilityCollections: readonly PresetCollection<unknown>[] = [
    probabilityFamilyPresetCollections["prob-density"], probabilityFamilyPresetCollections["prob-binomial-normal"],
    probabilityFamilyPresetCollections["prob-clt"], probabilityFamilyPresetCollections["prob-summary"],
    probabilityFamilyPresetCollections["prob-correlation"],
];
