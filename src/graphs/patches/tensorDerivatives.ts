import type {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import type {Xyz} from "./surface-view/surfaceScene";

/**
 * Pure differential geometry of a tensor-product Bezier patch at a parameter pair, plus the
 * world-space segments a scene needs to draw it. No React, Three or graph state.
 */

export type NormalDegeneracy = "parallel" | "zero-su" | "zero-sv" | "both-zero";

export type PatchNormal =
    | {kind: "defined"; unit: Xyz}
    | {kind: "degenerate"; reason: NormalDegeneracy};

export interface TensorDifferentials {
    u: number;
    v: number;
    point: Xyz;
    su: Xyz;
    sv: Xyz;
    /** The twist vector `S_uv`. */
    twist: Xyz;
    /** Unit `S_u x S_v`, or the reason it does not exist at this parameter pair. */
    normal: PatchNormal;
}

export interface DifferentialOptions {
    /**
     * Relative degeneracy tolerance (default 1e-9). Lengths are compared with `tolerance * D` and the
     * cross product `|S_u x S_v|` with `tolerance * D^2`, where `D` is the diagonal of the control
     * net bounding box. Both sides scale with the net, so the classification is scale invariant.
     */
    tolerance?: number;
    /** Display length as a fraction of `D` (default 0.25). */
    displayFraction?: number;
    /** Arrowhead length as a fraction of the shaft length (default 0.2). */
    headFraction?: number;
}

export type Segment = [Xyz, Xyz];

export interface DifferentialArrow {
    name: "su" | "sv" | "twist" | "normal";
    /** Shaft from `point` to `point + k * vector`. */
    shaft: Segment;
    /** Two short segments ending at the shaft tip, forming the arrowhead. */
    head: [Segment, Segment];
}

export interface DifferentialDrawing {
    /** Display length `L = displayFraction * D` in world units. */
    displayLength: number;
    /** The one factor applied to `su`, `sv` and `twist` (see `drawDifferentials`). */
    vectorScale: number;
    arrows: DifferentialArrow[];
    /** Four corners in cyclic order, in the tangent plane; absent when the normal is degenerate. */
    tangentQuad?: [Xyz, Xyz, Xyz, Xyz];
}

export interface CornerDifferentials {
    u: 0 | 1;
    v: 0 | 1;
    differentials: TensorDifferentials;
}

export const DEFAULT_DEGENERACY_TOLERANCE = 1e-9;
const DEFAULT_DISPLAY_FRACTION = 0.25;
const DEFAULT_HEAD_FRACTION = 0.2;

const sub = (a: Xyz, b: Xyz): Xyz => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Xyz, b: Xyz): Xyz => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Xyz, k: number): Xyz => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Xyz, b: Xyz): Xyz => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Xyz): number => Math.hypot(a[0], a[1], a[2]);

/** Diagonal of the control net bounding box (0 for a net collapsed to one point). */
export function netDiagonal(patch: TensorProductBezierPatch): number {
    const [x0, x1, y0, y1, z0, z1] = patch.boundingBox();
    return Math.hypot(x1 - x0, y1 - y0, z1 - z0);
}

function xyzOf(p: {X(): number; Y(): number; Z?(): number}): Xyz {
    return [p.X(), p.Y(), p.Z?.() ?? 0];
}

/** `S`, `S_u`, `S_v`, `S_uv` and the unit normal at `(u, v)`; degeneracy decided with a scale-relative tolerance. */
export function tensorDifferentials(patch: TensorProductBezierPatch, u: number, v: number, options: DifferentialOptions = {}): TensorDifferentials {
    const tolerance = options.tolerance ?? DEFAULT_DEGENERACY_TOLERANCE;
    const size = netDiagonal(patch);
    const point = xyzOf(patch.eval(u, v));
    const su = xyzOf(patch.partialU(u, v));
    const sv = xyzOf(patch.partialV(u, v));
    const twist = xyzOf(patch.twist(u, v));
    const zeroU = length(su) <= tolerance * size;
    const zeroV = length(sv) <= tolerance * size;
    let normal: PatchNormal;
    if (zeroU && zeroV) normal = {kind: "degenerate", reason: "both-zero"};
    else if (zeroU) normal = {kind: "degenerate", reason: "zero-su"};
    else if (zeroV) normal = {kind: "degenerate", reason: "zero-sv"};
    else {
        const c = cross(su, sv);
        const cl = length(c);
        normal = cl <= tolerance * size * size || !Number.isFinite(cl)
            ? {kind: "degenerate", reason: "parallel"}
            : {kind: "defined", unit: scale(c, 1 / cl)};
    }
    return {u, v, point, su, sv, twist, normal};
}

/** Differentials at `(0,0)`, `(1,0)`, `(0,1)`, `(1,1)` in that order. */
export function cornerDifferentials(patch: TensorProductBezierPatch, options: DifferentialOptions = {}): CornerDifferentials[] {
    const corners: Array<[0 | 1, 0 | 1]> = [[0, 0], [1, 0], [0, 1], [1, 1]];
    return corners.map(([u, v]) => ({u, v, differentials: tensorDifferentials(patch, u, v, options)}));
}

