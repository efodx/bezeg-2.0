/**
 * Linear functions and lines through two points. Pure mathematics: no React, JSXGraph or graph state.
 */
import {formatNumber, MINUS_SIGN, NumberLanguage} from './format';

export interface Point2 {
    readonly x: number;
    readonly y: number;
}

/**
 * The line through two points. Two points with the same x determine a vertical line `x = c`, which is not the graph of a
 * function and has no slope. Coincident points do not determine a line at all.
 */
export type LineThroughPoints =
    | {readonly kind: 'line'; readonly k: number; readonly n: number}
    | {readonly kind: 'vertical'; readonly x: number}
    | {readonly kind: 'degenerate'};

/** Coordinates closer than this are treated as equal (the board snaps to a 0.1 grid, so real differences are far larger). */
export const COINCIDENCE_TOLERANCE = 1e-9;

export function lineThroughPoints(p1: Point2, p2: Point2, tolerance = COINCIDENCE_TOLERANCE): LineThroughPoints {
    const dx = p2.x - p1.x;
    if (Math.abs(dx) <= tolerance) {
        if (Math.abs(p2.y - p1.y) <= tolerance) return {kind: 'degenerate'};
        return {kind: 'vertical', x: p1.x};
    }
    const k = (p2.y - p1.y) / dx;
    const n = (p2.x * p1.y - p1.x * p2.y) / dx;
    return {kind: 'line', k, n};
}

export function lineValueAt(line: {readonly k: number; readonly n: number}, x: number): number {
    return line.k * x + line.n;
}

/** The legs of the slope triangle: `k = dy / dx`. `corner` is the right-angle vertex. */
export function slopeTriangle(p1: Point2, p2: Point2): {dx: number; dy: number; corner: Point2} {
    return {dx: p2.x - p1.x, dy: p2.y - p1.y, corner: {x: p2.x, y: p1.y}};
}

/** The points on the line `y = kx + n` that keep the given x-coordinates. */
export function pointsOnLine(line: {readonly k: number; readonly n: number}, x1: number, x2: number): [Point2, Point2] {
    return [{x: x1, y: lineValueAt(line, x1)}, {x: x2, y: lineValueAt(line, x2)}];
}

/**
 * Moves both points onto a new line keeping their x-coordinates. Unspecified parameters keep their current value.
 * Returns undefined when the current points do not determine a non-vertical line, because `k` and `n` are undefined then.
 */
export function moveAlongLine(p1: Point2, p2: Point2, change: {k?: number; n?: number}): [Point2, Point2] | undefined {
    const current = lineThroughPoints(p1, p2);
    if (current.kind !== 'line') return undefined;
    return pointsOnLine({k: change.k ?? current.k, n: change.n ?? current.n}, p1.x, p2.x);
}

/** Display text of the line equation: `y = 2x + 1`, `y = −x`, `y = 3` or, for a vertical line, `x = 1`. Empty for coincident points. */
export function lineEquation(line: LineThroughPoints, language: NumberLanguage): string {
    if (line.kind === 'degenerate') return '';
    if (line.kind === 'vertical') return `x = ${formatNumber(line.x, language)}`;
    const slope = formatNumber(Math.abs(line.k), language);
    const intercept = formatNumber(Math.abs(line.n), language);
    if (slope === '0') return `y = ${formatNumber(line.n, language)}`;
    const slopeTerm = `${line.k < 0 ? MINUS_SIGN : ''}${slope === '1' ? '' : slope}x`;
    if (intercept === '0') return `y = ${slopeTerm}`;
    return `y = ${slopeTerm} ${line.n < 0 ? MINUS_SIGN : '+'} ${intercept}`;
}
