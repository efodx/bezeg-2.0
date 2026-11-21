import type {Board} from "jsxgraph";
import {uxEnabled} from "./flags";
import {attachLongExposure} from "./longExposure";
import {setPredictionBoard} from "./predict";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    if (uxEnabled('c1')) disposers.push(attachLongExposure(board));
    if (uxEnabled('c3')) {
        setPredictionBoard(board);
        disposers.push(() => setPredictionBoard(undefined));
    }
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}
