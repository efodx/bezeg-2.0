import type {PresetCollection} from "../../base/presets/PresetCollection";
import {curveCollection} from "../curvePresetCollections";

const rational = (key: string) => curveCollection(key, {type: "JSXRationalBezierCurve"});

/** The rational Bezier curve Demonstration's collection. */
export const rationalPresetCollection = rational("rational-bezier");
/** The rational de Casteljau Demonstration's collection. */
export const rationalDecasteljauPresetCollection = rational("rational-decasteljau");
/** The rational degree elevation Demonstration's collection. */
export const rationalElevationPresetCollection = rational("rational-bezier-elevation");
/** The rational extrapolation Demonstration's collection. */
export const rationalExtrapolationPresetCollection = rational("rational-bezier-extrapolation");
/** The rational subdivision Demonstration's collection. */
export const rationalSubdivisionPresetCollection = rational("rational-bezier-subdivision");
/** The Farin points Demonstration's collection. */
export const farinPresetCollection = rational("rational-bezier-farin");

/** The family's Preset collections in catalog order (`circle` has none); `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const rationalCollections: readonly PresetCollection<unknown>[] = [
    rationalPresetCollection, rationalDecasteljauPresetCollection, rationalElevationPresetCollection,
    rationalExtrapolationPresetCollection, rationalSubdivisionPresetCollection, farinPresetCollection,
];
