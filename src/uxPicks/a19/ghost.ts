import {flushSync} from 'react-dom';
import {asProbe, probeWindow} from '../a1/paramRegistry';

/** Shared by a19 and a29: find the board inside a frame, set it to a probed value, clone what moved, restore. */

export interface JxgObject {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}}
export interface JxgBoard {
    containerObj?: HTMLElement; objectsList: JxgObject[]; renderer: {svgRoot?: SVGSVGElement};
    origin?: {scrCoords: number[]}; unitX?: number; unitY?: number;
    on(event: string, handler: () => void): void; off(event: string, handler: () => void): void;
}
export interface Ghost {svg: SVGSVGElement; box: {width: number; height: number; left: number; top: number}}

const SKIPPED_TYPES = new Set([5, 18, 24]);
const DRAWN_TAGS = ['path', 'line', 'ellipse', 'circle', 'polygon', 'rect'];

export function findBoard(frame: HTMLElement | null): JxgBoard | undefined {
    const boards = (window as unknown as {JXG?: {boards?: Record<string, JxgBoard>}}).JXG?.boards;
    if (!frame || !boards) return undefined;
    let best: JxgBoard | undefined;
    for (const board of Object.values(boards)) {
        const container = board.containerObj;
        if (!container || !container.isConnected || !frame.contains(container)) continue;
        if (!best || container.clientWidth * container.clientHeight > best.containerObj!.clientWidth * best.containerObj!.clientHeight) best = board;
    }
    return best;
}

export const drawn = (board: JxgBoard) => board.objectsList.filter(object => object.rendNode && object.visPropCalc?.visible
    && !SKIPPED_TYPES.has(object.type) && object.elType !== 'axis' && object.elType !== 'text' && object.elType !== 'ticks'
    && DRAWN_TAGS.includes(object.rendNode.tagName.toLowerCase()));

export const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'transform']
    .map(name => node.getAttribute(name) ?? '').join('|');

/** Runs `write` and waits until the board has redrawn. */
export async function settle(board: JxgBoard, write: () => void) {
    let redrawn = false;
    const mark = () => { redrawn = true; };
    board.on('update', mark);
    try { asProbe(() => flushSync(write)); } finally { board.off('update', mark); }
    if (redrawn) return;
    await new Promise<void>(resolve => {
        let left = 4;
        const done = () => { board.off('update', done); resolve(); };
        const tick = () => { if (--left <= 0) done(); else requestAnimationFrame(tick); };
        board.on('update', done);
        requestAnimationFrame(tick);
    });
}

/** Sets the board to the probed value, clones what moved, restores the live value; undefined when nothing moved. */
export function captureGhost(frame: HTMLElement, board: JxgBoard, svg: SVGSVGElement, apply: () => void, restore: () => void): Promise<Ghost | undefined> {
    // The probed value never reaches the pucks and the view checks: the registry publishes nothing until the live value is back.
    return probeWindow(() => timed(() => capture(frame, board, svg, apply, restore)));
}

/** How long (ms) the last captures took, smoothed: a preview of an expensive graph backs off (see `scheduleCapture`). */
let cost = 0;
export const captureCost = () => cost;
async function timed<T>(run: () => Promise<T>): Promise<T> {
    const t = performance.now();
    try { return await run(); } finally { cost = cost === 0 ? performance.now() - t : 0.5 * cost + 0.5 * (performance.now() - t); }
}
/** Above this many ms per capture a preview waits for idle time instead of capturing on the next frame. */
export const EXPENSIVE_MS = 30;
/** The longest (ms) a pointer that keeps moving can delay an expensive preview. */
const MAX_WAIT_MS = 400;
const maxWait = () => Math.max(MAX_WAIT_MS, 4 * cost);
/**
 * The one queued capture of a preview. `poke()` asks for a capture of the latest job: next frame while captures are cheap;
 * once they cost more than EXPENSIVE_MS, after the pointer has rested 70 ms and the browser is idle (timeout fallback), the
 * rest restarting with each poke up to MAX_WAIT_MS. At most one is queued; the caller's `run` reads the latest job.
 */
export function captureQueue(run: () => void) {
    let cancel: (() => void) | undefined;
    let since = 0;
    const start = () => {
        if (cost <= EXPENSIVE_MS) { const id = requestAnimationFrame(fire); return () => cancelAnimationFrame(id); }
        let idle = 0;
        const rest = window.setTimeout(() => {
            if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(fire, {timeout: 300}); else idle = window.setTimeout(fire, 0);
        }, 70);
        return () => {
            window.clearTimeout(rest);
            if (idle) { if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else window.clearTimeout(idle); }
        };
    };
    const fire = () => { cancel = undefined; since = 0; run(); };
    return {
        poke() {
            if (cancel) {
                if (cost <= EXPENSIVE_MS || performance.now() - since > maxWait()) return;
                cancel(); // an expensive preview waits for the pointer to rest: the rest starts again
            } else since = performance.now();
            cancel = start();
        },
        stop() { cancel?.(); cancel = undefined; since = 0; },
    };
}

async function capture(frame: HTMLElement, board: JxgBoard, svg: SVGSVGElement, apply: () => void, restore: () => void): Promise<Ghost | undefined> {
    const before = new Map(drawn(board).map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
    let clone: SVGSVGElement;
    let changed: Set<string>;
    try {
        await settle(board, apply);
        clone = svg.cloneNode(true) as SVGSVGElement;
        changed = new Set(drawn(board).map(object => object.rendNode!).filter(node => before.get(node.id) !== shapeSignature(node)).map(node => node.id));
    } finally {
        await settle(board, restore);
    }
    clone.querySelectorAll('[id]').forEach(node => {
        const tag = node.tagName.toLowerCase();
        if (['path', 'line', 'ellipse', 'circle', 'polygon', 'rect', 'polyline'].includes(tag) && !changed.has(node.id)) node.remove();
    });
    clone.querySelectorAll('text, foreignObject, image').forEach(node => node.remove());
    clone.removeAttribute('id');
    const frameBox = frame.getBoundingClientRect(), box = svg.getBoundingClientRect();
    return changed.size ? {svg: clone, box: {width: box.width, height: box.height, left: box.left - frameBox.left, top: box.top - frameBox.top}} : undefined;
}
