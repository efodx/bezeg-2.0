/**
 * Prototype c1 "Dolga osvetlitev" (long exposure). Like a camera shutter held open, the board keeps a ghost of every
 * drawn object each time it moves: curves, segments, lines, circles and points. Fading ghosts (onion skin from
 * animation tools) show where something came from; held ghosts accumulate into families of curves, loci and envelopes.
 * Works on every JSXGraph SVG board because it only reads rendered nodes; nothing in the mathematical model changes.
 */
import type {Board} from "jsxgraph";
import "./ux.css";

type Mode = 'off' | 'fade' | 'hold';
const MODE_KEY = 'bezeg-ux-c1-mode';
const SVG_NS = 'http://www.w3.org/2000/svg';
const CAPTURE_INTERVAL_MS = 45;
const FADE_MS = 1700;
const HOLD_LIMIT = 4000;
const SKIPPED_TYPES = new Set(['axis', 'ticks', 'grid', 'text', 'image', 'button', 'checkbox', 'input', 'slider', 'polygon', 'label']);
const ATTRIBUTES: Record<string, readonly string[]> = {
    path: ['d'], line: ['x1', 'y1', 'x2', 'y2'], ellipse: ['cx', 'cy', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], polyline: ['points'], polygon: ['points'],
};

function readMode(): Mode {
    try {
        const stored = sessionStorage.getItem(MODE_KEY);
        if (stored === 'off' || stored === 'fade' || stored === 'hold') return stored;
    } catch { /* storage may be unavailable */ }
    return 'fade';
}

function storeMode(mode: Mode) {
    try { sessionStorage.setItem(MODE_KEY, mode); } catch { /* storage may be unavailable */ }
}

function signature(node: Element): string | undefined {
    const names = ATTRIBUTES[node.tagName.toLowerCase()];
    if (!names) return undefined;
    return names.map(name => node.getAttribute(name) ?? '').join('|');
}

function visible(element: any, node: Element): boolean {
    if (element.visPropCalc && element.visPropCalc.visible === false) return false;
    const style = (node as SVGElement).style;
    return style.visibility !== 'hidden' && style.display !== 'none';
}

export function attachLongExposure(board: Board): () => void {
    const renderer: any = board.renderer;
    const svg: SVGSVGElement | undefined = renderer?.svgRoot;
    const container = board.containerObj as HTMLElement | undefined;
    if (!svg || !container) return () => undefined;
    const ghosts = document.createElementNS(SVG_NS, 'g');
    ghosts.setAttribute('class', 'ux-ghosts');
    ghosts.setAttribute('aria-hidden', 'true');
    const firstLayer = renderer.layer?.[0] as Element | undefined;
    svg.insertBefore(ghosts, firstLayer && firstLayer.parentNode === svg ? firstLayer.nextSibling : svg.firstChild);

    let mode: Mode = readMode();
    let lastCapture = 0;
    let frame = 0;
    let viewKey = '';
    let held = 0;
    let baselined = false;
    // Identity-free: a shape is new when its geometry was not drawn in the previous capture, so graphs that rebuild
    // their constructions on each change trace just like graphs that move their objects.
    let previousShapes = new Set<string>();

    const clear = () => {
        ghosts.replaceChildren();
        held = 0;
    };

    const currentViewKey = () => `${board.getBoundingBox().map(v => v.toFixed(6)).join(',')}|${svg.clientWidth}x${svg.clientHeight}`;

    const capture = (now: number) => {
        frame = 0;
        const key = currentViewKey();
        const viewChanged = key !== viewKey;
        if (viewChanged) {
            viewKey = key;
            clear();
            baselined = false;
        }
        lastCapture = now;
        const objects: any[] = (board as any).objectsList ?? [];
        const fragment = document.createDocumentFragment();
        const shapes = new Set<string>();
        for (const element of objects) {
            const node: Element | undefined = element?.rendNode;
            if (!node || SKIPPED_TYPES.has(element.elType) || !visible(element, node)) continue;
            const sig = signature(node);
            if (sig === undefined) continue;
            const key = `${node.tagName}|${sig}`;
            shapes.add(key);
            if (viewChanged || previousShapes.has(key) || mode === 'off' || !baselined) continue;
            const ghost = node.cloneNode(false) as SVGElement;
            ghost.removeAttribute('id');
            ghost.removeAttribute('marker-start');
            ghost.removeAttribute('marker-end');
            ghost.removeAttribute('filter');
            ghost.setAttribute('class', `ux-ghost ux-ghost-${mode}`);
            if (element.elType === 'point' || element.elType === 'glider') ghost.classList.add('ux-ghost-dot');
            fragment.appendChild(ghost);
        }
        previousShapes = shapes;
        baselined = true;
        const added = fragment.childNodes.length;
        if (added === 0) return;
        ghosts.appendChild(fragment);
        if (mode === 'fade') {
            window.setTimeout(() => {
                for (let i = 0; i < added && ghosts.firstChild; i++) ghosts.firstChild.remove();
            }, FADE_MS);
        } else {
            held += added;
            while (held > HOLD_LIMIT && ghosts.firstChild) {
                ghosts.firstChild.remove();
                held--;
            }
        }
    };

    const onUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(now => {
            if (now - lastCapture < CAPTURE_INTERVAL_MS) {
                frame = 0;
                window.setTimeout(onUpdate, CAPTURE_INTERVAL_MS - (now - lastCapture));
                return;
            }
            capture(now);
        });
    };
    board.on('update', onUpdate);

    // The switch on the board: off, fading trail, held exposure, and clear.
    const panel = document.createElement('div');
    panel.className = 'ux-exposure';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Dolga osvetlitev');
    const options: {mode: Mode; label: string; title: string}[] = [
        {mode: 'off', label: 'Izklop', title: 'Brez sledi'},
        {mode: 'fade', label: 'Sled', title: 'Gibanje pušča bledečo sled'},
        {mode: 'hold', label: 'Osvetlitev', title: 'Zaslonka ostane odprta: sledi se nabirajo v družino krivulj'},
    ];
    const icon = document.createElement('span');
    icon.className = 'ux-exposure-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.5 13 10M17.5 10 10 13M10 17.5 7 10M2.5 10 10 7" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>';
    panel.appendChild(icon);
    const buttons = options.map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.label;
        button.title = option.title;
        button.addEventListener('click', event => {
            event.stopPropagation();
            mode = option.mode;
            storeMode(mode);
            clear();
            render();
        });
        panel.appendChild(button);
        return {button, option};
    });
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ux-exposure-clear';
    clearButton.textContent = 'Počisti';
    clearButton.addEventListener('click', event => {
        event.stopPropagation();
        clear();
    });
    panel.appendChild(clearButton);
    const render = () => {
        for (const {button, option} of buttons) button.setAttribute('aria-pressed', String(option.mode === mode));
        clearButton.hidden = mode !== 'hold';
        panel.dataset.mode = mode;
    };
    render();
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) panel.addEventListener(type, event => event.stopPropagation());
    container.appendChild(panel);
    viewKey = currentViewKey();
    capture(performance.now());

    return () => {
        if (frame) window.cancelAnimationFrame(frame);
        try { board.off('update', onUpdate); } catch { /* the board may already be freed */ }
        ghosts.remove();
        panel.remove();
    };
}
