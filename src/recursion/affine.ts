/**
 * Affine map x -> m x + c with m = M/20 and c = C/10 for integers M and C. The classification decides from M and C only,
 * never from iterate values, and is exact for affine maps only.
 */

export const AFFINE_M_RANGE = {min: -60, max: 60} as const;
export const AFFINE_C_RANGE = {min: -100, max: 100} as const;

/** A reduced fraction with a positive denominator. */
export interface Rational {
    readonly num: bigint;
    readonly den: bigint;
}

export type AffineKind =
    | 'attracting' // |M| < 20
    | 'repelling' // |M| > 20: every start but the fixed point diverges
    | 'two-cycle' // M = -20: every start but the fixed point
    | 'all-fixed' // M = 20, C = 0
    | 'none'; // M = 20, C != 0: an arithmetic sequence with difference c

/** staircase M > 0, spiral M < 0, degenerate M = 0 (the first step lands on the fixed point). */
export type AffineShape = 'staircase' | 'spiral' | 'degenerate';

export interface AffineClassification {
    readonly kind: AffineKind;
    readonly shape: AffineShape;
    /** x* = 2C/(20 - M), exact; null when M = 20 (no unique fixed point). */
    readonly fixedPoint: Rational | null;
}

const gcd = (a: bigint, b: bigint): bigint => {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
};

export function rational(num: bigint, den: bigint): Rational {
    if (den === 0n) throw new RangeError('The denominator must not be zero.');
    const g = gcd(num, den) || 1n;
    const sign = den < 0n ? -1n : 1n;
    return {num: sign * num / g, den: sign * den / g};
}

export const isAffineM = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= AFFINE_M_RANGE.min && (value as number) <= AFFINE_M_RANGE.max;
export const isAffineC = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= AFFINE_C_RANGE.min && (value as number) <= AFFINE_C_RANGE.max;

function checkParameters(M: number, C: number): void {
    if (!isAffineM(M)) throw new RangeError('M must be an integer from -60 to 60.');
    if (!isAffineC(C)) throw new RangeError('C must be an integer from -100 to 100.');
}

/** The map x -> (M/20) x + C/10 in doubles. */
export function affineMap(M: number, C: number): (x: number) => number {
    checkParameters(M, C);
    const m = M / 20;
    const c = C / 10;
    return x => m * x + c;
}

export function affineFixedPoint(M: number, C: number): Rational | null {
    checkParameters(M, C);
    return M === 20 ? null : rational(BigInt(2 * C), BigInt(20 - M));
}

export function classifyAffine(M: number, C: number): AffineClassification {
    checkParameters(M, C);
    const abs = Math.abs(M);
    let kind: AffineKind;
    if (abs < 20) kind = 'attracting';
    else if (abs > 20) kind = 'repelling';
    else if (M === -20) kind = 'two-cycle';
    else kind = C === 0 ? 'all-fixed' : 'none';
    const shape: AffineShape = M === 0 ? 'degenerate' : M > 0 ? 'staircase' : 'spiral';
    return {kind, shape, fixedPoint: affineFixedPoint(M, C)};
}
