import {message, LocalizedError, Message} from "../../../localization";
import type {BoardState} from "../BaseGraph";
import type {StoredGraphState} from "./Presets";
import {planeGeometryCollections} from "../../compgeo/planeGeometry/collections";
import {checkSceneState, isFiniteNumber, isPresetCollectionEnvelope, isRecord, PresetCollection} from "./PresetCollection";
import {analysisCollections} from "../../analysis/collections";
import {mapsCollections} from "../../maps/collections";
import {probabilityCollections} from "../../probability/collections";
import {functionsCollections} from "../../functions/collections";
import {compgeoPresetCollections} from "../../compgeo/compgeoPresetCollections";
import {patchesCollections} from "../../patches/collections";
import {bsplineCollections} from "../../curves/bspline/collections";
import {basicsCollections} from "../../basics/collections";
import {phCollections} from "../../curves/ph/collections";
import {parameterizationCollections} from "../../curves/parametrisations/collections";
import {bezierCollections} from "../../curves/bezier/collections";
import {rationalCollections} from "../../curves/rational/collections";
import {splineCollections} from "../../curves/spline/collections";
import {curveGeometryCollections} from "../../curves/geometry/collections";
import {interpolationCollections} from "../../curves/interpolation/collections";
import {projectiveCollections} from "../../projective/collections";
import {trigCollections} from "../../trig/collections";
import {lineCollections} from "../../lines/collections";
import {isometryCollections} from "../../isometry/collections";
import {circleConstructionCollections} from "../../compgeo/circleConstruction/collections";
import {combinatoricsCollections} from "../../combinatorics/collections";
import {randomCollections} from "../../random/collections";
import {kinematicsCollections} from "../../curves/kinematics/collections";
import {recursionCollections} from "../../recursion/collections";
import {wavesCollections} from "../../functions/waves/collections";
import {complexBatchDCollections} from "../../complex/batchD/collections";
import {mechanicsCollections} from "../../mechanics/collections";
import {dynamicsCollections} from "../../dynamics/collections";
import {solidsCollections} from "../../solids/collections";
import {levelSetsCollections} from "../../levelsets/collections";

/**
 * Every collection a file may hold: each Demonstration's definition, from the family module that owns it, and the
 * documented legacy collections. Collection keys and DTO names are a file contract, independent of the graph renderer.
 */
export const presetCollections: readonly PresetCollection<unknown>[] = [
    ...functionsCollections, ...analysisCollections, ...probabilityCollections,
    ...patchesCollections, ...mapsCollections,
    ...planeGeometryCollections, ...compgeoPresetCollections,
    ...projectiveCollections,
    ...bsplineCollections,
    ...basicsCollections,
    ...phCollections,
    ...parameterizationCollections,
    ...bezierCollections,
    ...rationalCollections,
    ...splineCollections,
    ...curveGeometryCollections,
    ...interpolationCollections,
    ...trigCollections,
    ...lineCollections,
    ...isometryCollections,
    ...circleConstructionCollections,
    ...combinatoricsCollections,
    ...randomCollections,
    ...kinematicsCollections,
    ...recursionCollections,
    ...wavesCollections,
    ...complexBatchDCollections,
    ...mechanicsCollections,
    ...dynamicsCollections,
    ...solidsCollections,
    ...levelSetsCollections,
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
export interface CheckedPreset<D = unknown> {
    readonly id: string;
    readonly data?: D;
    readonly boardState?: BoardState;
    readonly graphState?: StoredGraphState;
}
export type PresetCheck<D = unknown> = { readonly preset: CheckedPreset<D> } | { readonly rejection: Message };
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
export function checkPreset<D>(collection: PresetCollection<D>, raw: unknown, at?: number): PresetCheck<D> {
    if (!isRecord(raw) || (raw.id !== undefined && typeof raw.id !== "string")) {
        return {rejection: message("preset_check_in_collection", {value0: collection.key, value1: message("missing_or_duplicate_preset_name")})};
    }
    const id = raw.id ?? "";
    const name = id || (at === undefined ? "" : `#${at}`);
    const checked: {id: string; data?: D; boardState?: BoardState; graphState?: StoredGraphState} = {id};
    if (raw.boardState !== undefined) {
        if (!(isRecord(raw.boardState) && isBoundingBox(raw.boardState.boundingBox))) return {rejection: inPreset(collection, name, "boardState", message("invalid_graph_bounds"))};
        const [left, top, right, bottom] = raw.boardState.boundingBox;
        checked.boardState = {boundingBox: [left, top, right, bottom]};
    }
    if (raw.graphState !== undefined) {
        const invalid = collection.checkGraphState ? collection.checkGraphState(raw.graphState) : checkSceneState(raw.graphState);
        if (invalid) return {rejection: inPreset(collection, name, "graphState", invalid)};
        if (isRecord(raw.graphState)) checked.graphState = clone(raw.graphState);
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
