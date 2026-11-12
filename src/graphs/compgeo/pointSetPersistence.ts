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

/** What a point-set Preset's `graphState` may carry. */
export interface PointSetPermittedState {
    initialized: boolean;
    overlays: Record<string, boolean>;
    /** Only a graph that declares a step carries one; it is a whole number within the trace of the data. */
    step?: number;
}

/**
 * The one extension a point-set graph may declare: a step index into the trace of its data (the plain `step` graphs). A graph
 * that returns this from `persistenceStep()` is on the declared path; no other scene state is persisted through it.
 */
export interface PointSetStepDeclaration {
    /** The model the graph works on (ear clipping and the monotone graphs force a closed polygon). Absent: the model as given. */
    normalise?(model: PointSetModel): PointSetModel;
    /** A step index (any number) as a whole index into the trace of `model`: truncated, clamped to the run, a non-finite one 0. */
    clamp(model: PointSetModel, step: number): number;
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

/** The named `step` of the permitted state when it is a finite number, as the graphs' collections permit; otherwise absent. */
const permittedStep = (permittedState: unknown): number | undefined => {
    const value = (permittedState as {step?: unknown} | null | undefined)?.step;
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

export function pointSetPersistence(overlayIds: readonly string[], step?: PointSetStepDeclaration): ScenePersistence<PointSetModel, PointSetSceneState, PointSetPermittedState> {
    return Object.freeze({
        project(state: PointSetSceneState) {
            const overlays: Record<string, boolean> = {};
            for (const [id, shown] of Object.entries(state.overlays)) if (typeof shown === "boolean") overlays[id] = shown;
            const graphState: PointSetPermittedState = {initialized: state.initialized, overlays};
            if (step) graphState.step = step.clamp(state.model, state.step ?? 0);
            return {data: serializePointSetModel(state.model), graphState};
        },
        /**
         * A permitted `overlays` map REPLACES the defaults' overlays (ids it omits take the graph's initial value through
         * `overlayShown`), as `BaseGraph.importPreset` always did with `{...initial, ...checked.graphState}`; without one the
         * defaults' overlays stay. A declared step is the named finite `step` clamped to the data, else 0: never the defaults'
         * step, so an omitted step is the same whatever scene preceded.
         */
        reconstruct(data: PointSetModel, permittedState: unknown, defaults: PointSetSceneState): PointSetSceneState {
            const model = serializePointSetModel(data);
            const shown = step?.normalise ? step.normalise(model) : model;
            const scene = {...defaults, ...permittedInitialized(permittedState), ...permittedOverlays(permittedState, overlayIds), model: shown};
            return step ? {...scene, step: step.clamp(shown, permittedStep(permittedState) ?? 0)} : scene;
        },
    });
}
