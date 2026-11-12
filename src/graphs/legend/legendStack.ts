import {legendLines} from "./legendLines";

/** The pixel height of one legend row of `text` on a board `width` px wide: a one-line row takes `pitch`, a wrapped row takes 20 px a line. */
export function legendRowHeightPx(text: string, width: number, pitch: number): number {
    const lines = legendLines(text, width);
    return lines === 1 ? pitch : lines * 20;
}

/** How far below the first row (in px) row `index` lies: the visible rows above add up their heights, so no wrapped row runs into the next. */
export function legendStackOffsetPx(rows: readonly {text: string; visible: boolean}[], index: number, width: number, pitch: number): number {
    return rows.slice(0, index).filter(row => row.visible).reduce((sum, row) => sum + legendRowHeightPx(row.text, width, pitch), 0);
}

/** The extra pixels the wrapped visible rows take beyond a one-line row at `pitch`. */
export function legendWrapExtraPx(rows: readonly {text: string; visible: boolean}[], width: number, pitch: number): number {
    return rows.filter(row => row.visible).reduce((sum, row) => sum + legendRowHeightPx(row.text, width, pitch) - pitch, 0);
}
