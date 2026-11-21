/**
 * Prototype c3 "Napovej" (predict, observe, compare; from science-museum exhibits that ask before they show, and from
 * the guess-then-reveal loop of games). Before a lesson step changes the graph, the board freezes on the old picture
 * and the student sketches the change they expect. Revealing fades the old picture away under the sketch, highlights
 * what really changed and scores how close the sketch came. Detection is generic: a step asks for a prediction only
 * when drawn shapes change while the view stays put, so lessons need no metadata.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape, Shape} from "./boardShapes";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_CHANGED_PIXELS = 36;

let currentBoard: Board | undefined;
let active: {dispose: () => void} | undefined;
const tally = {asked: 0, close: 0};

export function setPredictionBoard(board: Board | undefined) {
    if (!board) active?.dispose();
    currentBoard = board;
}

export function cancelPrediction() {
    active?.dispose();
}

function viewKey(board: Board): string {
    const svg = (board.renderer as any).svgRoot as SVGSVGElement;
    return `${board.getBoundingBox().map(v => v.toFixed(5)).join(',')}|${svg.clientWidth}x${svg.clientHeight}`;
}

function settle(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 260))));
}

function shapeExtent(points: [number, number][]): number {
    if (points.length < 2) return 0;
    let length = 0;
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    return length;
}

/** Called just before the lesson moves forward; the navigation itself runs unchanged right after. */
export function beginPrediction() {
    active?.dispose();
    const board = currentBoard;
    const svg = board && (board.renderer as any).svgRoot as SVGSVGElement | undefined;
    const container = board?.containerObj as HTMLElement | undefined;
    if (!board || !svg || !container || svg.clientWidth < 120) return;
    const beforeShapes = boardShapes(board);
    const before = new Set(beforeShapes.map(shape => shape.key));
    // Where something was already drawn: a rebuilt but unmoved object is not a change worth predicting.
    const drawn = new Set<string>();
    for (const shape of beforeShapes) for (const [x, y] of sampleShape(shape, 1.5)) drawn.add(`${Math.round(x / 2)},${Math.round(y / 2)}`);
    const wasDrawn = ([x, y]: [number, number]) => {
        const cx = Math.round(x / 2), cy = Math.round(y / 2);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (drawn.has(`${cx + dx},${cy + dy}`)) return true;
        return false;
    };
    const beforeView = viewKey(board);
    const width = svg.clientWidth, height = svg.clientHeight;

    // The frozen old picture covers the board at once, so the change is never seen before it is predicted.
    const overlay = document.createElement('div');
    overlay.className = 'ux-predict';
    if (width < 560) overlay.classList.add('ux-predict-compact');
    const frozen = document.createElement('div');
    frozen.className = 'ux-predict-frozen';
    for (const child of Array.from(container.children)) {
        // The board's SVG and its HTML labels (tick numbers, point names, formulas) make up the old picture.
        if (child === svg || child.classList.contains('JXGtext')) {
            const copy = child.cloneNode(true) as HTMLElement;
            copy.removeAttribute('id');
            copy.querySelectorAll('.ux-ghosts').forEach(node => node.remove());
            frozen.appendChild(copy);
        }
    }
    overlay.appendChild(frozen);
    container.appendChild(overlay);

    let disposed = false;
    const cleanups: (() => void)[] = [];
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        for (const cleanup of cleanups.splice(0)) cleanup();
        overlay.remove();
        document.documentElement.classList.remove('ux-predicting');
        if (active === handle) active = undefined;
    };
    const handle = {dispose};
    active = handle;

    void settle().then(() => {
        if (disposed) return;
        if (currentBoard !== board || viewKey(board) !== beforeView) { dispose(); return; }
        const changed = boardShapes(board).filter(shape => !before.has(shape.key));
        const targets = changed.map(shape => ({shape, points: sampleShape(shape)}))
            .filter(({points}) => points.some(([x, y]) => x >= 0 && y >= 0 && x <= width && y <= height))
            .filter(({points}) => points.length > 0 && points.filter(wasDrawn).length / points.length < 0.9);
        const strokes = targets.filter(target => !target.shape.dot && shapeExtent(target.points) >= MIN_CHANGED_PIXELS);
        const dots = targets.filter(target => target.shape.dot);
        if (strokes.length === 0 && dots.length === 0) { dispose(); return; }
        ask(board, overlay, frozen, strokes.length > 0 ? strokes : dots, strokes.length === 0, cleanups, dispose);
    });
}

