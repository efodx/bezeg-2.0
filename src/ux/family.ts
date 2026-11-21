import {flushSync} from 'react-dom';
import type {Board} from 'jsxgraph';
import {getParam, type ParamEntry} from './paramRegistry';
import {drawn, signature} from './YourTurn';

/**
 * A family of pictures of the board: the shared capture behind a13 (ladder) and a14 (shape map). The board is put at
 * each combination of parameter values synchronously through the slider registry, its SVG is cloned, and the live
 * values are restored. Objects that change across the family are marked `ux-ladder-moves`, the rest `ux-ladder-still`.
 */

const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

function niceStep(raw: number, step: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [1, 2, 2.5, 5, 10].map(m => m * power).find(m => m >= raw * 0.999) ?? 10 * power;
    return step > 0 ? Math.max(step, Math.round(nice / step) * step) : nice;
}

function niceBelow(raw: number, step: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [10, 5, 2.5, 2, 1].map(m => m * power).find(m => m <= raw * 1.001) ?? power;
    return step > 0 ? Math.max(step, Math.floor(nice / step + 1e-9) * step) : nice;
}

/**
 * `count` values a nice distance apart that include the live value (so one picture is the board as it is now) and stay
 * inside the slider's range; `half` is how far the window reaches on each side. Cyclic parameters show a full turn.
 */
export function gridValues(entry: ParamEntry, center: number, half: number, count: number): number[] {
    const span = entry.max - entry.min;
    if (entry.cyclic !== undefined) return Array.from({length: count}, (_, i) => Number((entry.min + span * i / count).toPrecision(12)));
    // A nice distance for the window, but never so wide that the range cannot hold all the pictures.
    let d = Math.min(niceStep(2 * half / (count - 1), entry.step), niceBelow(span / (count - 1), entry.step));
    let out: number[] = [];
    // Pictures stay on multiples of d from the live value; when the range edge cuts one off, a smaller d fits them all.
    for (let attempt = 0; attempt < 6; attempt++) {
        let low = center - Math.floor((count - 1) / 2) * d;
        if (low < entry.min - 1e-9) low = center - Math.floor((center - entry.min) / d + 1e-9) * d;
        if (low + (count - 1) * d > entry.max + 1e-9) low = center + Math.floor((entry.max - center) / d + 1e-9) * d - (count - 1) * d;
        out = [];
        for (let i = 0; i < count; i++) {
            const value = Number((low + i * d).toPrecision(12));
            if (value >= entry.min - 1e-9 && value <= entry.max + 1e-9) out.push(value);
        }
        if (out.length >= count || d <= entry.step + 1e-12) break;
        d = niceBelow(d * 0.99, entry.step);
    }
    return out;
}

