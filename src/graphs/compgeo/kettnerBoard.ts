import {kettnerSignMap} from "../../compgeo/inexactOrientation";
import {GraphPalette} from "../styles/GraphPalette";
import {KETTNER_SIZE, KettnerPanel, Sign} from "./hullRobustnessReadout";

/**
 * The Kettner sign map as board objects (task 19, spec convexity-hulls-lessons A5). The 4096 cells are one SVG image per panel
 * (built once, memoized: the map is a constant), so the board holds three objects in this mode: the image, a title and the
 * selected-cell outline. Sign is shown by shape and shade, never by colour alone: a plus mark on blue for +, a bar on orange for
 * -, a ring on grey for 0. In the inexact panel, a cell whose double sign differs from the exact sign also gets a dark frame.
 * Board coordinates: cell (i, j) is the unit square [i, i+1] x [j, j+1], i to the right and j up.
 */
const SHADE: Readonly<Record<"positive" | "negative" | "zero", string>> = {
    positive: GraphPalette.comparisonCurve, negative: GraphPalette.constructionAccent, zero: GraphPalette.referenceCurve,
};

const kindOf = (sign: Sign) => sign > 0 ? "positive" : sign < 0 ? "negative" : "zero";
const memo = new Map<KettnerPanel, string>();

/** The SVG of one panel. Pure; cells are drawn in `j` rows from the bottom, as the board's y axis points up. */
export function kettnerSvg(panel: KettnerPanel): string {
    const cached = memo.get(panel);
    if (cached) return cached;
    const shades: Record<"positive" | "negative" | "zero", string[]> = {positive: [], negative: [], zero: []};
    const plus: string[] = [];
    const bar: string[] = [];
    const ring: string[] = [];
    const frame: string[] = [];
    for (const cell of kettnerSignMap().cells) {
        const sign = panel === "exact" ? cell.exact : cell.naive;
        const x = cell.i;
        const y = KETTNER_SIZE - 1 - cell.j;
        shades[kindOf(sign)].push(`M${x} ${y}h1v1h-1z`);
        if (sign > 0) plus.push(`M${x}.2 ${y}.5h.6M${x}.5 ${y}.2v.6`);
        else if (sign < 0) bar.push(`M${x}.2 ${y}.5h.6`);
        else ring.push(`M${x}.25 ${y}.5a.25 .25 0 1 0 .5 0a.25 .25 0 1 0 -.5 0`);
        if (panel === "inexact" && cell.naive !== cell.exact) frame.push(`M${x}.07 ${y}.07h.86v.86h-.86z`);
    }
    const fillPath = (kind: keyof typeof shades) => shades[kind].length
        ? `<path fill="${SHADE[kind]}" fill-opacity=".38" shape-rendering="crispEdges" d="${shades[kind].join("")}"/>` : "";
    const stroke = (d: string[], extra = "") => d.length
        ? `<path fill="none" stroke="${GraphPalette.label}" stroke-width=".11" stroke-linecap="round"${extra} d="${d.join("")}"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KETTNER_SIZE} ${KETTNER_SIZE}" width="${KETTNER_SIZE * 8}" height="${KETTNER_SIZE * 8}">`
        + `<rect width="${KETTNER_SIZE}" height="${KETTNER_SIZE}" fill="${GraphPalette.boardSurface}"/>`
        + fillPath("positive") + fillPath("negative") + fillPath("zero")
        + stroke(plus) + stroke(bar) + stroke(ring)
        + (frame.length ? `<path fill="none" stroke="${GraphPalette.selectedControlPointOutline}" stroke-width=".1" d="${frame.join("")}"/>` : "")
        + `</svg>`;
    memo.set(panel, svg);
    return svg;
}

export const kettnerDataUrl = (panel: KettnerPanel): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(kettnerSvg(panel))}`;

/** The image of one panel over [0, 64] x [0, 64]; fixed, so no press or drag moves it. */
export function drawKettnerImage(board: JXG.Board, panel: KettnerPanel): JXG.GeometryElement {
    return board.create("image", [kettnerDataUrl(panel), [0, 0], [KETTNER_SIZE, KETTNER_SIZE]], {
        name: "kettner-image", withLabel: false, fixed: true, highlight: false, layer: 1,
    }) as JXG.GeometryElement;
}

/** How far the selection outline stands off the cell, in cells: clear of the mismatch frame, which sits inside the cell. */
export const KETTNER_SELECTION_OFFSET = 0.3;

/**
 * The selection outline of cell (i, j): a green (primary curve) square standing `KETTNER_SELECTION_OFFSET` outside the cell, so it
 * differs from the brown mismatch frame inside the cell by colour, by position and by width.
 */
export function drawKettnerCell(board: JXG.Board, i: number, j: number): JXG.GeometryElement {
    const lo = -KETTNER_SELECTION_OFFSET;
    const hi = 1 + KETTNER_SELECTION_OFFSET;
    return board.create("polygon", [[i + lo, j + lo], [i + hi, j + lo], [i + hi, j + hi], [i + lo, j + hi]], {
        name: "kettner-cell", withLabel: false, vertices: {visible: false}, fixed: true, highlight: false, layer: 6,
        fillColor: "none", fillOpacity: 0, hasInnerPoints: false,
        borders: {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, highlight: false, fixed: true},
    }) as JXG.GeometryElement;
}

/** The title above the panel; `text` is read on every board update, so a language switch needs only `board.update()`. */
export function drawKettnerTitle(board: JXG.Board, text: () => string): JXG.GeometryElement {
    return board.create("text", [0, KETTNER_SIZE + 1, text], {
        name: "kettner-title", anchorX: "left", anchorY: "bottom", fixed: true, highlight: false, display: "internal", fontSize: 15,
        strokeColor: GraphPalette.label, layer: 8,
    }) as JXG.GeometryElement;
}
