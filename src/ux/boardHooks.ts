import type {Board} from "jsxgraph";
import {uxEnabled} from "./flags";
import {attachLongExposure} from "./longExposure";
import {setPredictionBoard} from "./predict";
import {attachGrabGraph} from "./grabGraph";
import {attachMatchChallenge} from "./matchChallenge";
import {attachListen} from "./listen";
import {attachCompare} from "./compare";
import {attachLiveProse} from "./liveProse";
import {attachQuiz} from "./quiz";
import {attachFilmstrip} from "./filmstrip";
import {attachGhostHand} from "./ghostHand";
import {attachMeasure} from "./measure";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    // Board tools stay usable in lesson reading frames: the lesson's click-to-hide catcher lets clicks through to them.
    if (['c1', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13'].some(uxEnabled)) {
        document.documentElement.classList.add('ux-board-tools');
        disposers.push(() => document.documentElement.classList.remove('ux-board-tools'));
    }
    if (uxEnabled('c1')) disposers.push(attachLongExposure(board));
    if (uxEnabled('c4')) disposers.push(attachGrabGraph(board));
    if (uxEnabled('c5')) disposers.push(attachMatchChallenge(board));
    if (uxEnabled('c6')) disposers.push(attachListen(board));
    if (uxEnabled('c7')) disposers.push(attachCompare(board));
    if (uxEnabled('c8') || uxEnabled('c12')) disposers.push(attachLiveProse(board, uxEnabled('c12')));
    if (uxEnabled('c9')) disposers.push(attachQuiz(board));
    if (uxEnabled('c10')) disposers.push(attachFilmstrip(board));
    if (uxEnabled('c11')) disposers.push(attachGhostHand(board));
    if (uxEnabled('c13')) disposers.push(attachMeasure(board));
    if (uxEnabled('c3')) {
        setPredictionBoard(board);
        disposers.push(() => setPredictionBoard(undefined));
    }
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}
