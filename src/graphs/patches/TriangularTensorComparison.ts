/**
 * The tensor-product patch of the same boundary degree that a triangular net induces, for comparing the two domains.
 * Pure geometry: no graph, renderer or React types; evaluation stays in the `bezeg` patch kernels.
 */
import {triangularIndex} from "./TriangularPatchLattice";
import type {Xyz} from "./surface-view/surfaceScene";

/**
 * The `(n + 1) x (n + 1)` net `P[a][b]` (a along u, b along v) of the translational surface that shares the boundary
 * curves `v = 0` and `u = 0` with the triangular patch of degree `n`:
 * `P_(0,0) = b_(0,0,n)`, `P_(a,0) = b_(a,0,n-a)`, `P_(0,b) = b_(0,b,n-b)` and `P_(a,b) = P_(a,0) + P_(0,b) - P_(0,0)`.
 * Hence `S(u, v) = S(u, 0) + S(0, v) - S(0, 0)`. `net` is the canonical triangular net of degree `n`.
 */
export function tensorNetFromTriangular(net: ReadonlyArray<Xyz>, degree: number): Xyz[][] {
    const along = (a: number): Xyz => net[triangularIndex(degree, a, 0)];
    const across = (b: number): Xyz => net[triangularIndex(degree, 0, b)];
    const origin = across(0);
    return Array.from({length: degree + 1}, (_, a) => Array.from({length: degree + 1}, (_, b): Xyz => {
        const p = along(a), q = across(b);
        return [p[0] + q[0] - origin[0], p[1] + q[1] - origin[1], p[2] + q[2] - origin[2]];
    }));
}
