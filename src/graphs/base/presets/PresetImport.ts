import {message, LocalizedError, Message} from "../../../localization";
import type {BaseGraphState, BoardState} from "../BaseGraph";
import {checkSceneState, isFiniteNumber, isPresetCollectionEnvelope, isRecord, PresetCollection} from "./PresetCollection";
import {curvePresetCollections, legacyCurvePresetCollections} from "../../curves/curvePresetCollections";
import {functionPresetCollections} from "../../functions/functionPresetCollections";
import {notablePointsCollection} from "../../compgeo/notablePointsPresetCollection";
import {inscribedAngleCollection} from "../../compgeo/inscribedAnglePresetCollection";
import {eulerLineCollection} from "../../compgeo/eulerLinePresetCollection";
import {simsonLineCollection} from "../../compgeo/simsonLinePresetCollection";
import {inversionCollection} from "../../compgeo/inversionPresetCollection";
import {compgeoPresetCollections} from "../../compgeo/compgeoPresetCollections";
import {patchPresetCollections} from "../../patches/patchPresetCollections";
import {complexReciprocalPresetCollection} from "../../complex/complexReciprocalPresets";
import {complexRootsPresetCollection} from "../../complex/complexRootsPresets";
import {linearMapPresetCollection} from "../../linear/linearMapPresetCollection";
import {parametricPresetCollection} from "../../curves/parametric/parametricPresetCollection";
import {interpolationPresetCollection} from "../../curves/interpolation/interpolationPresetCollection";
import {hermitePresetCollection} from "../../curves/hermite/hermitePresetCollection";
import {subdivisionPresetCollection} from "../../curves/subdivisionCurves/subdivisionPresetCollection";
import {bsplinePresetCollection} from "../../curves/bspline/bsplinePresetCollection";
import {coonsPresetCollection} from "../../patches/coonsPresetCollection";
import {projectiveCollections} from "../../projective/collections";

/**
 * Every collection a file may hold: each Demonstration's definition, from the family module that owns it, and the
 * documented legacy collections. Collection keys and DTO names are a file contract, independent of the graph renderer.
 */
export const presetCollections: readonly PresetCollection<unknown>[] = [
    ...Object.values(curvePresetCollections), ...legacyCurvePresetCollections, ...Object.values(functionPresetCollections),
    ...Object.values(patchPresetCollections), linearMapPresetCollection, complexReciprocalPresetCollection, complexRootsPresetCollection,
    ...compgeoPresetCollections, notablePointsCollection, inscribedAngleCollection, eulerLineCollection, simsonLineCollection, inversionCollection,
    parametricPresetCollection, interpolationPresetCollection, hermitePresetCollection, subdivisionPresetCollection,
    coonsPresetCollection, bsplinePresetCollection,
    ...projectiveCollections,
];
const collectionsByStorageKey = new Map(presetCollections.map(collection => [`preset-${collection.key}`, collection]));

function fail(detail: Message): never {
    throw new LocalizedError(message("unsupported_file_export_presets_from_bezeg_and_check_the_data", {value0: detail}));
}

/** A view the board can show: four finite numbers, left < right, top > bottom. */
export function isBoundingBox(value: unknown): value is BoardState["boundingBox"] {
    return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber) && value[0] < value[2] && value[1] > value[3];
}

/** One Preset after its collection checked it: a normalized copy that shares nothing with the raw value. */
export interface CheckedPreset {
    readonly id: string;
    readonly data?: unknown;
    readonly boardState?: BoardState;
    readonly graphState?: BaseGraphState;
}
export type PresetCheck = { readonly preset: CheckedPreset } | { readonly rejection: Message };
export type PresetCollectionCheck = { readonly presets: CheckedPreset[] } | { readonly rejection: Message };

const clone = <T, >(value: T): T => structuredClone(value);
const inPreset = (collection: PresetCollection<unknown>, name: string, field: string, detail: Message): Message =>
    message("preset_check_in_preset", {value0: collection.key, value1: name, value2: field, value3: detail});

