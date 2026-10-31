import {message, Message} from "../../localization";
import {isFiniteNumber, isRecord, type PresetCollection, type PresetDataCheck} from "../base/presets/PresetCollection";
import {coonsMismatches, COONS_BOUNDARY_NAMES, type CoonsBoundaryPoints, type CoonsShown, isCoonsShown} from "./coonsScene";
import type {PatchCameraDto, Point3Dto} from "./patchDto";
import type {Xyz} from "./surface-view/surfaceScene";

/** Preset key of the Coons patch Demonstration (D4). A file contract; kept out of `patchPresetCollections` until the Demonstration is registered. */
export const COONS_PRESET_KEY = "patch-coons";

/** A coordinate is rejected beyond this absolute value; the Demonstration's examples live within a few units. */
export const COONS_COORDINATE_LIMIT = 1000;

/** Display and view state stored beside the boundaries; every field is optional. */
export interface CoonsStateDto {
    readonly camera?: PatchCameraDto;
    readonly showControlNet?: boolean;
    readonly showShading?: boolean;
}

/** The four cubic boundaries (4 `[x, y, z]` points each), the link switch and the shown surface. */
export interface CoonsPatchDto {
    readonly c0: ReadonlyArray<Point3Dto>;
    readonly c1: ReadonlyArray<Point3Dto>;
    readonly d0: ReadonlyArray<Point3Dto>;
    readonly d1: ReadonlyArray<Point3Dto>;
    readonly linkedCorners: boolean;
    readonly shown: CoonsShown;
    readonly state?: CoonsStateDto;
}

export type CoonsPresetData = ReadonlyArray<readonly ["CoonsPatch", CoonsPatchDto]>;

const isPoint3 = (value: unknown): boolean => Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);

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
    const unknown = Object.keys(value).find(key => !["camera", "showControlNet", "showShading"].includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: `state.${unknown}`});
    for (const key of ["showControlNet", "showShading"]) if (value[key] !== undefined && typeof value[key] !== "boolean") return message("invalid_option", {value0: key});
    return value.camera === undefined ? undefined : checkCamera(value.camera);
}

/**
 * A linked-corners file whose end points do not coincide is rejected, not snapped: loading it would show a different
 * patch than the file says, and the file is wrong about its own switch. Turning linking on in the app snaps instead.
 */
function checkPatch(dto: Record<string, unknown>): Message | undefined {
    const unknown = Object.keys(dto).find(key => ![...COONS_BOUNDARY_NAMES, "linkedCorners", "shown", "state"].includes(key));
    if (unknown !== undefined) return message("unknown_patch_field", {value0: unknown});
    const boundaries: CoonsBoundaryPoints = {c0: [], c1: [], d0: [], d1: []};
    for (const name of COONS_BOUNDARY_NAMES) {
        const points = dto[name];
        if (!Array.isArray(points) || points.length !== 4) return message("coons_invalid_boundary", {value0: name});
        if (!points.every(isPoint3)) return message("patch_coordinates_must_be_finite_triples");
        boundaries[name] = points.map((point): Xyz => [point[0], point[1], point[2]]);
        if (boundaries[name].some(point => point.some(value => Math.abs(value) > COONS_COORDINATE_LIMIT))) {
            return message("coons_coordinate_out_of_range", {value0: COONS_COORDINATE_LIMIT});
        }
    }
    if (typeof dto.linkedCorners !== "boolean") return message("coons_invalid_linked");
    if (!isCoonsShown(dto.shown)) return message("coons_invalid_shown");
    if (dto.linkedCorners && coonsMismatches(boundaries).length > 0) return message("coons_linked_corners_differ");
    return dto.state === undefined ? undefined : checkState(dto.state);
}

function check(data: unknown): Message | undefined {
    if (!Array.isArray(data)) return message("invalid_patch_data");
    if (data.length !== 1) return message("preset_has_no_patch");
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== "CoonsPatch" || !isRecord(entry[1])) return message("unknown_patch_type");
    return checkPatch(entry[1]);
}

/** The Preset collection of the Coons patch Demonstration: one entry holding the whole scene. */
export const coonsPresetCollection: PresetCollection<CoonsPresetData> = Object.freeze({
    key: COONS_PRESET_KEY,
    /** A Coons Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("unknown_patch_field", {value0: `graphState.${unknown}`});
        return graphState.initialized === undefined || typeof graphState.initialized === "boolean" ? undefined : message("invalid_state");
    },
    check(data: unknown): PresetDataCheck<CoonsPresetData> {
        const rejection = check(data);
        // The entry was checked above against the DTO rules.
        return rejection ? {rejection} : {data: data as CoonsPresetData};
    },
});
