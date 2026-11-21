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
import {attachWhatIf} from "./whatIf";
import {attachScrubProse} from "./scrubProse";
import {attachInvariants} from "./invariants";
import {attachLaser} from "./laser";
import {attachRewind} from "./rewind";
import {attachSmallMultiples} from "./smallMultiples";
import {attachXyPad} from "./xyPad";
import {attachWhatChanged} from "./whatChanged";
import {attachLoupe} from "./loupe";
import {attachNotebook} from "./notebook";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    // Board tools stay usable in lesson reading frames: the lesson's click-to-hide catcher lets clicks through to them.
    if (['c1', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c19', 'c20', 'c21', 'c22', 'c23'].some(uxEnabled)) {
        document.documentElement.classList.add('ux-board-tools');
        disposers.push(() => document.documentElement.classList.remove('ux-board-tools'));
    }
    if (['c16', 'c17', 'c18', 'c21', 'c23'].some(uxEnabled)) disposers.push(keepToolsInView(board));
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
    // c15 scrubs inside the c14 fork, so it brings the fork along.
    if (uxEnabled('c14') || uxEnabled('c15')) disposers.push(attachWhatIf(board));
    if (uxEnabled('c15')) disposers.push(attachScrubProse(board));
    if (uxEnabled('c16')) disposers.push(attachInvariants(board));
    if (uxEnabled('c17')) disposers.push(attachLaser(board));
    if (uxEnabled('c18')) disposers.push(attachRewind(board));
    if (uxEnabled('c19')) disposers.push(attachSmallMultiples(board));
    if (uxEnabled('c20')) disposers.push(attachXyPad(board));
    if (uxEnabled('c21')) disposers.push(attachWhatChanged(board));
    if (uxEnabled('c22')) disposers.push(attachLoupe(board));
    if (uxEnabled('c23')) disposers.push(attachNotebook(board));
    if (uxEnabled('c3')) {
        setPredictionBoard(board);
        disposers.push(() => setPredictionBoard(undefined));
    }
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}

/**
 * Desktop boards are often taller than the window, so tools anchored to the board's bottom edge would sit below the
 * fold. The container gets `--ux-lift`: how far its bottom edge is below the window, which bottom-anchored tools add.
 */
function keepToolsInView(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;
    let frame = 0;
    const update = () => {
        frame = 0;
        const box = container.getBoundingClientRect();
        const lift = Math.max(0, Math.min(box.bottom - window.innerHeight, box.height - 140));
        container.style.setProperty('--ux-lift', `${Math.round(lift)}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    const interval = window.setInterval(schedule, 1000);
    update();
    return () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        window.clearInterval(interval);
        if (frame) cancelAnimationFrame(frame);
        container.style.removeProperty('--ux-lift');
    };
}
