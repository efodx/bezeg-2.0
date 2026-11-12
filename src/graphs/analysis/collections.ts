import type {PresetCollection} from "../base/presets/PresetCollection";
import {analysisFamilyPresetCollections} from "../functions/functionPresetCollections";

/**
 * The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph).
 * The sixteen entries stay in `../functions/functionPresetCollections.ts`, next to the shared `functionCollection` helper and the
 * graph importers of `functionPresetCollections[...]`; `analysisFamilyPresetCollections` names exactly them and this list orders them.
 */
export const analysisCollections: readonly PresetCollection<unknown>[] = [
    analysisFamilyPresetCollections.bisection, analysisFamilyPresetCollections["root-finding"], analysisFamilyPresetCollections.quadrature,
    analysisFamilyPresetCollections.euler, analysisFamilyPresetCollections["mean-value"], analysisFamilyPresetCollections.accumulation,
    analysisFamilyPresetCollections.darboux, analysisFamilyPresetCollections.extrema, analysisFamilyPresetCollections.convexity,
    analysisFamilyPresetCollections.taylor, analysisFamilyPresetCollections.sequence, analysisFamilyPresetCollections["uniform-convergence"],
    analysisFamilyPresetCollections["fourier-series"], analysisFamilyPresetCollections["fourier-coefficients"], analysisFamilyPresetCollections.epicycles,
    analysisFamilyPresetCollections["fixed-point"],
];
