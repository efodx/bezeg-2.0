/**
 * Bicubic Coons patch kernel (pure, no React/JSXGraph).
 *
 * Boundary convention (each boundary is a cubic Bezier: 4 control points `[x, y, z]`):
 *   c0(u) at v = 0,  c1(u) at v = 1   (functions of u)
 *   d0(v) at u = 0,  d1(v) at u = 1   (functions of v)
 * Corners: S(0,0)=c0[0]=d0[0], S(1,0)=c0[3]=d1[0], S(0,1)=c1[0]=d0[3], S(1,1)=c1[3]=d1[3].
 *
 * Net orientation matches `TensorProductBezierPatch`: `net[i][j]`, i is the u index, j the v index.
 *
 * Coons blend S = Lc + Ld - B with Lc = (1-v)c0 + v c1, Ld = (1-u)d0 + u d1 and B the bilinear
 * surface through the four corners. With cubic boundaries every term is bicubic, so the blend is
 * exactly the bicubic net P_ij = Lc_ij + Ld_ij - B_ij built from degree-elevated linear factors
 * (linear weights at thirds: 1, 2/3, 1/3, 0).
 *
 * The bilinear term B uses, per corner, the AVERAGE of the two boundary end points meeting there
 * (symmetric in c and d). When the corners coincide this is the shared corner and nothing changes.
 * With a corner gap g the blend is not an interpolant: both boundaries meeting at that corner
 * miss by g/2 there (see `coonsCornerCheck`).
 */

export type Vec3 = [number, number, number];

export interface CoonsBoundaries {
    c0: ReadonlyArray<Vec3>;
    c1: ReadonlyArray<Vec3>;
    d0: ReadonlyArray<Vec3>;
    d1: ReadonlyArray<Vec3>;
}

export type CoonsCornerName = "u0v0" | "u1v0" | "u0v1" | "u1v1";

export interface CoonsCornerMismatch {
    corner: CoonsCornerName;
    /** Distance between the two boundary end points that should coincide. */
    distance: number;
}

const NAMES = ["c0", "c1", "d0", "d1"] as const;

function validate(b: CoonsBoundaries): void {
    for (const name of NAMES) {
        const pts = b[name];
        if (!Array.isArray(pts) || pts.length !== 4) {
            throw new RangeError(`Coons boundary ${name} needs exactly 4 control points (cubic Bezier).`);
        }
        for (const p of pts) {
            if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) {
                throw new RangeError(`Coons boundary ${name} control points must be finite [x, y, z] triples.`);
            }
        }
    }
}

const mix = (a: Vec3, b: Vec3, s: number): Vec3 =>
    [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];

/** Net of the ruled surface (1-v)c0(u) + v c1(u), elevated to bicubic: Lc_ij = (1-j/3)c0_i + (j/3)c1_i. */
export function coonsRuledCNet(b: CoonsBoundaries): Vec3[][] {
    validate(b);
    return [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => mix(b.c0[i], b.c1[i], j / 3)));
}

/** Net of the ruled surface (1-u)d0(v) + u d1(v): Ld_ij = (1-i/3)d0_j + (i/3)d1_j. */
export function coonsRuledDNet(b: CoonsBoundaries): Vec3[][] {
    validate(b);
    return [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => mix(b.d0[j], b.d1[j], i / 3)));
}

/** Net of the bilinear corner surface (corners averaged over the two meeting boundaries), elevated to bicubic. */
export function coonsBilinearNet(b: CoonsBoundaries): Vec3[][] {
    validate(b);
    const s00 = mix(b.c0[0], b.d0[0], 0.5), s10 = mix(b.c0[3], b.d1[0], 0.5);
    const s01 = mix(b.c1[0], b.d0[3], 0.5), s11 = mix(b.c1[3], b.d1[3], 0.5);
    return [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => mix(mix(s00, s10, i / 3), mix(s01, s11, i / 3), j / 3)));
}

/** Exact bicubic Bezier net `net[i][j]` (i: u, j: v) of the Coons patch: Lc + Ld - B. */
export function coonsBicubicNet(b: CoonsBoundaries): Vec3[][] {
    const lc = coonsRuledCNet(b), ld = coonsRuledDNet(b), bi = coonsBilinearNet(b);
    return lc.map((row, i) => row.map((_, j): Vec3 => [
        lc[i][j][0] + ld[i][j][0] - bi[i][j][0],
        lc[i][j][1] + ld[i][j][1] - bi[i][j][1],
        lc[i][j][2] + ld[i][j][2] - bi[i][j][2],
    ]));
}

/** Relative corner tolerance: corners match within this times the extent of the boundary data. */
export const CORNER_RELATIVE_TOLERANCE = 1e-9;

/**
 * Compares the shared end points of the four boundaries. Tolerance is `relativeTolerance` times the
 * extent (largest bounding-box edge of the 16 control points) plus a rounding term
 * `8 * Number.EPSILON * max|coord|`, so it is translation invariant and far-from-origin data is not
 * falsely flagged. Returns the mismatched corners (empty when all agree).
 */
export function coonsCornerCheck(b: CoonsBoundaries, relativeTolerance = CORNER_RELATIVE_TOLERANCE): CoonsCornerMismatch[] {
    validate(b);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    let maxAbs = 0;
    for (const name of NAMES) for (const p of b[name]) for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k]);
        hi[k] = Math.max(hi[k], p[k]);
        maxAbs = Math.max(maxAbs, Math.abs(p[k]));
    }
    const extent = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    const tol = relativeTolerance * extent + 8 * Number.EPSILON * maxAbs;
    const pairs: [CoonsCornerName, Vec3, Vec3][] = [
        ["u0v0", b.c0[0], b.d0[0]],
        ["u1v0", b.c0[3], b.d1[0]],
        ["u0v1", b.c1[0], b.d0[3]],
        ["u1v1", b.c1[3], b.d1[3]],
    ];
    const out: CoonsCornerMismatch[] = [];
    for (const [corner, p, q] of pairs) {
        const distance = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        if (distance > tol) out.push({corner, distance});
    }
    return out;
}