/** A direction perpendicular to `d`, built from the world axis least aligned with it. */
function perpendicular(d: Xyz): Xyz {
    const a = [Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])];
    const axis: Xyz = a[0] <= a[1] && a[0] <= a[2] ? [1, 0, 0] : a[1] <= a[2] ? [0, 1, 0] : [0, 0, 1];
    const p = cross(d, axis);
    const l = length(p);
    return l > 0 ? scale(p, 1 / l) : [0, 0, 0];
}

function arrow(name: DifferentialArrow["name"], point: Xyz, delta: Xyz, headFraction: number): DifferentialArrow {
    const tip = add(point, delta);
    const len = length(delta);
    const side = scale(perpendicular(delta), 0.35 * headFraction * len);
    const base = add(tip, scale(delta, -headFraction));
    return {name, shaft: [point, tip], head: [[tip, add(base, side)], [tip, sub(base, side)]]};
}

/**
 * Arrows and tangent-plane quad for `d`, in world units.
 *
 * Scale rule: with `D` the net bounding-box diagonal and `L = displayFraction * D`, `su`, `sv` and
 * `twist` are all drawn multiplied by the same `k = L / max(|su|, |sv|, |twist|)` (0 when all
 * vanish), so their drawn lengths keep the true ratios and the longest has length `L`. The normal is
 * a unit vector drawn at length `L`, independent of `k`. The tangent quad has corners
 * `point +- (L/2) su/M +- (L/2) sv/M` with `M = max(|su|, |sv|)`, a parallelogram spanned by `su` and
 * `sv`; it lies in the tangent plane and is omitted when the normal is degenerate.
 */
export function drawDifferentials(d: TensorDifferentials, patch: TensorProductBezierPatch, options: DifferentialOptions = {}): DifferentialDrawing {
    const headFraction = options.headFraction ?? DEFAULT_HEAD_FRACTION;
    const displayLength = (options.displayFraction ?? DEFAULT_DISPLAY_FRACTION) * netDiagonal(patch);
    const longest = Math.max(length(d.su), length(d.sv), length(d.twist));
    const vectorScale = longest > 0 ? displayLength / longest : 0;
    const arrows: DifferentialArrow[] = [
        arrow("su", d.point, scale(d.su, vectorScale), headFraction),
        arrow("sv", d.point, scale(d.sv, vectorScale), headFraction),
        arrow("twist", d.point, scale(d.twist, vectorScale), headFraction),
    ];
    let tangentQuad: DifferentialDrawing["tangentQuad"];
    if (d.normal.kind === "defined") {
        arrows.push(arrow("normal", d.point, scale(d.normal.unit, displayLength), headFraction));
        const tangentMax = Math.max(length(d.su), length(d.sv));
        const a = scale(d.su, displayLength / 2 / tangentMax);
        const b = scale(d.sv, displayLength / 2 / tangentMax);
        tangentQuad = [sub(sub(d.point, a), b), sub(add(d.point, a), b), add(add(d.point, a), b), add(sub(d.point, a), b)];
    }
    return {displayLength, vectorScale, arrows, tangentQuad};
}

/** Convenience: differentials and drawing at once. */
export function differentialsWithDrawing(patch: TensorProductBezierPatch, u: number, v: number, options: DifferentialOptions = {}): {differentials: TensorDifferentials; drawing: DifferentialDrawing} {
    const differentials = tensorDifferentials(patch, u, v, options);
    return {differentials, drawing: drawDifferentials(differentials, patch, options)};
}

/** A smooth bicubic dome: every normal is defined. */
export function smoothDomeNet(): Xyz[][] {
    return Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j): Xyz => {
        const x = i - 1.5, y = j - 1.5;
        return [x, y, 2 - 0.3 * (x * x + y * y)];
    }));
}

/**
 * Bicubic with the whole `u = 0` row of the net (`net[0][*]`) at one point. Then `S_v(0, v) = 0` and the
 * normal there is "zero-sv", although a limit normal exists as `u` tends to 0.
 */
export function collapsedEdgeNet(): Xyz[][] {
    return Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j): Xyz => {
        if (i === 0) return [0, 0, 0];
        return [i, j - 1.5, 0.4 * i * (j % 2 === 0 ? 1 : -1) + 0.2 * j];
    }));
}

/**
 * Biquadratic whose corner edges `P_10 - P_00` and `P_01 - P_00` are parallel, so the normal at
 * `(0,0)` is "parallel", while the patch is not flat elsewhere.
 */
export function parallelCornerNet(): Xyz[][] {
    return [
        [[0, 0, 0], [2, 0, 0], [4, 0, 1]],
        [[1, 0, 0], [1, 1, 1], [3, 2, 1]],
        [[2, 0, 1], [2, 2, 1], [4, 3, 2]],
    ];
}
