/**
 * Prototype c22 "Lupa" (the iPhone text loupe, a jeweller's loupe, the magnifier in map apps). On a touch screen the
 * finger hides exactly the point it drags. While a point, curve or slider glider is being dragged, a round loupe
 * floats above the finger and shows the board under it magnified, live, with a crosshair and the dragged point's
 * coordinates. With a mouse it is switched on with the 🔍 button or by holding Alt while dragging.
 */
import type {Board} from "jsxgraph";
import {formatNumber, pointLabel} from "./measure";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';
const ZOOM = 2.4;

export function attachLoupe(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;
    if (!svg.id) svg.id = `ux-loupe-source-${Math.random().toString(36).slice(2, 9)}`;

    const loupe = document.createElement('div');
    loupe.className = 'ux-loupe';
    loupe.setAttribute('aria-hidden', 'true');
    loupe.hidden = true;
    const view = document.createElementNS(SVG_NS, 'svg');
    view.setAttribute('class', 'ux-loupe-view');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${svg.id}`);
    view.appendChild(use);
    const cross = document.createElement('span');
    cross.className = 'ux-loupe-cross';
    const label = document.createElement('span');
    label.className = 'ux-loupe-label';
    const lens = document.createElement('div');
    lens.className = 'ux-loupe-lens';
    lens.append(view, cross);
    loupe.append(lens, label);

    const fine = window.matchMedia('(pointer: fine)').matches;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-loupe-button';
    button.innerHTML = '<span aria-hidden="true">🔍</span> Lupa';
    button.title = 'Ob vlečenju točke pokaži povečavo (ali drži Alt)';
    button.setAttribute('aria-pressed', 'false');
    button.hidden = !fine;
    container.append(loupe, button);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) button.addEventListener(type, event => event.stopPropagation());
    let mouseOn = false;
    button.addEventListener('click', () => {
        mouseOn = !mouseOn;
        button.setAttribute('aria-pressed', String(mouseOn));
        button.classList.toggle('ux-loupe-on', mouseOn);
    });

    let pointer: {id: number; x: number; y: number; touch: boolean; alt: boolean} | undefined;
    let frame = 0;
    const size = () => (window.matchMedia('(max-width: 640px)').matches ? 116 : 140);

    const dragged = (): any => {
        const touches = (board as any).touches as {obj?: any}[] | undefined;
        return touches?.find(entry => entry?.obj)?.obj ?? (board as any).mouse?.obj;
    };
    const draw = () => {
        frame = 0;
        if (!pointer) return;
        const dragging = (board as any).mode === (board as any).BOARD_MODE_DRAG;
        if (!dragging || !(pointer.touch || mouseOn || pointer.alt)) { loupe.hidden = true; return; }
        const box = container.getBoundingClientRect();
        const object = dragged();
        // Centre on the dragged point itself when there is one (it may sit off the finger by the grab offset).
        let cx = pointer.x - box.left, cy = pointer.y - box.top;
        let text = '';
        const shown = object?.visPropCalc?.visible && object.coords
            && object.coords.scrCoords[1] >= 0 && object.coords.scrCoords[1] <= box.width
            && object.coords.scrCoords[2] >= 0 && object.coords.scrCoords[2] <= box.height;
        if (shown && (object.elType === 'point' || object.elType === 'glider')) {
            cx = object.coords.scrCoords[1];
            cy = object.coords.scrCoords[2];
            const name = pointLabel(object);
            text = `${name ? `${name} = ` : ''}(${formatNumber(object.X())}; ${formatNumber(object.Y())})`;
        } else {
            const origin = (board as any).origin.scrCoords as number[];
            text = `(${formatNumber((cx - origin[1]) / (board as any).unitX)}; ${formatNumber((origin[2] - cy) / (board as any).unitY)})`;
        }
        const d = size();
        const span = d / ZOOM;
        view.setAttribute('viewBox', `${cx - span / 2} ${cy - span / 2} ${span} ${span}`);
        // Above the finger; below it near the board's top edge; kept inside the board horizontally.
        const fingerX = pointer.x - box.left, fingerY = pointer.y - box.top;
        const gap = pointer.touch ? 46 : 28;
        let top = fingerY - gap - d;
        let left = fingerX - d / 2;
        if (top < 4) {
            // No room above: beside the finger, away from the hand (which covers what is below the finger).
            top = fingerY - d / 2;
            left = fingerX > box.width / 2 ? fingerX - gap - d : fingerX + gap;
        }
        top = Math.max(4, Math.min(box.height - d - 4, top));
        left = Math.max(4, Math.min(box.width - d - 4, left));
        loupe.style.width = loupe.style.height = `${d}px`;
        loupe.style.left = `${left}px`;
        loupe.style.top = `${top}px`;
        label.textContent = text;
        loupe.hidden = false;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };

    const onDown = (event: PointerEvent) => {
        if (!event.isTrusted || (event.target as HTMLElement).closest?.('button, .ux-xy, .ux-sm-sheet, .ux-inv-card')) return;
        pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType !== 'mouse', alt: event.altKey};
        // JSXGraph decides whether this press drags something in its own handler, after this capture listener.
        window.setTimeout(schedule, 0);
    };
    const onMove = (event: PointerEvent) => {
        if (!pointer || event.pointerId !== pointer.id) return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.alt = event.altKey;
        schedule();
    };
    const onUp = (event: PointerEvent) => {
        if (!pointer || event.pointerId !== pointer.id) return;
        pointer = undefined;
        loupe.classList.add('ux-loupe-out');
        window.setTimeout(() => { if (!pointer) { loupe.hidden = true; } loupe.classList.remove('ux-loupe-out'); }, 160);
    };
    container.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    board.on('update', schedule);

    return () => {
        container.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
        board.off('update', schedule);
        if (frame) cancelAnimationFrame(frame);
        loupe.remove(); button.remove();
    };
}
