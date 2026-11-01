/**
 * Removes floating-point noise left by rounding or slider arithmetic (and the sign of zero) without changing meaningful digits.
 * Model modules apply it when they accept an edited value, so every caller stores the same normalized number.
 */
export const cleanNumber = (value: number) => Math.round(value * 1e9) / 1e9 + 0;
