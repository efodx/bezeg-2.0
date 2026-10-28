import {message, Message} from "../../localization";
import {checkSceneState, isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {isDecasteljauOrder, isPatchTypeName, PATCH_STATE_FIELDS, PatchCameraDto, PatchCollectionPresetData, PatchTypeName, Point3Dto, TensorPatchDto, TriangularPatchDto} from "./patchDto";
import {defaultTriangularNet} from "./TriangularPatchDegree";
import {collapsedEdgeNet, parallelCornerNet} from "./tensorDerivatives";
import type {Xyz} from "./surface-view/surfaceScene";

const MIN_DEGREE = 1;
const MAX_DEGREE = 4;
const isDegree = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= MIN_DEGREE && value <= MAX_DEGREE;
const isPoint3 = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
const isUnit = (value: unknown) => isFiniteNumber(value) && value >= 0 && value <= 1;

function checkCamera(value: unknown): Message | undefined {
    if (!isRecord(value)) return message("invalid_patch_camera");
    const unknown = Object.keys(value).find(key => !["az", "el", "distance", "projection", "target"].includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: `camera.${unknown}`});
    const {az, el, distance, projection, target} = value;
    const valid = isFiniteNumber(az) && isFiniteNumber(el) && Math.abs(el) <= Math.PI / 2 && isFiniteNumber(distance) && distance > 0
        && projection === "perspective" && isPoint3(target);
    return valid ? undefined : message("invalid_patch_camera");
}

function checkState(value: unknown, triangular: boolean): Message | undefined {
    if (!isRecord(value)) return message("invalid_state");
    const unknown = Object.keys(value).find(key => !PATCH_STATE_FIELDS.includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: `state.${unknown}`});
    const invalid = checkSceneState(value, ["camera", "isoDensity", "shadingDensity", "decasteljauOrder"]);
    if (invalid) return invalid;
    for (const key of ["u", "v"]) if (value[key] !== undefined && !isUnit(value[key])) return message("invalid_patch_parameter", {value0: key});
    // `isoDensity` would otherwise be read as an `is*` switch by the shared state check.
    for (const key of ["isoDensity", "shadingDensity"]) if (value[key] !== undefined && value[key] !== 8 && value[key] !== 16) return message("invalid_patch_density", {value0: key});
    if (value.decasteljauOrder !== undefined && !isDecasteljauOrder(value.decasteljauOrder)) return message("invalid_patch_decasteljau_order");
    // The triangle domain u, v >= 0, u + v <= 1 (w = 1 - u - v >= 0); the tolerance absorbs rounding of an exported pair.
    if (triangular && typeof value.u === "number" && typeof value.v === "number" && value.u + value.v > 1 + 1e-9) return message("invalid_triangular_parameters", {value0: value.u, value1: value.v});
    return value.camera === undefined ? undefined : checkCamera(value.camera);
}

function checkPatch(type: PatchTypeName, dto: Record<string, unknown>): Message | undefined {
    const tensor = type === "TensorProductBezierPatch";
    const unknown = Object.keys(dto).find(key => !["n", "net", "state", "weights", ...(tensor ? ["m"] : [])].includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: unknown});
    if ("weights" in dto) return message("rational_patches_are_not_supported");
    const {m, n, net} = dto;
    if (tensor && !isDegree(m)) return message("patch_degree_out_of_range", {value0: "m"});
    if (!isDegree(n)) return message("patch_degree_out_of_range", {value0: "n"});
    if (!Array.isArray(net)) return message("invalid_patch_net");
    const expected = tensor ? (Number(m) + 1) * (n + 1) : (n + 1) * (n + 2) / 2;
    if (net.length !== expected) return message("patch_net_length_mismatch", {value0: expected, value1: net.length});
    if (!net.every(isPoint3)) return message("patch_coordinates_must_be_finite_triples");
    return dto.state === undefined ? undefined : checkState(dto.state, !tensor);
}

