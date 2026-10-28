import type {LessonPatchFixture} from "../../learning/model";
import type {PatchCollectionPresetData, Point3Dto} from "./patchDto";

/** The DTO net of a lesson patch fixture; a coordinate that is not a finite number is rejected here. */
function netDto(net: LessonPatchFixture["net"]): Point3Dto[] {
    if (!Array.isArray(net)) throw new Error("The lesson patch net must be a list of points.");
    return net.map((p): Point3Dto => {
        if (![p?.x, p?.y, p?.z].every(value => typeof value === "number" && Number.isFinite(value))) {
            throw new Error("The lesson patch net must have finite x, y and z coordinates.");
        }
        return [p.x, p.y, p.z];
    });
}

/** Preset data for the fixture when it is of `kind`; a fixture of the other kind throws. The Preset check validates degrees and length. */
export function lessonPatchPresetData(patch: LessonPatchFixture, kind: LessonPatchFixture["kind"]): PatchCollectionPresetData {
    if (patch.kind !== kind) throw new Error(`This demonstration shows ${kind} patches, but the lesson patch is ${String(patch.kind)}.`);
    if (patch.kind === "tensor") return [["TensorProductBezierPatch", {m: patch.m, n: patch.n, net: netDto(patch.net)}]];
    return [["TriangularBezierPatch", {n: patch.n, net: netDto(patch.net)}]];
}
