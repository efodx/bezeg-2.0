/**
 * The box a Voronoi-style drawing follows: the board's visible area as integer grid units (shared by `VoronoiGraph` and
 * `FortuneGraph`; no graph state, no JSXGraph objects created).
 */
import {Rational} from "../../compgeo/rational";
import type {RationalBox} from "../../compgeo/voronoi";

/** Distance in pixels the follow box keeps from every view edge, so a 16 px "continues" glyph is fully visible. */
export const CONTINUES_INSET_PX = 16;

/**
 * The board's visible area as integer grid units (`scale` board units per grid unit), rounded INWARD and inset by
 * `CONTINUES_INSET_PX` so a whole "continues" marker (a 16 px glyph at the middle of an open side) is visible. Rounded outward
 * the markers would sit on or beyond the view edge. Fallbacks: if the inset box is empty (tiny board or huge zoom) the inward
 * box without the inset is used; if that is empty too, undefined (the caller then draws its own frame).
 */
export function visibleGridBox(board: JXG.Board, scale: number): RationalBox | undefined {
    const [left, top, right, bottom] = board.getBoundingBox();
    const edges = [left, right, bottom, top].map(v => v / scale);
    if (!edges.every(Number.isFinite)) return undefined;
    // pixels per grid unit on each axis; an unmeasured canvas gives no inset
    const [wx, wy] = [board.canvasWidth / (edges[1] - edges[0]), board.canvasHeight / (edges[3] - edges[2])];
    const [insetX, insetY] = [wx, wy].map(w => Number.isFinite(w) && w > 0 ? CONTINUES_INSET_PX / w : 0);
    const make = (ix: number, iy: number) => {
        const [minX, maxX, minY, maxY] = [Math.ceil(edges[0] + ix), Math.floor(edges[1] - ix), Math.ceil(edges[2] + iy), Math.floor(edges[3] - iy)];
        return maxX <= minX || maxY <= minY ? undefined : {minX: Rational.fromInt(minX), maxX: Rational.fromInt(maxX), minY: Rational.fromInt(minY), maxY: Rational.fromInt(maxY)};
    };
    return make(insetX, insetY) ?? make(0, 0);
}

/**
 * The visible box the drawing follows, or undefined while the board shows its starting view: loading a Preset re-applies that
 * view, which is not a change of view.
 */
export function followedGridBox(board: JXG.Board, scale: number, startView: readonly number[] | undefined): RationalBox | undefined {
    const view = board.getBoundingBox();
    if (startView && view.every((v, i) => Math.abs(v - startView[i]) <= 1e-9 * Math.max(1, Math.abs(v)))) return undefined;
    return visibleGridBox(board, scale);
}