/** A collection holds exactly one patch of its type (a Demonstration edits one patch). */
function patchCollection(key: string, type: PatchTypeName): PresetCollection<PatchCollectionPresetData> {
    const check = (data: unknown): Message | undefined => {
        if (!Array.isArray(data)) return message("invalid_patch_data");
        if (data.length !== 1) return message("preset_has_no_patch");
        const entry: unknown = data[0];
        if (!Array.isArray(entry) || entry.length !== 2 || !isPatchTypeName(entry[0]) || !isRecord(entry[1])) return message("unknown_patch_type");
        if (entry[0] !== type) return message("patch_type_does_not_match_collection", {value0: `preset-${key}`});
        return checkPatch(entry[0], entry[1]);
    };
    return Object.freeze({
        key,
        /** A patch Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized");
            if (unknown !== undefined) return message("unknown_patch_field", {value0: `graphState.${unknown}`});
            return graphState.initialized === undefined || typeof graphState.initialized === "boolean" ? undefined : message("invalid_state");
        },
        check(data: unknown): PresetDataCheck<PatchCollectionPresetData> {
            const rejection = check(data);
            // The entry was checked above against its patch type's DTO rules.
            return rejection ? {rejection} : {data: data as PatchCollectionPresetData};
        },
    });
}

/** Preset collections of the patch Demonstrations, by Demonstration id. Keys are a file contract. */
export const patchPresetCollections = {
    "patch-tensor": patchCollection("patch-tensor", "TensorProductBezierPatch"),
    "patch-triangular": patchCollection("patch-triangular", "TriangularBezierPatch"),
    "patch-decasteljau": patchCollection("patch-decasteljau", "TensorProductBezierPatch"),
    "patch-derivatives": patchCollection("patch-derivatives", "TensorProductBezierPatch"),
} as const;

/**
 * Authored views. The distances come from `fitCameraTo(net, 0.45, ...)` (a 390x844 portrait host), so the whole net
 * stays in view on a phone; wider hosts only see more margin. The saddle's bounds are 2x2x2 and the dome's 3x3x2.5.
 */
const camera = (distance: number, target: Point3Dto): PatchCameraDto => ({az: -0.9, el: 0.5, distance, projection: "perspective", target});
const state = (view: PatchCameraDto) => ({camera: view, u: 0.5, v: 0.5});

/** Hyperbolic paraboloid z = x*y over [-1,1]^2: bilinear with alternating corner heights. */
const bilinearSaddle = (): TensorPatchDto => ({
    m: 1, n: 1, state: state(camera(12.22, [0, 0, 0])),
    net: [[-1, -1, 1], [-1, 1, -1], [1, -1, -1], [1, 1, 1]],
});

/** 4x4 net over [-1.5,1.5]^2: boundary on the plane z = 0, the four interior points raised. */
const bicubicDome = (): TensorPatchDto => {
    const heights = [[0, 0, 0, 0], [0, 2.5, 2.5, 0], [0, 2.5, 2.5, 0], [0, 0, 0, 0]];
    return {m: 3, n: 3, state: state(camera(17.37, [0, 0, 1.25])), net: heights.flatMap((row, i) => row.map((z, j): [number, number, number] => [-1.5 + i, -1.5 + j, z]))};
};

export interface DefaultPatchPreset {
    readonly id: string;
    readonly name: "preset_bilinear_saddle" | "preset_bicubic_dome";
    readonly data: () => PatchCollectionPresetData;
}

/** Fresh data per call, so callers may keep or edit it. */
export const defaultPatchPresets: readonly DefaultPatchPreset[] = [
    {id: "bilinear-saddle", name: "preset_bilinear_saddle", data: () => [["TensorProductBezierPatch", bilinearSaddle()]]},
    {id: "bicubic-dome", name: "preset_bicubic_dome", data: () => [["TensorProductBezierPatch", bicubicDome()]]},
];

const COLLAPSED_EDGE_DISTANCE = 17.55, COLLAPSED_EDGE_TARGET: Point3Dto = [1.5, 0, 0.3];
const PARALLEL_CORNER_DISTANCE = 19, PARALLEL_CORNER_TARGET: Point3Dto = [2, 1.5, 1];

/** A net given as rows `net[i][j]`, as the DTO stores it row-major. */
const dtoOf = (rows: readonly (readonly Xyz[])[], view: PatchCameraDto, parameters: {u: number; v: number}): TensorPatchDto =>
    ({m: rows.length - 1, n: rows[0].length - 1, net: rows.flat(), state: {camera: view, ...parameters}});

export interface DerivativesStartingPatch {
    readonly id: string;
    readonly name: DefaultPatchPreset["name"] | "preset_collapsed_edge" | "preset_parallel_corner";
    readonly data: () => PatchCollectionPresetData;
}

/**
 * The starting patches of the `patch-derivatives` Demonstration: the two tensor Presets and two patches whose normal is
 * undefined somewhere. The collapsed-edge patch has its whole `u = 0` row at one point (`S_v = 0` along that edge, yet
 * a limit normal exists); the parallel-corner patch has parallel edge vectors at `(0, 0)`, where the normal approached depends on the direction
 * of approach, so no limit normal exists there. Both start at the degenerate
 * corner `(0, 0)` so the reason is visible at once. Cameras are fitted like the other Presets' (aspect 0.45).
 */
export const derivativesStartingPatches: readonly DerivativesStartingPatch[] = [
    ...defaultPatchPresets,
    {id: "collapsed-edge", name: "preset_collapsed_edge", data: () => [["TensorProductBezierPatch", dtoOf(collapsedEdgeNet(), camera(COLLAPSED_EDGE_DISTANCE, COLLAPSED_EDGE_TARGET), {u: 0, v: 0.5})]]},
    {id: "parallel-corner", name: "preset_parallel_corner", data: () => [["TensorProductBezierPatch", dtoOf(parallelCornerNet(), camera(PARALLEL_CORNER_DISTANCE, PARALLEL_CORNER_TARGET), {u: 0, v: 0})]]},
];

export interface DefaultTriangularPatchPreset {
    readonly id: string;
    readonly degree: number;
    readonly name: "preset_triangular_linear" | "preset_triangular_quadratic" | "preset_triangular_cubic" | "preset_triangular_quartic";
    readonly data: () => PatchCollectionPresetData;
}

/**
 * The camera distances come from `fitCameraTo(net, 0.45, ...)` like the tensor Presets' (a 390x844 portrait host); the
 * targets are the nets' bounding-box centres.
 */
const TRIANGULAR_CAMERAS: ReadonlyArray<readonly [number, Point3Dto]> = [
    [14.63, [0, 0, 0.6]], [14.97, [0, 0, 0.75]], [15.68, [0, 0, 1]], [14.97, [0, 0, 0.75]],
];
const triangularPreset = (degree: number): TriangularPatchDto => {
    const [distance, target] = TRIANGULAR_CAMERAS[degree - 1];
    return {n: degree, net: defaultTriangularNet(degree), state: {camera: camera(distance, target), u: 1 / 3, v: 1 / 3}};
};

/** The canonical default net of each degree 1 to 4; the cubic is the Demonstration's starting patch. Fresh data per call. */
export const defaultTriangularPatchPresets: readonly DefaultTriangularPatchPreset[] = [
    {id: "triangular-linear", degree: 1, name: "preset_triangular_linear", data: () => [["TriangularBezierPatch", triangularPreset(1)]]},
    {id: "triangular-quadratic", degree: 2, name: "preset_triangular_quadratic", data: () => [["TriangularBezierPatch", triangularPreset(2)]]},
    {id: "triangular-cubic", degree: 3, name: "preset_triangular_cubic", data: () => [["TriangularBezierPatch", triangularPreset(3)]]},
    {id: "triangular-quartic", degree: 4, name: "preset_triangular_quartic", data: () => [["TriangularBezierPatch", triangularPreset(4)]]},
];
