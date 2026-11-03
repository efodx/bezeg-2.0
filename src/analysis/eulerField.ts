import {directionField, EULER_FIELD_MAX, EulerExample, FieldWindow} from './odeEuler';

/*
 * The slope marks of a direction field as one NaN-separated polyline (ADR 0037): two points per mark, then NaN. Every mark has the
 * same length in screen pixels, so the generator needs the board size; the mark's direction is the slope as the learner sees it,
 * that is F(x, y) scaled by the ratio of the pixel scales of the axes. Pure: no JSXGraph or React.
 */

/** The aimed width of a grid cell in pixels. */
export const FIELD_CELL_PX = 34;
/** The length of every mark in pixels. */
export const FIELD_MARK_PX = 20;

export interface FieldSize {
    readonly widthPx: number;
    readonly heightPx: number;
}

/** Columns from the width (at most EULER_FIELD_MAX), then rows for roughly square cells from the aspect (also at most EULER_FIELD_MAX). */
export function fieldGrid(size: FieldSize): { cols: number; rows: number } {
    const clamp = (value: number) => Math.min(EULER_FIELD_MAX, Math.max(1, Math.round(value)));
    const cols = clamp(size.widthPx / FIELD_CELL_PX);
    return {cols, rows: clamp(size.heightPx / (size.widthPx / cols))};
}

export interface FieldMarks {
    readonly x: number[];
    readonly y: number[];
    readonly cols: number;
    readonly rows: number;
}

/** The marks for the window; throws RangeError for an empty window or a non-positive board size (see `directionField`). */
export function fieldMarks(example: EulerExample, window: FieldWindow, size: FieldSize): FieldMarks {
    if (!(size.widthPx > 0) || !(size.heightPx > 0)) throw new RangeError('The board size must be positive.');
    const {cols, rows} = fieldGrid(size);
    const field = directionField(example, window, cols, rows);
    const pxPerX = size.widthPx / (window.xMax - window.xMin);
    const pxPerY = size.heightPx / (window.yMax - window.yMin);
    const half = FIELD_MARK_PX / 2;
    const x: number[] = [];
    const y: number[] = [];
    for (const segment of field.segments) {
        // The mark's direction on screen: x runs right, y runs up, so a slope s points along (1, s * pxPerY / pxPerX).
        const angle = Math.atan2(segment.slope * pxPerY, pxPerX);
        const dx = half * Math.cos(angle) / pxPerX;
        const dy = half * Math.sin(angle) / pxPerY;
        x.push(segment.x - dx, segment.x + dx, NaN);
        y.push(segment.y - dy, segment.y + dy, NaN);
    }
    return {x, y, cols, rows};
}
