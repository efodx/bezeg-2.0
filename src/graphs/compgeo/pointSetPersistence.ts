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
}

/** What a point-set Preset's `graphState` may carry. */
export interface PointSetPermittedState {
    initialized: boolean;
    overlays: Record<string, boolean>;
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

export function pointSetPersistence(overlayIds: readonly string[]): ScenePersistence<PointSetModel, PointSetSceneState, PointSetPermittedState> {
    return Object.freeze({
        project(state: PointSetSceneState) {
            const overlays: Record<string, boolean> = {};
            for (const [id, shown] of Object.entries(state.overlays)) if (typeof shown === "boolean") overlays[id] = shown;
            return {data: serializePointSetModel(state.model), graphState: {initialized: state.initialized, overlays}};
        },
        /**
         * A permitted `overlays` map REPLACES the defaults' overlays (ids it omits take the graph's initial value through
         * `overlayShown`), as `BaseGraph.importPreset` always did with `{...initial, ...checked.graphState}`; without one the
         * defaults' overlays stay.
         */
        reconstruct(data: PointSetModel, permittedState: unknown, defaults: PointSetSceneState): PointSetSceneState {
            return {...defaults, ...permittedInitialized(permittedState), ...permittedOverlays(permittedState, overlayIds), model: serializePointSetModel(data)};
        },
    });
}
