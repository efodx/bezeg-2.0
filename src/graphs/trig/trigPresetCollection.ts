import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {
    parseTriangleState, parseUnitCircleState, TriangleState, TrigError, TrigResult, UnitCircleState,
} from "../../trig/trigModel";

/**
 * The Preset collections of the trigonometry family (ADR 0044, ADR 0016). A Preset keeps only the stored fields of the
 * state model (`src/trig/trigModel.ts`: half-degree angles, grid vertices, solver inputs), never derived values, so the
 * scene is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized` and the
 * graph's display switches (`displaySwitches`), which are not part of the stored model.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function trigRejection(error: TrigError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    if (error.reason === "not-boolean") return message("invalid_option", {value0: error.field});
    return message("invalid_value", {value0: error.field});
}

function trigCollection<D>(key: string, displaySwitches: readonly string[], parse: (data: unknown) => TrigResult<D>): PresetCollection<D> {
    return Object.freeze({
        key,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized" && !displaySwitches.includes(field));
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            const bad = ["initialized", ...displaySwitches].find(field => graphState[field] !== undefined && typeof graphState[field] !== "boolean");
            if (bad !== undefined) return message("invalid_option", {value0: bad});
            return undefined;
        },
        check(data: unknown): PresetDataCheck<D> {
            const parsed = parse(data);
            return parsed.ok ? {data: parsed.value} : {rejection: trigRejection(parsed.error)};
        },
    });
}

export const UNIT_CIRCLE_PRESET_KEY = "unit-circle";

const UNIT_CIRCLE_COLLECTION = trigCollection<UnitCircleState>(UNIT_CIRCLE_PRESET_KEY, ["showAddition"], parseUnitCircleState);

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const unitCirclePresetCollection = (): PresetCollection<UnitCircleState> => UNIT_CIRCLE_COLLECTION;

export const TRIANGLE_SOLVER_PRESET_KEY = "triangle-solver";

const TRIANGLE_SOLVER_COLLECTION = trigCollection<TriangleState>(TRIANGLE_SOLVER_PRESET_KEY, [], parseTriangleState);

export const triangleSolverPresetCollection = (): PresetCollection<TriangleState> => TRIANGLE_SOLVER_COLLECTION;
