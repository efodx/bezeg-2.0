import type {PresetCollection} from "../../base/presets/PresetCollection";
import {curveCollection} from "../curvePresetCollections";

/** The cubic PH Demonstration's collection: one PH curve with two hodograph points. */
export const cubicPhPresetCollection = curveCollection("cubic-ph", {type: "JSXPHBezierCurve", hodographs: 2});
/** The quintic PH Demonstration's collection: one PH curve with three hodograph points. */
export const quinticPhPresetCollection = curveCollection("quintic-ph-graph", {type: "JSXPHBezierCurve", hodographs: 3});

/** The family's Preset collections; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const phCollections: readonly PresetCollection<unknown>[] = [cubicPhPresetCollection, quinticPhPresetCollection];
