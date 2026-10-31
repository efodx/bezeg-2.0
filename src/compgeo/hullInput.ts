import {assertGridPoint, type GridPoint} from './grid';

/** Input limit shared by the hull traces; keeps traces to a few thousand events at most. */
export const HULL_TRACE_MAX_POINTS = 40;

/**
 * Validates the input (array, at most 40 grid points) and returns the indices of the distinct points in input order,
 * keeping the first index of each duplicate, plus the index of the lexicographically smallest point (or -1).
 */
export function distinctHullInput(points: readonly GridPoint[]): { unique: number[]; start: number } {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (points.length > HULL_TRACE_MAX_POINTS) {
        throw new RangeError(`at most ${HULL_TRACE_MAX_POINTS} points are supported`);
    }
    points.forEach((p, i) => assertGridPoint(p, `points[${i}]`));
    const unique: number[] = [];
    for (let i = 0; i < points.length; i++) {
        if (!unique.some((u) => points[u].x === points[i].x && points[u].y === points[i].y)) unique.push(i);
    }
    let start = -1;
    for (const i of unique) {
        if (start < 0 || points[i].x < points[start].x
            || (points[i].x === points[start].x && points[i].y < points[start].y)) start = i;
    }
    return {unique, start};
}

/** The given indices ordered lexicographically by (x, y), for the n' < 3 output. */
export function sortedLex(points: readonly GridPoint[], indices: readonly number[]): number[] {
    return [...indices].sort((a, b) => points[a].x - points[b].x || points[a].y - points[b].y);
}