/**
 * Checks one stored Preset without a graph, board or storage: its name, view and scene state, and its data by the
 * collection's own definition. Returns a normalized copy or the localized reason, naming collection, Preset and field.
 * Omitted `data`, `boardState` and `graphState` stay omitted; an explicit `null` is not omission and is checked as a value.
 * Names are required and unique only within a collection (`checkPresetCollection`), so a lone Preset may have no name.
 * `at` is the Preset's 1-based position in its collection, used to name a Preset that has no usable name.
 */
export function checkPreset(collection: PresetCollection<unknown>, raw: unknown, at?: number): PresetCheck {
    if (!isRecord(raw) || (raw.id !== undefined && typeof raw.id !== "string")) {
        return {rejection: message("preset_check_in_collection", {value0: collection.key, value1: message("missing_or_duplicate_preset_name")})};
    }
    const id = raw.id ?? "";
    const name = id || (at === undefined ? "" : `#${at}`);
    const checked: {id: string; data?: unknown; boardState?: BoardState; graphState?: BaseGraphState} = {id};
    if (raw.boardState !== undefined) {
        if (!(isRecord(raw.boardState) && isBoundingBox(raw.boardState.boundingBox))) return {rejection: inPreset(collection, name, "boardState", message("invalid_graph_bounds"))};
        const [left, top, right, bottom] = raw.boardState.boundingBox;
        checked.boardState = {boundingBox: [left, top, right, bottom]};
    }
    if (raw.graphState !== undefined) {
        const invalid = collection.checkGraphState ? collection.checkGraphState(raw.graphState) : checkSceneState(raw.graphState);
        if (invalid) return {rejection: inPreset(collection, name, "graphState", invalid)};
        checked.graphState = clone(raw.graphState) as BaseGraphState;
    }
    if (raw.data !== undefined) {
        const result = collection.check(clone(raw.data));
        if ("rejection" in result) return {rejection: inPreset(collection, name, "data", result.rejection)};
        checked.data = result.data;
    }
    return {preset: checked};
}

/** Checks a stored collection: its envelope, nonblank unique Preset names, and every Preset by `checkPreset`. */
export function checkPresetCollection(collection: PresetCollection<unknown>, raw: unknown): PresetCollectionCheck {
    if (!isPresetCollectionEnvelope(raw)) return {rejection: message("invalid_collection", {value0: collection.key})};
    const names = new Set<string>();
    const presets: CheckedPreset[] = [];
    for (const [index, preset] of raw.data.entries()) {
        if (!isRecord(preset) || typeof preset.id !== "string" || !preset.id.trim() || names.has(preset.id)) {
            return {rejection: message("preset_check_in_collection", {value0: collection.key, value1: message("missing_or_duplicate_preset_name")})};
        }
        names.add(preset.id);
        const checked = checkPreset(collection, preset, index + 1);
        if ("rejection" in checked) return checked;
        presets.push(checked.preset);
    }
    return {presets};
}

/** The collection a storage key (`preset-<key>`) belongs to, if the app defines one. */
export function presetCollectionForStorageKey(key: string): PresetCollection<unknown> | undefined {
    return collectionsByStorageKey.get(key);
}

export type PresetImportPlan = {collections: Record<string, unknown>, replacements: string[]};

/** Checks a Preset file without writing: the file envelope, each collection by its definition, and which stored collections it replaces. */
export function preflightPresetImport(contents: string, storage: Storage = window.localStorage): PresetImportPlan {
    let parsed: unknown;
    try { parsed = JSON.parse(contents); } catch { return fail(message("invalid_json")); }
    if (!isRecord(parsed) || Object.keys(parsed).length === 0) return fail(message("missing_preset_collections"));
    for (const [key, stored] of Object.entries(parsed)) {
        const collection = collectionsByStorageKey.get(key) ?? fail(message("unknown_collection", {value0: key}));
        const checked = checkPresetCollection(collection, stored);
        if ("rejection" in checked) fail(checked.rejection);
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
