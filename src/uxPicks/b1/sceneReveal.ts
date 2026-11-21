import {contentElements, elementSignature, svgRoot, type UxBoard, type UxElement} from './board';

export interface BoardPicture {
    board: UxBoard;
    entries: {signature: string; node: SVGElement | HTMLElement; clone: Node}[];
}

/** Remembers what the board shows, with detached copies of the drawing for anything that may disappear. */
export function captureBoardPicture(board: UxBoard): BoardPicture {
    return {board, entries: contentElements(board).map(element => ({
        signature: elementSignature(element),
        node: element.rendNode!,
        clone: element.rendNode!.cloneNode(true),
    }))};
}

const STROKED = new Set(['path', 'line', 'ellipse', 'polyline', 'polygon', 'circle']);
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function drawIn(node: SVGElement | HTMLElement, delay: number, element: UxElement) {
    const tag = node.tagName.toLowerCase();
    const isPoint = element.elType === 'point' || element.elType === 'glider' || element.elType === 'intersection';
    const isText = element.elType === 'text' || tag === 'div' || tag === 'text';
    if (!isPoint && !isText && STROKED.has(tag) && node instanceof SVGGeometryElement) {
        const fill = node.getAttribute('fill');
        const hasFill = fill && fill !== 'none' && Number(node.getAttribute('fill-opacity') ?? '1') > 0;
        node.setAttribute('pathLength', '1');
        const stroke = node.animate([
            {strokeDasharray: '1 1', strokeDashoffset: '1'},
            {strokeDasharray: '1 1', strokeDashoffset: '0'},
        ], {duration: 700, delay, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards'});
        stroke.finished.then(() => node.removeAttribute('pathLength'), () => node.removeAttribute('pathLength'));
        if (hasFill) node.animate([{fillOpacity: 0}, {fillOpacity: node.getAttribute('fill-opacity') ?? 1}], {duration: 600, delay: delay + 350, fill: 'backwards'});
        return;
    }
    node.animate([{opacity: 0}, {opacity: 1}], {duration: 450, delay: delay + (isText ? 250 : 0), fill: 'backwards'});
    if (isPoint && node instanceof SVGGraphicsElement) pingAt(node, delay);
}

/** A soft expanding ring where a new point appears. */
function pingAt(node: SVGGraphicsElement, delay: number) {
    const svg = node.ownerSVGElement;
    if (!svg) return;
    let box: DOMRect;
    try { box = node.getBBox(); } catch { return; }
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', String(box.x + box.width / 2));
    ring.setAttribute('cy', String(box.y + box.height / 2));
    ring.setAttribute('r', '6');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', node.getAttribute('fill') && node.getAttribute('fill') !== 'none' ? node.getAttribute('fill')! : '#b8733d');
    ring.setAttribute('stroke-width', '2');
    ring.setAttribute('pointer-events', 'none');
    svg.appendChild(ring);
    const animation = ring.animate([{r: '4px', opacity: 0.9}, {r: '22px', opacity: 0}], {duration: 800, delay, easing: 'ease-out', fill: 'both'});
    animation.finished.finally(() => ring.remove());
}

/** Draws in what appeared since `before` and lets what disappeared fade out as a ghost. Returns how many things changed. */
export function revealChanges(before: BoardPicture): number {
    if (reduceMotion()) return 0;
    const board = before.board;
    const svg = svgRoot(board);
    if (!svg || !board.containerObj.isConnected) return 0;
    const remaining = new Map<string, number>();
    for (const entry of before.entries) remaining.set(entry.signature, (remaining.get(entry.signature) ?? 0) + 1);
    const added: UxElement[] = [];
    for (const element of contentElements(board)) {
        const signature = elementSignature(element);
        const count = remaining.get(signature) ?? 0;
        if (count > 0) remaining.set(signature, count - 1);
        else added.push(element);
    }
    const removed: Node[] = [];
    for (const entry of [...before.entries].reverse()) {
        const count = remaining.get(entry.signature) ?? 0;
        if (count > 0) { remaining.set(entry.signature, count - 1); removed.push(entry.clone); }
    }
    if (added.length > 40) {
        svg.animate([{opacity: 0.35}, {opacity: 1}], {duration: 400});
        return added.length;
    }
    // Lines first, then points, then labels: the eye follows the construction.
    const rank = (element: UxElement) => element.elType === 'text' ? 2 : element.elType === 'point' || element.elType === 'glider' ? 1 : 0;
    added.sort((a, b) => rank(a) - rank(b)).forEach((element, index) => drawIn(element.rendNode!, Math.min(index, 10) * 90, element));
    if (removed.length && removed.length <= 40) {
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('pointer-events', 'none');
        layer.setAttribute('class', 'ux-ghost-layer');
        for (const clone of removed) if (clone instanceof SVGElement) layer.appendChild(clone);
        svg.insertBefore(layer, svg.firstChild?.nextSibling ?? null);
        const fade = layer.animate([{opacity: 0.55}, {opacity: 0}], {duration: 650, easing: 'ease-in', fill: 'forwards'});
        fade.finished.finally(() => layer.remove());
    }
    return added.length + removed.length;
}