const container = (b: Board) => (b as unknown as {containerObj: HTMLElement}).containerObj;
export const svgRootOf = (b: Board) => (b as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;

/** Puts the board at these values and waits until it has redrawn them. */
export const settle = async (b: Board, keys: string[], values: number[]) => {
    const events = b as unknown as {on(event: string, handler: () => void): void; off(event: string, handler: () => void): void};
    let redrawn = false;
    const mark = () => { redrawn = true; };
    events.on('update', mark);
    try { flushSync(() => keys.forEach((key, i) => getParam(key)?.setFromLesson(values[i]))); } finally { events.off('update', mark); }
    if (redrawn) return;
    await new Promise<void>(resolve => {
        let left = 4;
        const done = () => { events.off('update', done); resolve(); };
        const tick = () => { if (--left <= 0) done(); else requestAnimationFrame(tick); };
        events.on('update', done);
        requestAnimationFrame(tick);
    });
};

/** Whether anything the parameter moves is on view (a picture of an empty board teaches nothing). */
const onView = (svg: SVGSVGElement, b: Board, ids: Set<string>) => {
    const width = svg.clientWidth, height = svg.clientHeight;
    return drawn(b).some(object => {
        if (!ids.has(object.id)) return false;
        try {
            const box = (object.rendNode as unknown as SVGGraphicsElement).getBBox();
            const w = Math.min(width, box.x + box.width) - Math.max(0, box.x), h = Math.min(height, box.y + box.height) - Math.max(0, box.y);
            return w >= 0 && h >= 0 && Math.max(w, h) > 0.04 * Math.min(width, height);
        } catch { return false; }
    });
};

/** Narrows a parameter's window around its live value until most pictures show something that moves. */
const zoomWindow = async (b: Board, svg: SVGSVGElement, keys: string[], start: number[], index: number, count: number) => {
    const entry = getParam(keys[index])!;
    let half = (entry.max - entry.min) / 2;
    if (entry.cyclic !== undefined) return gridValues(entry, start[index], half, count);
    for (let attempt = 0; attempt < 4; attempt++) {
        const values = gridValues(entry, start[index], half, count);
        const looks: Map<string, string>[] = [];
        for (const value of values) {
            const probe = [...start];
            probe[index] = value;
            await settle(b, keys, probe);
            looks.push(new Map(drawn(b).map(object => [object.id, signature(object.rendNode!)])));
        }
        const moving = new Set<string>();
        for (const [id, first] of looks[0]) if (looks.some(look => look.get(id) !== first)) moving.add(id);
        if (moving.size === 0) return values;
        // Which pictures show any of it: a second pass, since what moves is known only after all looks.
        let shown = 0;
        for (const value of values) {
            const probe = [...start];
            probe[index] = value;
            await settle(b, keys, probe);
            if (onView(svg, b, moving)) shown++;
        }
        if (shown >= Math.ceil(0.8 * values.length) || half <= (entry.max - entry.min) / 24) return values;
        half /= 2;
    }
    return gridValues(entry, start[index], half, count);
};

export interface FamilyCell { values: number[]; svg: string }
export interface Family { xs: number[]; ys: number[]; cells: FamilyCell[]; moving: number; start: number[]; width: number; height: number }

/** Pictures the board over a row (`yCount` 0) or a plane of values of `entries`; rows run from the largest y down. */
export async function captureFamily(b: Board, entries: ParamEntry[], xCount: number, yCount: number, progress: (fraction: number) => void): Promise<Family | undefined> {
    const svg = svgRootOf(b);
    if (!svg) return undefined;
    const start = entries.map(entry => entry.value);
    const keys = entries.map(entry => entry.key);
    const width = svg.clientWidth, height = svg.clientHeight;
    const box = container(b);
    box.style.transition = 'opacity 160ms ease';
    box.style.opacity = '0.12';
    const clones: {values: number[]; node: SVGSVGElement; signatures: Map<string, string>}[] = [];
    let xs: number[] = [], ys: (number | undefined)[] = [undefined];
    try {
        xs = await zoomWindow(b, svg, keys, start, 0, xCount);
        if (entries.length > 1) ys = (await zoomWindow(b, svg, keys, start, 1, yCount)).reverse();
        const total = xs.length * ys.length;
        for (const y of ys) for (const x of xs) {
            const values = y === undefined ? [x] : [x, y];
            await settle(b, keys, values);
            const node = svg.cloneNode(true) as SVGSVGElement;
            const signatures = new Map(drawn(b).map(object => [object.rendNode!.id || object.id, signature(object.rendNode!)]));
            clones.push({values, node, signatures});
            progress(clones.length / total);
            if (clones.length % 3 === 0) await frames();
        }
    } finally {
        await settle(b, keys, start);
        box.style.opacity = '';
    }
    // What changes across the family is drawn in colour; everything that stays put is faded.
    const moving = new Set<string>();
    for (const [id, first] of clones[0].signatures) if (clones.some(clone => clone.signatures.get(id) !== first)) moving.add(id);
    const cells = clones.map(({values, node, signatures}) => {
        node.querySelectorAll('.ux-ghosts, .ux-target-ghost, .ux-fit-layer').forEach(element => element.remove());
        for (const id of signatures.keys()) if (!moving.has(id)) node.querySelector(`[id="${id}"]`)?.classList.add('ux-ladder-still');
        for (const id of moving) node.querySelector(`[id="${id}"]`)?.classList.add('ux-ladder-moves');
        node.setAttribute('viewBox', `0 0 ${width} ${height}`);
        node.setAttribute('width', '100%');
        node.setAttribute('height', '100%');
        node.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        node.removeAttribute('style');
        return {values, svg: node.outerHTML};
    });
    return {xs, ys: ys.filter((y): y is number => y !== undefined), cells, moving: moving.size, start, width, height};
}
