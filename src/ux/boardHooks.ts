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
import {attachFog} from "./fog";
import {attachDragTrace} from "./dragTrace";
import {attachDependence} from "./dependence";

/** Attaches the flagged lane C board prototypes to a main graph board; returns their disposal. */
export function attachUxBoard(board: Board): () => void {
    const disposers: (() => void)[] = [];
    // Board tools stay usable in lesson reading frames: the lesson's click-to-hide catcher lets clicks through to them.
    if (['c1', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24', 'c25', 'c26', 'c28', 'c29', 'c30'].some(uxEnabled)) {
        document.documentElement.classList.add('ux-board-tools');
        disposers.push(() => document.documentElement.classList.remove('ux-board-tools'));
    }
    if (['c16', 'c17', 'c18', 'c21', 'c23'].some(uxEnabled)) disposers.push(keepToolsInView(board));
    disposers.push(stackCornerTools(board));
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
    // c30 fits a law to the c24 sweep, so it brings c24 along.
    if (uxEnabled('c24') || uxEnabled('c25') || uxEnabled('c30')) disposers.push(attachDependence(board, uxEnabled('c25')));
    if (uxEnabled('c26')) disposers.push(attachDragTrace(board));
    if (uxEnabled('c27')) disposers.push(attachFog());
    // c29 gates Naprej with the c28 question, so it brings c28 along.
    if (uxEnabled('c28') || uxEnabled('c29')) disposers.push(attachDependence(board, 'choice', uxEnabled('c29')));
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

/**
 * With several prototypes on, their buttons share board corners. Each pass lets CSS place every corner tool, and when
 * two or more land in the same corner they are stacked in DOM order; bottom stacks also clear the c10 filmstrip.
 */
function stackCornerTools(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return () => undefined;
    const touched = new Set<HTMLElement>();
    const pass = () => {
        const tools = Array.from(container.children).filter((child): child is HTMLElement =>
            child instanceof HTMLElement && (child.tagName === 'BUTTON' || child.classList.contains('ux-nb')) && /(^| )ux-/.test(child.className));
        for (const tool of touched) { tool.style.removeProperty('top'); tool.style.removeProperty('bottom'); }
        touched.clear();
        const groups = new Map<string, {tool: HTMLElement; offset: number}[]>();
        const height = container.clientHeight;
        for (const tool of tools) {
            if (tool.hidden || tool.offsetParent === null) continue;
            const style = getComputedStyle(tool);
            if (style.position !== 'absolute') continue;
            const left = parseFloat(style.left), right = parseFloat(style.right), top = parseFloat(style.top), bottom = parseFloat(style.bottom);
            const side = left <= 14 ? 'left' : right <= 14 ? 'right' : '';
            if (!side) continue;
            const edge = top < height / 2 ? 'top' : 'bottom';
            const key = `${edge}-${side}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push({tool, offset: edge === 'top' ? top : bottom});
        }
        const film = container.querySelector<HTMLElement>(':scope > .ux-film');
        const filmHeight = film && !film.hidden && film.offsetParent !== null ? film.offsetHeight + 6 : 0;
        for (const [key, group] of groups) {
            const bottomEdge = key.startsWith('bottom');
            if (group.length < 2 && !(bottomEdge && filmHeight)) continue;
            let at = Math.min(...group.map(entry => entry.offset)) + (bottomEdge ? filmHeight : 0);
            const ordered = bottomEdge ? [...group].reverse() : group;
            for (const {tool} of ordered) {
                tool.style.setProperty(bottomEdge ? 'bottom' : 'top', `${Math.round(at)}px`);
                touched.add(tool);
                at += tool.offsetHeight + 8;
            }
        }
    };
    const interval = window.setInterval(pass, 700);
    window.addEventListener('resize', pass);
    window.setTimeout(pass, 50);
    return () => {
        window.clearInterval(interval);
        window.removeEventListener('resize', pass);
        for (const tool of touched) { tool.style.removeProperty('top'); tool.style.removeProperty('bottom'); }
    };
}
