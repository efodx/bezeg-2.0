import type {Board} from "jsxgraph";

/** Gives draggable JSXGraph points the same hover cursor across graph types. */
export function bindMovablePointCursor(point: JXG.Point, board: Pick<Board, "containerObj">): void {
    point.on("over", () => {
        if (!point.visProp.fixed) board.containerObj.style.cursor = "pointer";
    });
    point.on("out", () => {
        if (!point.visProp.fixed) board.containerObj.style.cursor = "default";
    });
}
