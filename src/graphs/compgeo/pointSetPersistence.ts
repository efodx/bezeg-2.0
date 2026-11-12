import type {ScenePersistence} from "../base/presets/ScenePersistence";
import {PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";

/**
 * The projection companion of `pointSetPresetCollection` (`pointSetPresetCollection.ts`). The runtime `model` is represented
 * once, in `data`; the persisted `graphState` is `initialized` and the shown overlays by id, as the collection's
 * `checkGraphState` permits. A `model`, an unknown overlay id or any other key in the permitted state cannot reach the result.
 */
export interface PointSetSceneState {
    initialized: boolean;
    model: PointSetModel;
    /** Shown overlays by id; an absent id takes the graph's initial value. */
    overlays: Readonly<Record<string, boolean | undefined>>;
    /** The step index of a graph that declares a step (`PointSetStepDeclaration`); never present otherwise. */
    step?: number;
}

/** What a point-set Preset's `graphState` may carry: `initialized`, the overlays and the named fields of the graph's extension. */
export interface PointSetPermittedState {
    initialized: boolean;
    overlays: Record<string, boolean>;
    /** The named fields of a declared extension (a step, an algorithm, a mode, ...): whole numbers or ids, each checked by its field. */
    [field: string]: unknown;
}

/** The value of one extension field: a number (a step, a cell, an exponent) or an id (an algorithm, a mode). */
export type PointSetFieldValue = number | string;
/** Extension fields by name. */
export type PointSetExtras = Readonly<Record<string, PointSetFieldValue>>;

/** One named field of an extension: read by name from the permitted or runtime state, accepted only when `parse` accepts it. */
export interface PointSetExtraField {
    readonly name: string;
    /** The checked value, or undefined when `value` is not one this field accepts. */
    parse(value: unknown): PointSetFieldValue | undefined;
    /** The value of an omitted or refused field: the same whatever scene preceded. */
    readonly fallback: PointSetFieldValue;
}

/**
 * The extension a point-set graph may declare beyond `{initialized, model, overlays}`: named, checked fields (a step, an
 * algorithm, a mode, a tolerance) and how the data bounds them. Each field is read by name; nothing else of the permitted state
 * reaches the scene, and the same readers read the runtime state when projecting.
 */
export interface PointSetExtension {
    /** The model the graph works on (ear clipping forces a closed polygon, the hulls show points). Absent: the model as given. */
    normalise?(model: PointSetModel): PointSetModel;
    readonly fields: readonly PointSetExtraField[];
    /**
     * `values` holds every field (read or fallback); returns the values the scene starts with, bounded by the model and by
     * each other (a step within the trace of the data under the chosen algorithm, a fixed algorithm). Absent: `values`.
     */
    settle?(model: PointSetModel, values: PointSetExtras): PointSetExtras;
}

/**
 * The one extension of a plain step graph: a step index into the trace of its data (ear clipping, the sweeps, Fortune and the
 * monotone graphs). A graph that returns this from `persistenceStep()` declares exactly this field.
 */
export interface PointSetStepDeclaration {
    /** The model the graph works on (ear clipping and the monotone graphs force a closed polygon). Absent: the model as given. */
    normalise?(model: PointSetModel): PointSetModel;
    /** A step index (any number) as a whole index into the trace of `model`: truncated, clamped to the run, a non-finite one 0. */
    clamp(model: PointSetModel, step: number): number;
}

/** The finite numbers the step graphs' collections permit (any, not only whole ones: the declaration clamps). */
export const finiteNumberField = (name: string, fallback: number): PointSetExtraField => ({
    name, fallback, parse: value => typeof value === "number" && Number.isFinite(value) ? value : undefined,
});

/** The thin adapter that lets a `step` graph keep declaring only `normalise` and `clamp`. */
export function stepExtension(step: PointSetStepDeclaration): PointSetExtension {
    return Object.freeze({
        normalise: step.normalise ? (model: PointSetModel) => step.normalise!(model) : undefined,
        fields: [finiteNumberField("step", 0)],
        settle: (model: PointSetModel, values: PointSetExtras): PointSetExtras => {
            const stored = values.step;
            return {...values, step: step.clamp(model, typeof stored === "number" ? stored : 0)};
        },
    });
}

/** The extension fields of `source` (a permitted or runtime state) that are present and valid, by name; never a spread of `source`. */
function readExtras(extension: PointSetExtension, source: unknown): Record<string, PointSetFieldValue> {
    const read: Record<string, PointSetFieldValue> = {};
    if (typeof source !== "object" || source === null) return read;
    for (const field of extension.fields) {
        if (!Object.prototype.hasOwnProperty.call(source, field.name)) continue;
        const value = field.parse(Reflect.get(source, field.name));
        if (value !== undefined) read[field.name] = value;
    }
    return read;
}

/** Every field of the extension, read or fallback, then settled against the model. Deterministic: only `source` and `model` count. */
function extrasOf(extension: PointSetExtension, model: PointSetModel, source: unknown): PointSetExtras {
    const values: Record<string, PointSetFieldValue> = {};
    const read = readExtras(extension, source);
    for (const field of extension.fields) values[field.name] = read[field.name] ?? field.fallback;
    return extension.settle ? extension.settle(model, values) : values;
}

const permittedInitialized = (permittedState: unknown): {initialized?: boolean} => {
    const value = (permittedState as {initialized?: unknown} | null | undefined)?.initialized;
    return typeof value === "boolean" ? {initialized: value} : {};
};

/** The named overlay switches of the permitted state that are known ids with boolean values; absent when none were named. */
const permittedOverlays = (permittedState: unknown, overlayIds: readonly string[]): {overlays?: Record<string, boolean>} => {
    const value = (permittedState as {overlays?: unknown} | null | undefined)?.overlays;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const overlays: Record<string, boolean> = {};
    for (const id of overlayIds) {
        const shown = (value as Record<string, unknown>)[id];
        if (Object.prototype.hasOwnProperty.call(value, id) && typeof shown === "boolean") overlays[id] = shown;
    }
    return {overlays};
};

/** `declared` is a general extension, or a plain step declaration, which the family adapts (`stepExtension`). */
export function pointSetPersistence(overlayIds: readonly string[], declared?: PointSetExtension | PointSetStepDeclaration): ScenePersistence<PointSetModel, PointSetSceneState, PointSetPermittedState> {
    const extension = declared && ("fields" in declared ? declared : stepExtension(declared));
    return Object.freeze({
        project(state: PointSetSceneState) {
            const overlays: Record<string, boolean> = {};
            for (const [id, shown] of Object.entries(state.overlays)) if (typeof shown === "boolean") overlays[id] = shown;
            const graphState: PointSetPermittedState = {initialized: state.initialized, overlays};
            if (extension) Object.assign(graphState, extrasOf(extension, state.model, state));
            return {data: serializePointSetModel(state.model), graphState};
        },
        /**
         * A permitted `overlays` map REPLACES the defaults' overlays (ids it omits take the graph's initial value through
         * `overlayShown`), as `BaseGraph.importPreset` always did with `{...initial, ...checked.graphState}`; without one the
         * defaults' overlays stay. Each extension field is the named, checked value of the permitted state or its fallback,
         * settled against the data: never the defaults' value, so an omitted field is the same whatever scene preceded.
         */
        reconstruct(data: PointSetModel, permittedState: unknown, defaults: PointSetSceneState): PointSetSceneState {
            const model = serializePointSetModel(data);
            const shown = extension?.normalise ? extension.normalise(model) : model;
            const scene: PointSetSceneState = {...defaults, ...permittedInitialized(permittedState), ...permittedOverlays(permittedState, overlayIds), model: shown};
            return extension ? {...scene, ...extrasOf(extension, shown, permittedState)} : scene;
        },
    });
}
