/**
 * Removes floating-point noise left by rounding or slider arithmetic (and the sign of zero) without changing meaningful digits.
 * Model modules apply it when they accept an edited value, so every caller stores the same normalized number.
 */
export const cleanNumber = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/**
 * `cleanNumber` for a value that may legitimately be irrational (an endpoint such as pi): only floating-point noise (below 1e-12)
 * is removed, so pi stays exact while 0.1 + 0.2 becomes 0.3.
 */
export const cleanNoise = (value: number) => {
    const cleaned = cleanNumber(value);
    return Math.abs(cleaned - value) < 1e-12 ? cleaned : value;
};

/**
 * The integer k with value = k * step, or undefined when the value is not a finite number or not on that grid (within 1e-9
 * grid units: arithmetic noise only, never a real off-grid value).
 */
export function gridUnits(value: unknown, step: number): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const units = Math.round(value / step);
    return Math.abs(value / step - units) <= 1e-9 ? units : undefined;
}
