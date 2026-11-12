import {fitBoundingBox, type FitBox, type FitPoint} from "../base/fitBoundingBox";

const LEGEND_CHAR_PX = 6.2; // measured: the 14 px legend font takes about 5.9 px a character

/** The lines a legend row takes on a board `width` px wide (10 px margin each side): the browser wraps it at the edge of the board. */
export function legendLines(text: string, width: number): number {
    return Math.max(1, Math.ceil((text.length * LEGEND_CHAR_PX) / Math.max(width - 20, 100)));
}

/** The pixel offset below the top of the board of legend row `index`: the rows above add up the lines each takes, so none runs into the next. */
export function legendRowOffset(texts: readonly string[], index: number, width: number): number {
    return 10 + texts.slice(0, index).reduce((sum, text) => sum + legendLines(text, width) * 20, 0);
}

/** The pixel height of the whole legend: the rows' lines stacked from the top, plus a small gap below the last row. */
export function legendBandPx(texts: readonly string[], width: number): number {
    return legendRowOffset(texts, texts.length, width) + 6;
}

/**
 * The view that frames `points` with the `fitBoundingBox` margin in the part of the board below a legend band of `bandPx` pixels,
 * with equal units. The band is its own strip above the data (at most 60% of the board, so the data keeps a usable part), so the
 * legend rows, drawn from the top, never lie over the data. Undefined without a usable canvas or a finite point.
 */
export function frameBelowLegend(points: readonly FitPoint[], width: number, height: number, bandPx: number): FitBox | undefined {
    const band = Math.min(Math.max(0, bandPx), 0.6 * height);
    const fitted = fitBoundingBox(points, width, height - band);
    if (!fitted) return undefined;
    const unit = width / (fitted[2] - fitted[0]);
    return [fitted[0], fitted[1] + band / unit, fitted[2], fitted[3]];
}
