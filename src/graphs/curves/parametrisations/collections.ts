import type {PresetCollection} from "../../base/presets/PresetCollection";
import {curveCollection} from "../curvePresetCollections";

/** The spline parameterization Demonstration's collection: one cubic C2 spline. */
export const splineParameterizationPresetCollection = curveCollection("alfaparametrizacije", {type: "JSXQubicC2SplineCurve"});
/** The weighted parameterization Demonstration's collection: a Bezier curve. */
export const weightedParameterizationPresetCollection = curveCollection("alpha-param", {type: "JSXBezierCurve"});
/** The uniform parameterization Demonstration's collection: one quintic PH curve (three hodograph points). */
export const uniformParameterizationPresetCollection = curveCollection("uniform-graph", {type: "JSXPHBezierCurve", hodographs: 3});

/** The family's Preset collections; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const parameterizationCollections: readonly PresetCollection<unknown>[] = [
    splineParameterizationPresetCollection, weightedParameterizationPresetCollection, uniformParameterizationPresetCollection,
];
