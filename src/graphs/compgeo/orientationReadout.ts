import {GridPoint} from "../../compgeo/grid";
import {orient, orientValue} from "../../compgeo/predicates";
import {MINUS_SIGN, NumberLanguage} from "../../analysis/format";

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

/** A triangle label is drawn only when the triangle is at least this tall (grid steps, smallest of its three heights). */
export const MIN_LABEL_HEIGHT = 1;

/**
 * Whether a label at the centroid of triangle abc has room: the smallest height (twice the area over the longest side,
 * in grid steps) is at least `MIN_LABEL_HEIGHT`. Thinner or smaller triangles would be covered by their own label.
 */
export function triangleFitsLabel(a: GridPoint, b: GridPoint, c: GridPoint): boolean {
    const longest = Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - b.x, c.y - b.y), Math.hypot(a.x - c.x, a.y - c.y));
    return longest > 0 && Math.abs(orientValue(a, b, c)) / longest >= MIN_LABEL_HEIGHT;
}
