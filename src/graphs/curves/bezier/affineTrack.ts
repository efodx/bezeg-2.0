/**
 * The affine map T applied to a curve since its reference, tracked as a 2×3 matrix (pure: no React, JSXGraph or graph state).
 * `[[a, b, tx], [c, d, ty]]` maps (x, y) to (a x + b y + tx, c x + d y + ty). Each operation mirrors the curve's own gesture:
 * a turn and a reflection act about the mean of the control points, a scaling about the centre of their bounding box, a
 * translation adds a vector (`abstract-point-controlled-curve.ts`: `rotate`, `flip`, `scale`, `moveFor`).
 */
export type Affine = readonly [readonly [number, number, number], readonly [number, number, number]];
export type Pt = readonly [number, number];

export const IDENTITY: Affine = [[1, 0, 0], [0, 1, 0]];

export type AffineOperation =
    | {readonly kind: 'move'; readonly x: number; readonly y: number}
    | {readonly kind: 'scale'; readonly factor: number}
    | {readonly kind: 'rotate'; readonly theta: number}
    | {readonly kind: 'flip'; readonly x: boolean; readonly y: boolean};

/** The two centres the operations act about, read from the curve before the operation. */
export interface AffineCentres {
    readonly mean: Pt;
    readonly box: Pt;
}

export function applyAffine(m: Affine, p: Pt): Pt {
    return [m[0][0] * p[0] + m[0][1] * p[1] + m[0][2], m[1][0] * p[0] + m[1][1] * p[1] + m[1][2]];
}

/** The map that applies `earlier` first and `later` second. */
export function composeAffine(later: Affine, earlier: Affine): Affine {
    const row = (r: readonly [number, number, number]): [number, number, number] => [
        r[0] * earlier[0][0] + r[1] * earlier[1][0],
        r[0] * earlier[0][1] + r[1] * earlier[1][1],
        r[0] * earlier[0][2] + r[1] * earlier[1][2] + r[2],
    ];
    return [row(later[0]), row(later[1])];
}

/** `c + A (P - c)` for the linear part `A = [[a, b], [c, d]]`. */
function aboutCentre(a: number, b: number, c: number, d: number, centre: Pt): Affine {
    return [[a, b, centre[0] - a * centre[0] - b * centre[1]], [c, d, centre[1] - c * centre[0] - d * centre[1]]];
}

export function affineOfOperation(op: AffineOperation, centres: AffineCentres): Affine {
    switch (op.kind) {
        case 'move': return [[1, 0, op.x], [0, 1, op.y]];
        case 'scale': return aboutCentre(op.factor, 0, 0, op.factor, centres.box);
        case 'rotate': return aboutCentre(Math.cos(op.theta), -Math.sin(op.theta), Math.sin(op.theta), Math.cos(op.theta), centres.mean);
        case 'flip': return aboutCentre(op.x ? -1 : 1, 0, 0, op.y ? -1 : 1, centres.mean);
    }
}

/** The point of the Bézier curve with control points `points` at `t` (de Casteljau, independent of the curve classes). */
export function bezierPoint(points: readonly Pt[], t: number): Pt {
    let level = points.map(p => [p[0], p[1]] as [number, number]);
    while (level.length > 1) {
        level = level.slice(1).map((q, i) => [(1 - t) * level[i][0] + t * q[0], (1 - t) * level[i][1] + t * q[1]]);
    }
    return [level[0][0], level[0][1]];
}

export const meanOf = (points: readonly Pt[]): Pt => [
    points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length,
];

export function boxCentreOf(points: readonly Pt[]): Pt {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** T(B(t)): the reference curve at `t`, then mapped by `t`'s tracked map. */
export const mappedReferencePoint = (reference: readonly Pt[], map: Affine, t: number): Pt => applyAffine(map, bezierPoint(reference, t));

/** True when `current` is not `map` applied to `reference`: the points were moved by hand (or typed), not by a tracked operation. */
export function departsFromTrack(reference: readonly Pt[], map: Affine, current: readonly Pt[], tolerance = 1e-9): boolean {
    if (reference.length !== current.length) return true;
    return reference.some((p, i) => {
        const q = applyAffine(map, p);
        return Math.hypot(q[0] - current[i][0], q[1] - current[i][1]) > tolerance;
    });
}

/** True when the tracked map moves the reference at all. */
export const isIdentity = (m: Affine, tolerance = 1e-12): boolean =>
    [[1, 0, 0], [0, 1, 0]].every((row, i) => row.every((v, j) => Math.abs(m[i][j] - v) <= tolerance));
