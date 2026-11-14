import type {Board} from "jsxgraph";

/**
 * Gives draggable JSXGraph points the same hover cursor across graph types.
 * Returns a release that removes both handlers; owners that dispose their listeners register it.
 */
export function bindMovablePointCursor(point: JXG.Point, board: Pick<Board, "containerObj">): () => void {
    const onOver = () => {
        if (!point.visProp.fixed) board.containerObj.style.cursor = "pointer";
    };
    const onOut = () => {
        if (!point.visProp.fixed) board.containerObj.style.cursor = "default";
    };
    point.on("over", onOver);
    point.on("out", onOut);
    return () => {
        point.off("over", onOver);
        point.off("out", onOut);
    };
}
