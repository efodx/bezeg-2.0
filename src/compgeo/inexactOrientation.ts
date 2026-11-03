/**
 * Orientation in plain doubles, for lesson A5 (degenerate cases and robustness) only.
 *
 * INEXACT BY DESIGN: `orientNaiveDouble` evaluates the orientation determinant with rounding errors on arbitrary
 * numbers, so its sign can be wrong or falsely zero. It exists to be shown next to the exact answer and must never
 * be used by an algorithm; algorithms use the exact grid predicates in `predicates.ts`.
 */

/**
 * The determinant (q.x-p.x)(r.y-p.y) - (q.y-p.y)(r.x-p.x) evaluated in doubles, with p as the pivot. No grid check:
 * inputs may be any numbers, and the result carries floating-point rounding error.
 */
export function orientNaiveDouble(px: number, py: number, qx: number, qy: number, rx: number, ry: number): number {
    return (qx - px) * (ry - py) - (qy - py) * (rx - px);
}

/** A finite double as the exact value mantissa * 2^exponent (mantissa carries the sign). */
function decompose(value: number): { mantissa: bigint; exponent: number } {
    if (!Number.isFinite(value)) throw new RangeError('orientExactDyadic needs finite numbers');
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value);
    const bits = view.getBigUint64(0);
    const negative = (bits >> 63n) === 1n;
    const biased = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & ((1n << 52n) - 1n);
    const mantissa = biased === 0 ? fraction : fraction | (1n << 52n);
    const exponent = biased === 0 ? -1074 : biased - 1075;
    return {mantissa: negative ? -mantissa : mantissa, exponent};
}

/**
 * The exact sign (1, 0 or -1) of the same determinant as `orientNaiveDouble`, with no rounding. Every finite double is
 * a dyadic rational, so all six inputs are scaled to a common power of two and the determinant is evaluated in `BigInt`.
 */
export function orientExactDyadic(px: number, py: number, qx: number, qy: number, rx: number, ry: number): -1 | 0 | 1 {
    const parts = [px, py, qx, qy, rx, ry].map(decompose);
    const base = Math.min(...parts.map((part) => part.exponent));
    const [pX, pY, qX, qY, rX, rY] = parts.map((part) => part.mantissa << BigInt(part.exponent - base));
    const determinant = (qX - pX) * (rY - pY) - (qY - pY) * (rX - pX);
    return determinant > 0n ? 1 : determinant < 0n ? -1 : 0;
}

export interface KettnerCell {
    readonly i: number;
    readonly j: number;
    /** Sign of `naiveValue`. INEXACT: this is the double evaluation, possibly wrong or falsely zero. */
    readonly naive: -1 | 0 | 1;
    /** The double behind `naive`, for display; label it inexact. */
    readonly naiveValue: number;
    /** Exact sign of orient(p, q, r), via `orientExactDyadic`. */
    readonly exact: -1 | 0 | 1;
}

export interface KettnerSignMap {
    /** `cells[j * 64 + i]`, rows by j, columns by i, both 0..63. */
    readonly cells: readonly KettnerCell[];
    /** Cells whose naive sign is nonzero and differs from the exact sign. */
    readonly wrongSign: number;
    /** Cells whose naive value is 0 although the exact sign is not. */
    readonly falseZero: number;
    /** Cells whose naive and exact signs are equal. */
    readonly agree: number;
}

const KETTNER_SIZE = 64;
let kettnerMap: KettnerSignMap | null = null;

/**
 * Kettner et al.'s robustness grid for lesson A5: q = (12, 12), r = (24, 24) and the pivot
 * p = (0.5 + i 2^-53, 0.5 + j 2^-53) for 0 <= i, j < 64, each cell holding the double sign and the exact sign of
 * orient(p, q, r). The map is a constant, so it is computed once and the same frozen object is returned. Every
 * `naive` field is INEXACT and is shown next to `exact` only to teach why exact predicates are used.
 */
export function kettnerSignMap(): KettnerSignMap {
    if (kettnerMap) return kettnerMap;
    const unit = 2 ** -53;
    const cells: KettnerCell[] = [];
    let wrongSign = 0;
    let falseZero = 0;
    let agree = 0;
    for (let j = 0; j < KETTNER_SIZE; j++) {
        for (let i = 0; i < KETTNER_SIZE; i++) {
            const px = 0.5 + i * unit;
            const py = 0.5 + j * unit;
            const naiveValue = orientNaiveDouble(px, py, 12, 12, 24, 24);
            const naive = naiveValue > 0 ? 1 : naiveValue < 0 ? -1 : 0;
            const exact = orientExactDyadic(px, py, 12, 12, 24, 24);
            if (naive === exact) agree++;
            else if (naive === 0) falseZero++;
            else wrongSign++;
            cells.push(Object.freeze({i, j, naive, naiveValue, exact}));
        }
    }
    kettnerMap = Object.freeze({cells: Object.freeze(cells), wrongSign, falseZero, agree});
    return kettnerMap;
}
