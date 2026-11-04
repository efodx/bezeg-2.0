import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {hullTracePresetCollection} from "./hullTracePresetCollection";
import {
    parseDuplicateRule, parseKettnerCoordinate, parseKettnerPanel, parsePopRule, parseRobustnessMode,
} from "./hullRobustnessReadout";

/** The file contract key of the hull robustness graph's own Preset collection. It is listed in `presetCollections` through `compgeoPresetCollections.ts`. */
export const HULL_ROBUSTNESS_PRESET_KEY = "compgeo-hull-robustness";

/**
 * The hull robustness graph's Preset collection. `data` is the point-set model, checked like any point set (so too many points, a
 * non-integer or out-of-range coordinate and the like are refused there). `graphState` is the hull trace graph's (`algorithm`,
 * `step`, `initialized`, `overlays`) plus the robustness choices: `mode` (chain or kettner), `pop` (non-left or right),
 * `duplicates` (merge or keep), `panel` (inexact or exact) and the selected Kettner cell `cellI`, `cellJ` (integers 0..63).
 * Each is optional; a present value that is not one of the known ids, or a cell coordinate that is not an integer in range, is
 * rejected with the field named. Nothing here is evaluated: the Kettner map is fixed and recomputed, never read from the file.
 */
export function hullRobustnessPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = hullTracePresetCollection(overlayIds);
    return Object.freeze({
        key: HULL_ROBUSTNESS_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {mode, pop, duplicates, panel, cellI, cellJ, ...rest} = graphState;
            if (mode !== undefined && parseRobustnessMode(mode) === undefined) return message("hullrobust_invalid_mode");
            if (pop !== undefined && parsePopRule(pop) === undefined) return message("hullrobust_invalid_pop");
            if (duplicates !== undefined && parseDuplicateRule(duplicates) === undefined) return message("hullrobust_invalid_duplicates");
            if (panel !== undefined && parseKettnerPanel(panel) === undefined) return message("hullrobust_invalid_panel");
            if (cellI !== undefined && parseKettnerCoordinate(cellI) === undefined) return message("hullrobust_invalid_cell", {value0: "cellI"});
            if (cellJ !== undefined && parseKettnerCoordinate(cellJ) === undefined) return message("hullrobust_invalid_cell", {value0: "cellJ"});
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}
