/**
 * Number formatting for readouts. Pure: no React, JSXGraph or localization imports.
 * Never returns "Infinity" or "NaN"; a non-finite value is shown as an em dash.
 */
export type NumberLanguage = 'sl' | 'en';

export const MINUS_SIGN = '−';
export const NOT_A_NUMBER_TEXT = '—';

/** Rounds to at most `maxDecimals` places, drops trailing zeros, uses a decimal comma for Slovenian and a true minus sign. */
export function formatNumber(value: number, language: NumberLanguage, maxDecimals = 2): string {
    if (!Number.isFinite(value)) return NOT_A_NUMBER_TEXT;
    const fixed = value.toFixed(maxDecimals);
    const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
    const negative = trimmed.startsWith('-');
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    if (/^0(\.0*)?$/.test(unsigned)) return '0';
    const text = language === 'sl' ? unsigned.replace('.', ',') : unsigned;
    return negative ? `${MINUS_SIGN}${text}` : text;
}

/** The line y = slope x + intercept as text ("y = 0.5x + 1.5", "y = x − 0.25", "y = 0"), rounded like `formatNumber`. */
export function formatLineEquation(line: {readonly slope: number; readonly intercept: number}, language: NumberLanguage, maxDecimals = 2): string {
    const slope = formatNumber(line.slope, language, maxDecimals);
    const intercept = formatNumber(line.intercept, language, maxDecimals);
    if (slope === NOT_A_NUMBER_TEXT || intercept === NOT_A_NUMBER_TEXT) return `y = ${NOT_A_NUMBER_TEXT}`;
    if (slope === '0') return `y = ${intercept}`;
    const term = slope === '1' ? 'x' : slope === `${MINUS_SIGN}1` ? `${MINUS_SIGN}x` : `${slope}x`;
    if (intercept === '0') return `y = ${term}`;
    return intercept.startsWith(MINUS_SIGN) ? `y = ${term} ${MINUS_SIGN} ${intercept.slice(1)}` : `y = ${term} + ${intercept}`;
}
