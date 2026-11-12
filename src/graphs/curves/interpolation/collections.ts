import {message, Message} from "../../../localization";
import {checkLeastSquaresModel, DEFAULT_LEAST_SQUARES_MODEL, LeastSquaresModel, parseLeastSquaresModel} from "../../../analysis/leastSquaresModel";
import {checkRungeModel, parseRungeModel, RungeInterpolationModel} from "../../../analysis/rungeInterpolationModel";
import {checkSceneState, isRecord, PresetCollection} from "../../base/presets/PresetCollection";
import {functionCollection} from "../../functions/functionPresetCollections";
import {leastSquaresFileMessage} from "../../functions/leastSquaresMessages";
import {rungeFileMessage} from "../../functions/rungeInterpolationMessages";
import {hermitePresetCollection} from "../hermite/hermitePresetCollection";
import {subdivisionPresetCollection} from "../subdivisionCurves/subdivisionPresetCollection";
import {interpolationPresetCollection} from "./interpolationPresetCollection";

/** The model module names the rule a rejected Runge interpolation model broke; this only localizes it. */
export const rungePresetCollection: PresetCollection<RungeInterpolationModel> = functionCollection("interp-runge", parseRungeModel, data => {
    const check = checkRungeModel(data);
    return check.ok || check.issue === undefined ? undefined : rungeFileMessage(check.issue);
});

/**
 * The function graph stores its model in the scene state too, and the least-squares model has a `points` list, which the shared
 * flat scene-state rule rejects. The list is checked by the model's own point rules (any valid list, degree 1); the other
 * fields go through `checkSceneState`. The model itself is still restored from the Preset data.
 */
export const leastSquaresPresetCollection: PresetCollection<LeastSquaresModel> = (() => {
    const base = functionCollection("interp-least-squares", parseLeastSquaresModel, data => {
        const check = checkLeastSquaresModel(data);
        return check.ok || check.issue === undefined ? undefined : leastSquaresFileMessage(check.issue);
    });
    return Object.freeze({
        ...base,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {points, ...rest} = graphState;
            if (points !== undefined) {
                const check = checkLeastSquaresModel({...DEFAULT_LEAST_SQUARES_MODEL, degree: 1, points});
                if (!check.ok) return check.issue === undefined ? message("invalid_state") : leastSquaresFileMessage(check.issue);
            }
            return checkSceneState(rest);
        },
    });
})();

/** The family's Preset collections, in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const interpolationCollections: readonly PresetCollection<unknown>[] = [
    interpolationPresetCollection, hermitePresetCollection, rungePresetCollection, leastSquaresPresetCollection, subdivisionPresetCollection,
];
