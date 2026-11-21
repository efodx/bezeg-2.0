import type {Board} from "jsxgraph";
import {uxEnabled} from "./flags";
import {attachLongExposure} from "./longExposure";
import {setPredictionBoard} from "./predict";
import {attachGrabGraph} from "./grabGraph";
import {attachMatchChallenge} from "./matchChallenge";
import {attachListen} from "./listen";
import {attachCompare} from "./compare";
import {attachLiveProse} from "./liveProse";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    // Board tools stay usable in lesson reading frames: the lesson's click-to-hide catcher lets clicks through to them.
    if (['c1', 'c5', 'c6', 'c7'].some(uxEnabled)) {
        document.documentElement.classList.add('ux-board-tools');
        disposers.push(() => document.documentElement.classList.remove('ux-board-tools'));
    }
    if (uxEnabled('c1')) disposers.push(attachLongExposure(board));
    if (uxEnabled('c4')) disposers.push(attachGrabGraph(board));
    if (uxEnabled('c5')) disposers.push(attachMatchChallenge(board));
    if (uxEnabled('c6')) disposers.push(attachListen(board));
    if (uxEnabled('c7')) disposers.push(attachCompare(board));
    if (uxEnabled('c8')) disposers.push(attachLiveProse(board));
    if (uxEnabled('c3')) {
        setPredictionBoard(board);
        disposers.push(() => setPredictionBoard(undefined));
    }
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}
