import type {PresetCollection} from "../base/presets/PresetCollection";
import {functionsFamilyPresetCollections} from "./functionPresetCollections";

/**
 * The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph).
 * The fourteen entries stay in `functionPresetCollections.ts`, next to the shared `functionCollection` helper and the many graph
 * importers of `functionPresetCollections[...]`; `functionsFamilyPresetCollections` names exactly them and this list orders them.
 */
export const functionsCollections: readonly PresetCollection<unknown>[] = [
    functionsFamilyPresetCollections["linear-function"], functionsFamilyPresetCollections["exponential-function"], functionsFamilyPresetCollections["trigonometric-functions"],
    functionsFamilyPresetCollections["function-transformation"], functionsFamilyPresetCollections["function-inverse"], functionsFamilyPresetCollections["polynomial-zeros"],
    functionsFamilyPresetCollections["rational-function"], functionsFamilyPresetCollections["geometric-series"], functionsFamilyPresetCollections["conic-focal"],
    functionsFamilyPresetCollections.continuity, functionsFamilyPresetCollections.derivative, functionsFamilyPresetCollections["definite-integral"],
    functionsFamilyPresetCollections["area-between-curves"], functionsFamilyPresetCollections["arc-length"],
];
