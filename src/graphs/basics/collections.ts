import {checkComplexModel, parseComplexModel} from "../../analysis/complexModel";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {complexFileMessage} from "../complex/complexMessages";
import {curveCollection} from "../curves/curvePresetCollections";
import {functionCollection} from "../functions/functionPresetCollections";

/** The Bernstein Demonstration's collection: a Bezier curve whose scene may be empty, since the scene state describes it. */
export const bernsteinPresetCollection = curveCollection("bernstein-graph", {type: "JSXBezierCurve", allowEmpty: true});

/** The complex multiplication collection: a validated model object; the diagnosis only localizes the rule a rejected model broke. */
export const complexMultiplicationPresetCollection = functionCollection("complex-multiplication", parseComplexModel, data => {
    const check = checkComplexModel(data);
    return check.ok || check.issue === undefined ? undefined : complexFileMessage(check.issue);
});

/** The family's Preset collections; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const basicsCollections: readonly PresetCollection<unknown>[] = [bernsteinPresetCollection, complexMultiplicationPresetCollection];
