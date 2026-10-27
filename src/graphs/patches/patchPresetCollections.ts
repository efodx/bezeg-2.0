import {message, Message} from "../../localization";
import {checkSceneState, isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {isPatchTypeName, PATCH_STATE_FIELDS, PatchCameraDto, PatchCollectionPresetData, PatchTypeName, TensorPatchDto} from "./patchDto";

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

function checkState(value: unknown): Message | undefined {
    if (!isRecord(value)) return message("invalid_state");
    const unknown = Object.keys(value).find(key => !PATCH_STATE_FIELDS.includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: `state.${unknown}`});
    const invalid = checkSceneState(value, ["camera"]);
    if (invalid) return invalid;
    for (const key of ["u", "v"]) if (value[key] !== undefined && !isUnit(value[key])) return message("invalid_patch_parameter", {value0: key});
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
    return dto.state === undefined ? undefined : checkState(dto.state);
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
} as const;

const DEFAULT_CAMERA: PatchCameraDto = {az: -0.9, el: 0.5, distance: 9, projection: "perspective", target: [0, 0, 0.5]};
const state = () => ({camera: {...DEFAULT_CAMERA}, u: 0.5, v: 0.5});

/** Hyperbolic paraboloid z = x*y over [-1,1]^2: bilinear with alternating corner heights. */
const bilinearSaddle = (): TensorPatchDto => ({
    m: 1, n: 1, state: state(),
    net: [[-1, -1, 1], [-1, 1, -1], [1, -1, -1], [1, 1, 1]],
});

/** 4x4 net over [-1.5,1.5]^2: boundary on the plane z = 0, the four interior points raised. */
const bicubicDome = (): TensorPatchDto => {
    const heights = [[0, 0, 0, 0], [0, 2.5, 2.5, 0], [0, 2.5, 2.5, 0], [0, 0, 0, 0]];
    return {m: 3, n: 3, state: state(), net: heights.flatMap((row, i) => row.map((z, j): [number, number, number] => [-1.5 + i, -1.5 + j, z]))};
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
