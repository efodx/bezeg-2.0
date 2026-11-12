const LEGEND_CHAR_PX = 6.2; // measured: the 14 px legend font takes about 5.9 px a character

/** The lines a legend row takes on a board `width` px wide (10 px margin each side): the browser wraps it at the edge of the board. */
export function legendLines(text: string, width: number): number {
    return Math.max(1, Math.ceil((text.length * LEGEND_CHAR_PX) / Math.max(width - 20, 100)));
}

/** The pixel offset below the top of the board of legend row `index`: the rows above add up the lines each takes, so none runs into the next. */
export function legendRowOffset(texts: readonly string[], index: number, width: number): number {
    return 10 + texts.slice(0, index).reduce((sum, text) => sum + legendLines(text, width) * 20, 0);
}
