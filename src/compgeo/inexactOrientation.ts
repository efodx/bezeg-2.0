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
