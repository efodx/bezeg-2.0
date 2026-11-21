import type {Board} from "jsxgraph";
import {uxEnabled} from "./flags";
import {attachLongExposure} from "./longExposure";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    if (uxEnabled('c1')) disposers.push(attachLongExposure(board));
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}
