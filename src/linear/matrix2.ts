/**
 * 2x2 real matrix kernel for the linear maps family. Pure TypeScript: no React, JSXGraph, localization or graph state.
 *
 * Layout: `Mat2` is row-major, `[[a, b], [c, d]]` is the matrix with rows (a b) and (c d). The columns are the images of
 * e1 = (1, 0) and e2 = (0, 1): A(x, y) = x * (a, c) + y * (b, d).
 *
 * Discrete outcomes (singular, orientation, eigen class) are decided on snapped quarter-grid entries, where det and trace
 * are exact in doubles; never use a tolerance for them (docs/adr/0025-linear-map-graph-and-snapped-matrices.md, section 2).
 */

export type Mat2 = readonly [readonly [number, number], readonly [number, number]];
export type Vec2 = readonly [number, number];

/** Matrix entries are multiples of 1/4 in [-4, 4]. */
export const MATRIX_ENTRY_STEP = 1 / 4;
export const MATRIX_ENTRY_MIN = -4;
export const MATRIX_ENTRY_MAX = 4;

const plusZero = (value: number): number => (value === 0 ? 0 : value);

/** True for a finite multiple of 1/4 within [-4, 4]. Exact: multiples of 1/4 are exact doubles. */
export function isMatrixEntry(value: unknown): value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    if (value < MATRIX_ENTRY_MIN || value > MATRIX_ENTRY_MAX) return false;
    return Number.isInteger(value / MATRIX_ENTRY_STEP);
}

/**
 * The nearest quarter, clamped to [-4, 4] (never -0). Throws RangeError on a non-finite value: such input is rejected,
 * not snapped.
 */
export function snapMatrixEntry(value: number): number {
    if (!Number.isFinite(value)) throw new RangeError('The matrix entry must be a finite number.');
    const snapped = Math.round(value / MATRIX_ENTRY_STEP) * MATRIX_ENTRY_STEP;
    return plusZero(Math.min(MATRIX_ENTRY_MAX, Math.max(MATRIX_ENTRY_MIN, snapped)));
}

export const snapMatrix = (m: Mat2): Mat2 => [
    [snapMatrixEntry(m[0][0]), snapMatrixEntry(m[0][1])],
    [snapMatrixEntry(m[1][0]), snapMatrixEntry(m[1][1])],
];

export const isSnappedMatrix = (m: unknown): m is Mat2 =>
    Array.isArray(m) && m.length === 2
    && m.every((row) => Array.isArray(row) && row.length === 2 && row.every(isMatrixEntry));

export const IDENTITY: Mat2 = [[1, 0], [0, 1]];

/** A(x, y) = x * a1 + y * a2. */
export const apply = (m: Mat2, p: Vec2): Vec2 => [
    m[0][0] * p[0] + m[0][1] * p[1],
    m[1][0] * p[0] + m[1][1] * p[1],
];

/** The product B A: first A, then B. */
export const multiply = (b: Mat2, a: Mat2): Mat2 => [
    [b[0][0] * a[0][0] + b[0][1] * a[1][0], b[0][0] * a[0][1] + b[0][1] * a[1][1]],
    [b[1][0] * a[0][0] + b[1][1] * a[1][0], b[1][0] * a[0][1] + b[1][1] * a[1][1]],
];

export const det = (m: Mat2): number => m[0][0] * m[1][1] - m[0][1] * m[1][0];

export const trace = (m: Mat2): number => m[0][0] + m[1][1];

/** tr^2 - 4 det; exact on snapped entries. */
export const discriminant = (m: Mat2): number => trace(m) ** 2 - 4 * det(m);

/** Inverse by the adjugate; `undefined` when det is exactly 0 (the check precedes any division). */
export function inverse(m: Mat2): Mat2 | undefined {
    const d = det(m);
    if (d === 0) return undefined;
    return [
        [plusZero(m[1][1] / d), plusZero(-m[0][1] / d)],
        [plusZero(-m[1][0] / d), plusZero(m[0][0] / d)],
    ];
}

export const transpose = (m: Mat2): Mat2 => [[m[0][0], m[1][0]], [m[0][1], m[1][1]]];

/** (A + A^T) / 2. */
export const symmetricPart = (m: Mat2): Mat2 => {
    const off = (m[0][1] + m[1][0]) / 2;
    return [[m[0][0], off], [off, m[1][1]]];
};

/** Sign of det: 1, -1, or 0 for a singular matrix. */
export function orientationSign(m: Mat2): -1 | 0 | 1 {
    const d = det(m);
    return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** Images of the unit square vertices in the order 0, e1, e1 + e2, e2 (counter-clockwise before mapping). */
export const unitSquareImage = (m: Mat2): readonly [Vec2, Vec2, Vec2, Vec2] => [
    [0, 0],
    apply(m, [1, 0]),
    apply(m, [1, 1]),
    apply(m, [0, 1]),
];

export const LINEAR_MAP_EXAMPLE_IDS = [
    'identity', 'basis-default', 'orientation-reversing', 'singular', 'eigen-default', 'quarter-turn', 'shear',
    'symmetric', 'non-symmetric', 'reflection-x', 'scalar-2',
] as const;
export type LinearMapExampleId = typeof LINEAR_MAP_EXAMPLE_IDS[number];

/** The closed example list of the family (spec symbols in comments); every matrix is snapped. */
export const LINEAR_MAP_EXAMPLES: Readonly<Record<LinearMapExampleId, Mat2>> = {
    'identity': [[1, 0], [0, 1]],
    'basis-default': [[2, -1], [1, 1]], // A
    'orientation-reversing': [[1, 2], [2, 1]], // B
    'singular': [[1, 2], [1 / 2, 1]], // C
    'eigen-default': [[4, 1], [2, 3]], // E
    'quarter-turn': [[0, -1], [1, 0]], // R
    'shear': [[1, 1], [0, 1]], // S
    'symmetric': [[2, 1], [1, 2]], // S_y
    'non-symmetric': [[2, 1], [0, 1]], // N
    'reflection-x': [[1, 0], [0, -1]], // F
    'scalar-2': [[2, 0], [0, 2]], // 2I
};

export const isLinearMapExampleId = (value: unknown): value is LinearMapExampleId =>
    typeof value === 'string' && (LINEAR_MAP_EXAMPLE_IDS as readonly string[]).includes(value);
