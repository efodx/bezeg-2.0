import type {Board} from "jsxgraph";

/**
 * The face of plain (non-MathJax) board text: the site's display face Literata, then the Georgia fallback that the
 * function family used before. The list is written out because exported SVG cannot resolve a CSS variable; keep it equal
 * to `--bezeg-font-display` in `src/shellTokens.css`.
 */
export const BOARD_FONT_FAMILY = '"Literata",Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif';

/** CSS declarations for plain board text: the shared face with lining, tabular numerals. */
export const BOARD_TEXT_STYLE = `font-family:${BOARD_FONT_FAMILY};font-variant-numeric:lining-nums tabular-nums;`;

/**
 * Gives every text the board creates without its own `cssStyle` the shared face. JSXGraph copies `JXG.Options` per
 * board (`board.options`), so this changes this board only; texts and labels read it when they are created.
 */
export function applyBoardTextDefaults(board: Board): void {
    const text = board.options?.text; // absent on the stub boards of session tests
    if (!text) return;
    text.cssDefaultStyle = BOARD_TEXT_STYLE;
    text.highlightCssDefaultStyle = BOARD_TEXT_STYLE;
}
