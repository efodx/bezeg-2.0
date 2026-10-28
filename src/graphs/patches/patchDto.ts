import {Point} from "../../bezeg/api/point/point";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {TriangularBezierPatch} from "../../bezeg/impl/patch/triangular-bezier-patch";

export const PATCH_TYPE_NAMES = ["TensorProductBezierPatch", "TriangularBezierPatch"] as const;
export type PatchTypeName = typeof PATCH_TYPE_NAMES[number];
export const isPatchTypeName = (value: unknown): value is PatchTypeName => PATCH_TYPE_NAMES.some(name => name === value);

export type Point3Dto = readonly [number, number, number];

/** The authored view stored with a Preset. `el` is in radians within ±π/2; `target` is the orbit centre. */
export interface PatchCameraDto {
    readonly az: number;
    readonly el: number;
    readonly distance: number;
    readonly projection: "perspective";
    readonly target: Point3Dto;
}

/** How the tensor patch's de Casteljau construction proceeds; absent means `rows`. */
export const DECASTELJAU_ORDERS = ["rows", "columns", "bilinear"] as const;
export type DecasteljauOrder = typeof DECASTELJAU_ORDERS[number];
export const isDecasteljauOrder = (value: unknown): value is DecasteljauOrder => DECASTELJAU_ORDERS.some(order => order === value);

/** Scene state stored beside a patch: parameter point `u`, `v` in [0,1], display switches and the camera. */
export interface PatchStateDto {
    readonly camera?: PatchCameraDto;
    readonly u?: number;
    readonly v?: number;
    readonly showControlNet?: boolean;
    readonly showIsoCurves?: boolean;
    readonly showBoundaryCurves?: boolean;
    readonly showShading?: boolean;
    readonly showTangentPlane?: boolean;
    readonly showNormal?: boolean;
    readonly showDeCasteljau?: boolean;
    /** The construction order of the tensor `patch-decasteljau` Demonstration; absent means `rows`. */
    readonly decasteljauOrder?: DecasteljauOrder;
    /** Iso-curve and shading mesh density (8 or 16 intervals); absent means the default. */
    readonly isoDensity?: 8 | 16;
    readonly shadingDensity?: 8 | 16;
}
export const PATCH_STATE_FIELDS: readonly string[] = [
    "camera", "u", "v", "showControlNet", "showIsoCurves", "showBoundaryCurves", "showShading", "showTangentPlane", "showNormal", "showDeCasteljau", "decasteljauOrder", "isoDensity", "shadingDensity",
];

/** Row-major: `net[i * (n + 1) + j]` is the control point `b_ij` (i along u, j along v). */
export interface TensorPatchDto {
    readonly m: number;
    readonly n: number;
    readonly net: ReadonlyArray<Point3Dto>;
    readonly state?: PatchStateDto;
}

/** Canonical order: i from n down to 0, then j from n-i down to 0 (index 0 is (n,0,0), the last is (0,0,n)). */
export interface TriangularPatchDto {
    readonly n: number;
    readonly net: ReadonlyArray<Point3Dto>;
    readonly state?: PatchStateDto;
}

/** Preset data of a patch collection: `[patch type, patch DTO]` pairs, as curve collections store theirs. */
export type PatchCollectionPresetData = ReadonlyArray<
    readonly ["TensorProductBezierPatch", TensorPatchDto] | readonly ["TriangularBezierPatch", TriangularPatchDto]>;

const coordinates = (point: Point): Point3Dto => [point.X(), point.Y(), point.Z?.() ?? 0];
const toPoint = ([x, y, z]: Point3Dto): PointImpl => new PointImpl(x, y, undefined, z);

export function tensorPatchToDto(patch: TensorProductBezierPatch, state?: PatchStateDto): TensorPatchDto {
    const net = patch.getControlNet().flatMap(row => row.map(coordinates));
    return state === undefined ? {m: patch.m, n: patch.n, net} : {m: patch.m, n: patch.n, net, state};
}

/** Builds the patch from a DTO already accepted by the collection's `check`. */
export function tensorPatchFromDto(dto: TensorPatchDto): TensorProductBezierPatch {
    const columns = dto.n + 1;
    return new TensorProductBezierPatch(Array.from({length: dto.m + 1}, (_, i) => dto.net.slice(i * columns, (i + 1) * columns).map(toPoint)));
}

export function triangularPatchToDto(patch: TriangularBezierPatch, state?: PatchStateDto): TriangularPatchDto {
    const net = patch.getControlNet().map(coordinates);
    return state === undefined ? {n: patch.degree, net} : {n: patch.degree, net, state};
}

export function triangularPatchFromDto(dto: TriangularPatchDto): TriangularBezierPatch {
    return new TriangularBezierPatch(dto.net.map(toPoint));
}
