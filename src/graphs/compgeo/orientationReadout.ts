import {GridPoint} from "../../compgeo/grid";
import {orient, orientValue} from "../../compgeo/predicates";
import {formatNumber, formatSignificant, MINUS_SIGN, NumberLanguage} from "../../analysis/format";

/**
 * Pure adapter from the points of the orientation graph (spec convexity-hulls-lessons A1) to what its readout shows.
 * No React, JSXGraph or localization: the component maps `turn` to words, so colour is never the only signal.
 */
export type OrientationTurn = "left" | "right" | "collinear";

export type OrientationReadout =
    | {readonly kind: "missing"; readonly have: number}
    | {readonly kind: "turn"; readonly value: number; readonly turn: OrientationTurn};

/** The exact `orientValue` (twice the signed area of p, q, r) of the first three points and its turn; `missing` below three. */
export function orientationReadout(points: readonly GridPoint[]): OrientationReadout {
    if (points.length < 3) return {kind: "missing", have: points.length};
    const [p, q, r] = points;
    const sign = orient(p, q, r);
    return {kind: "turn", value: orientValue(p, q, r), turn: sign > 0 ? "left" : sign < 0 ? "right" : "collinear"};
}

/** An integer with an explicit sign ("+8", "−8", "0"), using the true minus sign. */
export function formatSigned(value: bigint | number): string {
    const negative = value < 0;
    const digits = String(negative ? -value : value);
    return negative ? `${MINUS_SIGN}${digits}` : value === 0 || value === 0n ? "0" : `+${digits}`;
}

/** Half of a doubled (integer) value as exact text: "21" or "10,5" (decimal comma for Slovenian). */
export function formatHalf(doubled: bigint, language: NumberLanguage): string {
    const abs = doubled < 0n ? -doubled : doubled;
    const text = abs % 2n === 0n ? String(abs / 2n) : `${abs / 2n}${language === "sl" ? "," : "."}5`;
    return doubled < 0n ? `${MINUS_SIGN}${text}` : text;
}

/**
 * A grid-unit quantity as board text: `value * 2^scaleExponent` (areas and the orient determinant scale by 4^e, so 2e).
 * An integer board value prints exactly as `formatSigned`/`formatHalf` do; anything else is rounded to 2 decimals, with more
 * significant digits when that would print a nonzero value as zero.
 */
function boardText(numerator: bigint, scaleExponent: number, language: NumberLanguage, signed: boolean): string {
    const negative = numerator < 0n;
    const magnitude = negative ? -numerator : numerator;
    const approx = Number(magnitude) * 2 ** scaleExponent;
    let text = formatNumber(approx, language);
    if (text === "0" && magnitude !== 0n) text = formatSignificant(approx, language, 2);
    if (negative) return `${MINUS_SIGN}${text}`;
    return signed && magnitude !== 0n ? `+${text}` : text;
}

/** `formatSigned(value)` of the board value `value * 2^scaleExponent` (see `boardText`); identical when that is an integer. */
export function formatBoardSigned(value: bigint | number, scaleExponent: number, language: NumberLanguage): string {
    const grid = BigInt(value);
    if (scaleExponent >= 0) return formatSigned(grid * 2n ** BigInt(scaleExponent));
    const denominator = 2n ** BigInt(-scaleExponent);
    return grid % denominator === 0n ? formatSigned(grid / denominator) : boardText(grid, scaleExponent, language, true);
}

/** `formatHalf(doubled, language)` of the board value `doubled * 2^scaleExponent` (see `boardText`); identical when exact. */
export function formatBoardHalf(doubled: bigint, scaleExponent: number, language: NumberLanguage): string {
    if (scaleExponent >= 0) return formatHalf(doubled * 2n ** BigInt(scaleExponent), language);
    const denominator = 2n ** BigInt(-scaleExponent);
    return doubled % denominator === 0n ? formatHalf(doubled / denominator, language) : boardText(doubled, scaleExponent - 1, language, false);
}

/** A triangle label is drawn only when the triangle is at least this tall (board units, smallest of its three heights). */
export const MIN_LABEL_HEIGHT = 1;

/**
 * Whether a label at the centroid of triangle abc has room: the smallest height (twice the area over the longest side,
 * in board units) is at least `MIN_LABEL_HEIGHT`. `exponent` is the grid step exponent, so a grid-unit height is multiplied by
 * 2^exponent (an exact power of two). Thinner or smaller triangles would be covered by their own label.
 */
export function triangleFitsLabel(a: GridPoint, b: GridPoint, c: GridPoint, exponent = 0): boolean {
    const longest = Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - b.x, c.y - b.y), Math.hypot(a.x - c.x, a.y - c.y));
    return longest > 0 && Math.abs(orientValue(a, b, c)) / longest * 2 ** exponent >= MIN_LABEL_HEIGHT;
}
