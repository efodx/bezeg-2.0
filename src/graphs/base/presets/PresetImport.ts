import {message, LocalizedError, Message} from "../../../localization";
import {checkSceneState, isFiniteNumber, isRecord, PresetCollection} from "./PresetCollection";
import {curvePresetCollections, legacyCurvePresetCollections} from "../../curves/curvePresetCollections";
import {functionPresetCollections} from "../../functions/functionPresetCollections";
import {patchPresetCollections} from "../../patches/patchPresetCollections";

/**
 * Every collection a file may hold: each Demonstration's definition, from the family module that owns it, and the
 * documented legacy collections. Collection keys and DTO names are a file contract, independent of the graph renderer.
 */
export const presetCollections: readonly PresetCollection<unknown>[] = [
    ...Object.values(curvePresetCollections), ...legacyCurvePresetCollections, ...Object.values(functionPresetCollections),
    ...Object.values(patchPresetCollections),
];
const collectionsByStorageKey = new Map(presetCollections.map(collection => [`preset-${collection.key}`, collection]));

function fail(detail: Message): never {
    throw new LocalizedError(message("unsupported_file_export_presets_from_bezeg_and_check_the_data", {value0: detail}));
}

function isBoundingBox(value: unknown) {
    return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber) && value[0] < value[2] && value[1] > value[3];
}

/** One stored Preset: its name, view and scene state here, its data by the collection's own definition. */
function checkPreset(collection: PresetCollection<unknown>, preset: Record<string, unknown>) {
    if (preset.boardState !== undefined && !(isRecord(preset.boardState) && isBoundingBox(preset.boardState.boundingBox))) fail(message("invalid_graph_bounds"));
    if (preset.graphState !== undefined) {
        const invalid = checkSceneState(preset.graphState);
        if (invalid) fail(invalid);
    }
    if (preset.data !== undefined) {
        const checked = collection.check(preset.data);
        if ("rejection" in checked) fail(checked.rejection);
    }
}

export type PresetImportPlan = {collections: Record<string, unknown>, replacements: string[]};

/** Checks a Preset file without writing: the file envelope, each collection by its definition, and which stored collections it replaces. */
export function preflightPresetImport(contents: string, storage: Storage = window.localStorage): PresetImportPlan {
    let parsed: unknown;
    try { parsed = JSON.parse(contents); } catch { return fail(message("invalid_json")); }
    if (!isRecord(parsed) || Object.keys(parsed).length === 0) return fail(message("missing_preset_collections"));
    for (const [key, stored] of Object.entries(parsed)) {
        const collection = collectionsByStorageKey.get(key) ?? fail(message("unknown_collection", {value0: key}));
        if (!isRecord(stored) || !Array.isArray(stored.data)) fail(message("invalid_collection", {value0: key}));
        const names = new Set<string>();
        for (const preset of stored.data) {
            if (!isRecord(preset) || typeof preset.id !== "string" || !preset.id.trim() || names.has(preset.id)) fail(message("missing_or_duplicate_preset_name"));
            names.add(preset.id);
            checkPreset(collection, preset);
        }
    }
    return {collections: parsed, replacements: Object.keys(parsed).filter(key => storage.getItem(key) !== null)};
}

export function commitPresetImport(plan: PresetImportPlan, storage: Storage = window.localStorage) {
    // Revalidate at the write boundary, and restore the previous values if storage fails.
    const checked = preflightPresetImport(JSON.stringify(plan.collections), storage);
    const previous = Object.keys(checked.collections).map(key => [key, storage.getItem(key)] as const);
    try {
        Object.entries(checked.collections).forEach(([key, value]) => storage.setItem(key, JSON.stringify(value)));
    } catch {
        previous.forEach(([key, value]) => value === null ? storage.removeItem(key) : storage.setItem(key, value));
        throw new LocalizedError(message("cannot_save_presets_free_browser_storage_space_and_try_again"));
    }
}
