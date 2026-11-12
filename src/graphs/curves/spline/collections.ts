import type {PresetCollection} from "../../base/presets/PresetCollection";
import {curveCollection} from "../curvePresetCollections";

/** The one-sided Cn spline Demonstration's collection. */
export const cnSplinePresetCollection = curveCollection("cn-spline", {type: "JSXGenericSplineCurve"});
/** The symmetric C1 spline Demonstration's collection. */
export const c1SplinePresetCollection = curveCollection("c1-spline-graph", {type: "JSXQuadraticC1SplineCurve"});
/** The symmetric C2 spline Demonstration's collection. */
export const c2SplinePresetCollection = curveCollection("c2-spline", {type: "JSXQubicC2SplineCurve"});
/** The one-sided G1 spline Demonstration's collection. */
export const g1SplinePresetCollection = curveCollection("g1-spline-graph", {type: "JSXQuadraticG1SplineCurve"});
/** The symmetric G1 spline Demonstration's collection. */
export const g1SymmetricSplinePresetCollection = curveCollection("g1-symmetric-spline-graph", {type: "JSXSymmetricQuadraticG1SplineCurve"});

/**
 * Import-only file collection that no Demonstration declares (R-g1). `g1-spline` belonged to the affine G1 spline graph, which no
 * route rendered and which was removed on 2026-10-12 (commit 63af46b); a file exported by an earlier release may still
 * hold it, so it imports into storage unchanged although nothing reads it.
 */
export const legacyG1SplinePresetCollection = curveCollection("g1-spline", {type: "JSXQuadraticG1SplineCurve"});

/** The five Demonstration collections in catalog order. */
export const splineDemonstrationCollections: readonly PresetCollection<unknown>[] = [
    cnSplinePresetCollection, c1SplinePresetCollection, c2SplinePresetCollection, g1SplinePresetCollection, g1SymmetricSplinePresetCollection,
];

/** Every spline collection `PresetImport.ts` accepts: the five Demonstration collections, then the import-only `g1-spline` (models and validation only, no graph). */
export const splineCollections: readonly PresetCollection<unknown>[] = [...splineDemonstrationCollections, legacyG1SplinePresetCollection];
