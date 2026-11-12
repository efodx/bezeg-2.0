import type {ScenePersistence} from "../base/presets/ScenePersistence";
import {evaluateFivePoint, FivePointModel, LastUnique, nextLastUnique, serializeFivePointModel} from "./fivePointModel";
import {serializeThreeViewsModel, ThreeViewsModel} from "./threeViewsModel";
import {CrossRatioModel, serializeCrossRatioModel} from "./crossRatioModel";
import {PascalModel, serializePascalModel} from "./pascalModel";
import {PolePolarModel, serializePolePolarModel} from "./polePolarModel";

/**
 * The projection companions of `fivePointPresetCollection` and `threeViewsPresetCollection` (`projectivePresetCollection.ts`).
 * The runtime `model` is represented once, in `data`; the persisted `graphState` is only `initialized`, as the collections'
 * `checkGraphState` permits. Derived values (the last unique conic) are recomputed by the domain functions on reconstruction,
 * never serialized, and a `model` or `lastUnique` in the permitted state cannot override the checked data.
 */
const permittedInitialized = (permittedState: unknown): {initialized?: boolean} => {
    const value = (permittedState as {initialized?: unknown} | null | undefined)?.initialized;
    return typeof value === "boolean" ? {initialized: value} : {};
};

export interface FivePointSceneState {
    initialized: boolean;
    model: FivePointModel;
    lastUnique?: LastUnique;
}

export const fivePointPersistence: ScenePersistence<FivePointModel, FivePointSceneState> = Object.freeze({
    project: (state: FivePointSceneState) => ({data: serializeFivePointModel(state.model), graphState: {initialized: state.initialized}}),
    /** A new model has no stale conic: `lastUnique` restarts from the model's own scene (`evaluateFivePoint`). */
    reconstruct(data: FivePointModel, permittedState: unknown, defaults: FivePointSceneState): FivePointSceneState {
        const model = serializeFivePointModel(data);
        return {...defaults, ...permittedInitialized(permittedState), model, lastUnique: nextLastUnique(undefined, model, evaluateFivePoint(model))};
    },
});

export interface ThreeViewsSceneState {
    initialized: boolean;
    model: ThreeViewsModel;
}

export const threeViewsPersistence: ScenePersistence<ThreeViewsModel, ThreeViewsSceneState> = Object.freeze({
    project: (state: ThreeViewsSceneState) => ({data: serializeThreeViewsModel(state.model), graphState: {initialized: state.initialized}}),
    /** The views are `evaluateThreeViews(model)`, computed from the model on demand; nothing derived is stored. */
    reconstruct(data: ThreeViewsModel, permittedState: unknown, defaults: ThreeViewsSceneState): ThreeViewsSceneState {
        return {...defaults, ...permittedInitialized(permittedState), model: serializeThreeViewsModel(data)};
    },
});

export interface CrossRatioSceneState {
    initialized: boolean;
    model: CrossRatioModel;
}

export const crossRatioPersistence: ScenePersistence<CrossRatioModel, CrossRatioSceneState> = Object.freeze({
    project: (state: CrossRatioSceneState) => ({data: serializeCrossRatioModel(state.model), graphState: {initialized: state.initialized}}),
    /** The scene is `evaluateCrossRatio(model)`, cached lazily by model identity; nothing derived is stored. */
    reconstruct(data: CrossRatioModel, permittedState: unknown, defaults: CrossRatioSceneState): CrossRatioSceneState {
        return {...defaults, ...permittedInitialized(permittedState), model: serializeCrossRatioModel(data)};
    },
});

export interface PascalSceneState {
    initialized: boolean;
    model: PascalModel;
}

export const pascalPersistence: ScenePersistence<PascalModel, PascalSceneState> = Object.freeze({
    project: (state: PascalSceneState) => ({data: serializePascalModel(state.model), graphState: {initialized: state.initialized}}),
    /** The scene is evaluated from the model, cached lazily by model identity; nothing derived is stored. */
    reconstruct(data: PascalModel, permittedState: unknown, defaults: PascalSceneState): PascalSceneState {
        return {...defaults, ...permittedInitialized(permittedState), model: serializePascalModel(data)};
    },
});

export interface PolePolarSceneState {
    initialized: boolean;
    model: PolePolarModel;
}

export const polePolarPersistence: ScenePersistence<PolePolarModel, PolePolarSceneState> = Object.freeze({
    project: (state: PolePolarSceneState) => ({data: serializePolePolarModel(state.model), graphState: {initialized: state.initialized}}),
    /** The scene is evaluated from the model, cached lazily by model identity; nothing derived is stored. */
    reconstruct(data: PolePolarModel, permittedState: unknown, defaults: PolePolarSceneState): PolePolarSceneState {
        return {...defaults, ...permittedInitialized(permittedState), model: serializePolePolarModel(data)};
    },
});
