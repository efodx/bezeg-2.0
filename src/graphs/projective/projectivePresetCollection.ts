import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {CrossRatioModel, parseCrossRatioModel} from "./crossRatioModel";
import {parsePascalModel, PascalModel} from "./pascalModel";
import {parsePolePolarModel, PolePolarModel} from "./polePolarModel";
import {ProjectiveCheck} from "./projectiveValidation";

/**
 * The Preset collections of the projective graph family (ADR 0016, ADR 0033 section 4). A Preset keeps only the example id
 * and the integers that place the grid points (and, for later graphs, table indices), never derived geometry, so the scene is
 * always recomputed exactly from checked data. `graphState` carries only `initialized`; the data sits in `data`.
 *
 * A later graph (Pascal and Pappus, pole and polar) adds its own `parse` function and one exported collection below. The key
 * is a file contract. They are listed in `presetCollections` (`PresetImport.ts`).
 */
export function projectivePresetCollection<D>(key: string, parse: (data: unknown) => ProjectiveCheck<D>): PresetCollection<D> {
    return Object.freeze({
        key,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized");
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            return undefined;
        },
        check(data: unknown): PresetDataCheck<D> {
            const parsed = parse(data);
            return parsed.ok ? {data: parsed.value} : {rejection: parsed.rejection};
        },
    });
}

export const CROSS_RATIO_PRESET_KEY = "projective-cross-ratio";

const CROSS_RATIO_COLLECTION = projectivePresetCollection(CROSS_RATIO_PRESET_KEY, parseCrossRatioModel);

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const crossRatioPresetCollection = (): PresetCollection<CrossRatioModel> => CROSS_RATIO_COLLECTION;

export const POLE_POLAR_PRESET_KEY = "projective-pole-polar";

const POLE_POLAR_COLLECTION = projectivePresetCollection(POLE_POLAR_PRESET_KEY, parsePolePolarModel);

export const polePolarPresetCollection = (): PresetCollection<PolePolarModel> => POLE_POLAR_COLLECTION;

export const PASCAL_PRESET_KEY = "projective-pascal";

const PASCAL_COLLECTION = projectivePresetCollection(PASCAL_PRESET_KEY, parsePascalModel);

export const pascalPresetCollection = (): PresetCollection<PascalModel> => PASCAL_COLLECTION;
