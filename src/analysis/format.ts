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

/** Text a library already formatted (rounding, exponent) with the language's decimal separator: `0.25` is `0,25` in Slovenian. */
export function withDecimalSeparator(text: string, language: NumberLanguage): string {
    return language === 'sl' ? text.replace('.', ',') : text;
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

const SUPERSCRIPT_DIGITS: Readonly<Record<string, string>> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'};

/** `mantissa·10ⁿ` with `digits` significant digits (trailing mantissa zeros trimmed), decimal comma for Slovenian, true minus for the value; 0 is "0". */
export function formatScientific(value: number, language: NumberLanguage, digits = 3): string {
    if (!Number.isFinite(value)) return NOT_A_NUMBER_TEXT;
    if (value === 0) return '0';
    const [mantissa, exponent] = Math.abs(value).toExponential(Math.max(0, digits - 1)).split('e');
    const trimmed = mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa;
    const text = `${withDecimalSeparator(trimmed, language)}·10${String(Number(exponent)).replace(/./g, character => SUPERSCRIPT_DIGITS[character])}`;
    return value < 0 ? `${MINUS_SIGN}${text}` : text;
}

/** An angle in degrees as number text only (the degree sign stays in the catalog strings): `formatNumber` with two decimals by default. */
export function formatDegrees(value: number, language: NumberLanguage, maxDecimals = 2): string {
    return formatNumber(value, language, maxDecimals);
}

/**
 * A magnitude with `digits` significant digits, for errors and bounds that span many orders of magnitude: plain decimals from
 * 0.0001 to 1 000 000, "1,23·10⁻⁷" outside that range, and 0 for anything below 1e-12 (floating-point noise such as 1e-17 or -0
 * never reaches the reader). Decimal comma for Slovenian and a true minus sign.
 */
export function formatSignificant(value: number, language: NumberLanguage, digits = 4): string {
    if (!Number.isFinite(value)) return NOT_A_NUMBER_TEXT;
    const magnitude = Math.abs(value);
    if (magnitude < 1e-12) return '0';
    let text: string;
    if (magnitude >= 1e-4 && magnitude < 1e6) {
        text = withDecimalSeparator(String(Number(magnitude.toPrecision(digits))), language);
    } else {
        text = formatScientific(magnitude, language, digits);
    }
    return value < 0 ? `${MINUS_SIGN}${text}` : text;
}
