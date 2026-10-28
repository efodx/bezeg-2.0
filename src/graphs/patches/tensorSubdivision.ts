import type {PatchDirection, TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";

/**
 * Pure subdivision helpers for a tensor-product Bezier patch: the split itself (delegated to the
 * patch kernel), the inverse parameter map and the elevation gate. No React, Three, JSXGraph or graph state.
 */

/** Split values the route accepts; the kernel's extrapolation outside `[0, 1]` is not exposed. */
export const SUBDIVISION_RANGE = {min: 0.05, max: 0.95} as const;

export type SubdivisionPiece = "left" | "right";

export interface PieceLocation {
    piece: SubdivisionPiece;
    /** Local parameters of the piece (unit domain), `u` along the first net index. */
    u: number;
    v: number;
}

function checkSplit(direction: PatchDirection, value: number): void {
    if (direction !== "u" && direction !== "v") throw new RangeError("Subdivision direction must be 'u' or 'v'.");
    if (!Number.isFinite(value) || !(value > 0 && value < 1)) throw new RangeError("The subdivision value must lie strictly between 0 and 1.");
}

/**
 * `[left, right]` with `S_L(s, .) = S(value s, .)` and `S_R(s, .) = S(value + (1 - value) s, .)`
 * in the split direction; both keep the bi-degree of `patch`.
 */
export function subdivisionPieces(patch: TensorProductBezierPatch, direction: PatchDirection, value: number): [TensorProductBezierPatch, TensorProductBezierPatch] {
    checkSplit(direction, value);
    return patch.subdivide(direction, value);
}

/**
 * Inverse map: which piece displays the original parameters `(u, v)` and where. The split coordinate
 * maps to `s = c / value` (left, `c <= value`) or `s = (c - value) / (1 - value)` (right); the other
 * coordinate is unchanged. At `c = value` both pieces agree and the left piece is reported with `s = 1`.
 */
export function locateInPieces(direction: PatchDirection, value: number, u: number, v: number): PieceLocation {
    checkSplit(direction, value);
    const coordinate = direction === "u" ? u : v;
    const left = coordinate <= value;
    const local = left ? coordinate / value : (coordinate - value) / (1 - value);
    return {piece: left ? "left" : "right", u: direction === "u" ? local : u, v: direction === "v" ? local : v};
}

/** Whether degree elevation in `direction` stays within the route's maximum degree 4. */
export function canElevate(patch: TensorProductBezierPatch, direction: PatchDirection): boolean {
    if (direction !== "u" && direction !== "v") throw new RangeError("Elevation direction must be 'u' or 'v'.");
    return (direction === "u" ? patch.m : patch.n) < 4;
}
