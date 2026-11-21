import {flushSync} from 'react-dom';
import {asProbe} from '../a1/paramRegistry';

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
export async function captureGhost(frame: HTMLElement, board: JxgBoard, svg: SVGSVGElement, apply: () => void, restore: () => void): Promise<Ghost | undefined> {
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