function ask(board: Board, overlay: HTMLElement, frozen: HTMLElement, targets: {shape: Shape; points: [number, number][]}[], dotsOnly: boolean,
             cleanups: (() => void)[], dispose: () => void) {
    overlay.classList.add('ux-predict-asking');
    // The lesson's click-to-hide catcher lies over the board; while sketching, strokes reach the sketch instead.
    document.documentElement.classList.add('ux-predicting');
    const sketch = document.createElementNS(SVG_NS, 'svg');
    sketch.setAttribute('class', 'ux-predict-sketch');
    overlay.appendChild(sketch);
    const strokes: [number, number][][] = [];

    const card = document.createElement('div');
    card.className = 'ux-predict-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Napoved');
    card.innerHTML = `<p class="ux-predict-kicker">Napovej</p>
        <p class="ux-predict-text">${dotsOnly ? 'Ta korak premakne točke. Tapni, kam misliš, da bodo prišle.' : 'Ta korak spremeni graf. S prstom ali miško nariši, kako bo videti.'}</p>
        <div class="ux-predict-actions"><button type="button" class="ux-predict-reveal">Razkrij</button><button type="button" class="ux-predict-undo" hidden>Briši</button><button type="button" class="ux-predict-skip">Preskoči</button></div>`;
    overlay.appendChild(card);
    const reveal = card.querySelector<HTMLButtonElement>('.ux-predict-reveal')!;
    const undo = card.querySelector<HTMLButtonElement>('.ux-predict-undo')!;
    card.querySelector<HTMLButtonElement>('.ux-predict-skip')!.addEventListener('click', dispose);
    undo.addEventListener('click', () => {
        strokes.length = 0;
        sketch.replaceChildren();
        undo.hidden = true;
    });
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) card.addEventListener(type, event => event.stopPropagation());

    let drawing: SVGPolylineElement | undefined;
    let current: [number, number][] = [];
    const local = (event: PointerEvent): [number, number] => {
        const rect = sketch.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const draw = () => drawing?.setAttribute('points', current.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
    sketch.addEventListener('pointerdown', event => {
        if (overlay.classList.contains('ux-predict-revealed')) return;
        event.preventDefault();
        event.stopPropagation();
        sketch.setPointerCapture(event.pointerId);
        current = [local(event)];
        drawing = document.createElementNS(SVG_NS, 'polyline');
        drawing.setAttribute('class', 'ux-predict-stroke');
        sketch.appendChild(drawing);
        draw();
    });
    sketch.addEventListener('pointermove', event => {
        if (!drawing) return;
        const point = local(event);
        const last = current[current.length - 1];
        if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return;
        current.push(point);
        draw();
    });
    const finish = () => {
        if (!drawing) return;
        if (current.length === 1) {
            // A tap is a predicted point.
            const [x, y] = current[0];
            drawing.remove();
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('class', 'ux-predict-dot');
            dot.setAttribute('cx', String(x));
            dot.setAttribute('cy', String(y));
            dot.setAttribute('r', '7');
            sketch.appendChild(dot);
        }
        strokes.push(current);
        drawing = undefined;
        current = [];
        undo.hidden = false;
    };
    sketch.addEventListener('pointerup', finish);
    sketch.addEventListener('pointercancel', finish);

    reveal.addEventListener('click', () => {
        overlay.classList.remove('ux-predict-asking');
        overlay.classList.add('ux-predict-revealed');
        // The truth: the changed shapes, drawn once more as a glowing trace under the sketch.
        const truth = document.createElementNS(SVG_NS, 'g');
        truth.setAttribute('class', 'ux-predict-truth');
        for (const {shape} of targets) {
            const copy = shape.node.cloneNode(false) as SVGElement;
            copy.removeAttribute('id');
            copy.removeAttribute('marker-start');
            copy.removeAttribute('marker-end');
            copy.removeAttribute('style');
            if (shape.dot) copy.setAttribute('class', 'ux-truth-dot');
            truth.appendChild(copy);
        }
        sketch.insertBefore(truth, sketch.firstChild);
        frozen.classList.add('ux-predict-fading');
        const result = score(strokes, targets.flatMap(target => target.points), dotsOnly);
        tally.asked++;
        if (result.stars >= 2) tally.close++;
        const stars = [0, 1, 2].map(i => `<span class="${i < result.stars ? 'on' : ''}">✦</span>`).join('');
        card.innerHTML = `<p class="ux-predict-kicker">${result.title}</p>
            <p class="ux-predict-stars" aria-label="${result.stars} od 3">${stars}</p>
            <p class="ux-predict-text">${result.detail}</p>
            <p class="ux-predict-tally">Napovedi v tej seji: ${tally.close} od ${tally.asked} blizu</p>
            <div class="ux-predict-actions"><button type="button" class="ux-predict-done">Nadaljuj</button></div>`;
        card.querySelector<HTMLButtonElement>('.ux-predict-done')!.addEventListener('click', dispose);
        card.querySelector<HTMLButtonElement>('.ux-predict-done')!.focus();
    });
    reveal.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dispose(); };
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));
    void board;
}

function nearest(point: [number, number], cloud: [number, number][]): number {
    let best = Infinity;
    for (const [x, y] of cloud) {
        const d = (x - point[0]) ** 2 + (y - point[1]) ** 2;
        if (d < best) best = d;
    }
    return Math.sqrt(best);
}

/** Precision: how far the sketch strays from the truth; coverage: how much of the truth the sketch follows. */
function score(strokes: [number, number][][], truth: [number, number][], dotsOnly: boolean): {stars: number; title: string; detail: string} {
    const sketch = strokes.flat();
    if (sketch.length === 0 || truth.length === 0) {
        return {stars: 0, title: 'Razkrito', detail: 'Tokrat brez napovedi. Obarvano je tisto, kar se je spremenilo.'};
    }
    const precision = sketch.reduce((sum, point) => sum + nearest(point, truth), 0) / sketch.length;
    const coverage = dotsOnly ? truth.filter(point => nearest(point, sketch) < 30).length / truth.length
        : truth.filter(point => nearest(point, sketch) < 26).length / truth.length;
    const stars = precision < 16 && coverage > 0.55 ? 3 : precision < 32 && coverage > 0.3 ? 2 : precision < 70 ? 1 : 0;
    const titles = ['Poglej razliko', 'Prava smer', 'Zelo blizu', 'Zadetek!'];
    const detail = `Tvoja skica je v povprečju ${Math.round(precision)} px od prave lege in pokrije ${Math.round(coverage * 100)} % spremembe.`;
    return {stars, title: titles[stars], detail};
}
