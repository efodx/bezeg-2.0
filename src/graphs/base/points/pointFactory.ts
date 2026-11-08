import type {Board} from "jsxgraph";
import {bindMovablePointCursor} from "../bindMovablePointCursor";

/** Creates a JSXGraph point and gives it the shared hover cursor. */
export function createMovablePoint(board: Board, coords: [number, number], attributes: object): JXG.Point {
    const point = board.create("point", coords, attributes) as JXG.Point;
    bindMovablePointCursor(point, board);
    return point;
}
