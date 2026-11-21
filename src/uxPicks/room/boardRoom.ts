/**
 * Pick toolsCard, "Board makes room": the board's view lives in the part of the board the docked cards leave free.
 *
 * Free rect: the canvas minus the docked, unfolded cards (DOM rects of `.ux-dock [data-dock-item]`, plus the pucks strip), each
 * inflated by a margin. Floating cards are ignored (the learner placed them). Greedy per card, largest first: cut the free rect
 * from the side that loses the least area. A folded card is only a head strip: it may cut from the top or bottom edge, and only
 * when that loses little. A free rect that would be tiny falls back to the whole canvas.
 *
 * Graph-driven views: while attached, the main board's `setBoundingBox` is wrapped on the instance. A call counts as the graph's
 * own (starting box, reset, fit, preset, lesson scene) when it carries the 'graph' mark (src/graphs/base/viewIntent.ts) or no
 * third argument / 'reset'; JSXGraph's zoom ('update') and the keyboard pan ('user' mark) pass through untouched. A graph call is
 * widened so the requested box fills the free rect (fit inside and centre with equal axis units).
 *
 * Layout changes: dock mutations, frame resizes and pointer drops schedule a debounced check. When the free rect moved, the view
 * is transformed so the world region shown in the old free rect shows in the new one (so the learner's pan and zoom are kept
 * apart from that delta) and glides ~220 ms ease-out (instant under prefers-reduced-motion). Nothing happens while a card is
 * dragged or the learner drags the board; it waits for the drop. Our own calls are flagged and never re-trigger the check
 * (only the dock is observed, not the board). Every listener, observer, timer and the wrapper are removed by `detach`.
 */
import {currentViewIntent} from '../../graphs/base/viewIntent';
import {findMainBoard, type UxBoard} from '../b1/board';
import {PHONE_QUERY} from '../dock/BoardDock';

export interface Rect { x0: number; y0: number; x1: number; y1: number }
type Box = [number, number, number, number];
type SetBox = (box: Box, keep?: boolean, how?: string) => unknown;
interface RoomBoard extends UxBoard { setBoundingBox: SetBox; keepaspectratio?: boolean }

const MARGIN = 12;
const DEBOUNCE_MS = 140;
const GLIDE_MS = 220;
const TOLERANCE = 1.5;
const area = (r: Rect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);

/** The canvas minus the obstacles; each obstacle is {rect, folded}. Pure. */
export function freeRect(canvas: Rect, obstacles: readonly {rect: Rect; folded: boolean}[]): Rect {
    let free = {...canvas};
    const sorted = [...obstacles].sort((a, b) => area(b.rect) - area(a.rect));
    for (const {rect, folded} of sorted) {
        const o = {x0: rect.x0 - MARGIN, y0: rect.y0 - MARGIN, x1: rect.x1 + MARGIN, y1: rect.y1 + MARGIN};
        if (o.x1 <= free.x0 || o.x0 >= free.x1 || o.y1 <= free.y0 || o.y0 >= free.y1) continue;
        const cuts: Rect[] = [
            {...free, y0: Math.max(free.y0, o.y1)},
            {...free, y1: Math.min(free.y1, o.y0)},
        ];
        if (!folded) cuts.push({...free, x0: Math.max(free.x0, o.x1)}, {...free, x1: Math.min(free.x1, o.x0)});
        let best = cuts[0];
        for (const c of cuts) if (area(c) > area(best)) best = c;
        if (folded && area(free) - area(best) > 0.03 * area(free)) continue;
        free = best;
    }
    if (free.x1 - free.x0 < 200 || free.y1 - free.y0 < 150 || area(free) < 0.3 * area(canvas)) return {...canvas};
    return free;
}

/** The full-canvas box that shows `region` (world box [l, t, r, b]) filling the pixel rect `free` of a w x h canvas. */
export function boxForRegion(region: Box, free: Rect, w: number, h: number, keep: boolean): Box {
    const [l, t, r, b] = region;
    const fw = free.x1 - free.x0, fh = free.y1 - free.y0;
    let ux = fw / (r - l), uy = fh / (t - b);
    if (keep) ux = uy = Math.min(ux, uy);
    // The region's centre sits at the free rect's centre.
    const cx = (l + r) / 2, cy = (t + b) / 2;
    const fcx = (free.x0 + free.x1) / 2, fcy = (free.y0 + free.y1) / 2;
    const left = cx - fcx / ux, top = cy + fcy / uy;
    return [left, top, left + w / ux, top - h / uy];
}

/**
 * The view after the free rect moved from `prev` to `next` (pixels of a w x h canvas): the world point at the old centre sits at
 * the new centre, and the scale follows the rect's size as `min(1, free / canvas)`, so it is reversible and keeps the learner's zoom.
 */
export function moveRoom(view: Box, prev: Rect, next: Rect, w: number, h: number, keep: boolean): Box {
    const [l, t, r, b] = view;
    const wx = (r - l) / w, wy = (t - b) / h;   // world units per pixel
    const level = (f: Rect) => ({x: Math.min(1, (f.x1 - f.x0) / w), y: Math.min(1, (f.y1 - f.y0) / h)});
    const a = level(prev), c = level(next);
    let kx = a.x / c.x, ky = a.y / c.y;           // new world units per pixel = old * k
    if (keep) kx = ky = Math.min(a.x, a.y) / Math.min(c.x, c.y);
    const nx = wx * kx, ny = wy * ky;
    const cx = l + (prev.x0 + prev.x1) / 2 * wx, cy = t - (prev.y0 + prev.y1) / 2 * wy;
    const left = cx - (next.x0 + next.x1) / 2 * nx, top = cy + (next.y0 + next.y1) / 2 * ny;
    return [left, top, left + w * nx, top - h * ny];
}

const same = (a: Rect, b: Rect) => Math.abs(a.x0 - b.x0) < TOLERANCE && Math.abs(a.y0 - b.y0) < TOLERANCE
    && Math.abs(a.x1 - b.x1) < TOLERANCE && Math.abs(a.y1 - b.y1) < TOLERANCE;

function attach(board: RoomBoard): () => void {
    const container = board.containerObj;
    const frame = container.closest<HTMLElement>('.ux-board-frame') ?? container.parentElement;
    const original = board.setBoundingBox;
    let own = false;
    let applied: Rect | null = null;
    let timer = 0;
    let raf = 0;
    let pointerDown = false;
    const size = () => ({w: container.clientWidth, h: container.clientHeight});
    const phone = () => window.matchMedia?.(PHONE_QUERY).matches === true;

    const measure = (): Rect => {
        const {w, h} = size();
        const canvas: Rect = {x0: 0, y0: 0, x1: w, y1: h};
        if (phone() || !frame) return canvas;
        const base = container.getBoundingClientRect();
        const rel = (r: {left: number; top: number; right: number; bottom: number}): Rect => ({x0: r.left - base.left, y0: r.top - base.top, x1: r.right - base.left, y1: r.bottom - base.top});
        const obstacles: {rect: Rect; folded: boolean}[] = [];
        frame.querySelectorAll<HTMLElement>('.ux-dock [data-dock-item]').forEach(el => {
            if (el.classList.contains('is-floating')) return;
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            obstacles.push({rect: rel(r), folded: el.classList.contains('ux-btext-collapsed')});
        });
        const strip = [...frame.querySelectorAll<HTMLElement>('.ux-dock-strip > *')].map(e => e.getBoundingClientRect()).filter(r => r.width > 4 && r.height > 4);
        if (strip.length) {
            obstacles.push({
                rect: rel({left: Math.min(...strip.map(r => r.left)), top: Math.min(...strip.map(r => r.top)),
                    right: Math.max(...strip.map(r => r.right)), bottom: Math.max(...strip.map(r => r.bottom))}),
                folded: false,
            });
        }
        const free = freeRect(canvas, obstacles);
        container.dataset.roomFree = [free.x0, free.y0, free.x1, free.y1, w, h].map(Math.round).join(',');
        return free;
    };

    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const set = (box: Box, keep: boolean, how: string) => { own = true; try { original.call(board, box, keep, how); } finally { own = false; } };

    board.setBoundingBox = function (box, keep, how) {
        if (own) return original.call(board, box, keep, how);
        stop();
        const intent = currentViewIntent();
        const graph = intent === 'graph' || (intent === null && (how === undefined || how === 'reset'));
        if (!graph || !Array.isArray(box) || box.length !== 4) return original.call(board, box, keep, how);
        const free = measure();
        const {w, h} = size();
        applied = free;
        if (w <= 0 || h <= 0 || (free.x0 === 0 && free.y0 === 0 && free.x1 === w && free.y1 === h)) return original.call(board, box, keep, how);
        return original.call(board, boxForRegion(box, free, w, h, !!keep), keep, how);
    };

    const busy = () => pointerDown || !!frame?.querySelector('.ux-dock-marker, .ux-dock-ghost');
    const check = () => {
        timer = 0;
        const next = measure();
        const {w, h} = size();
        if (w <= 0 || h <= 0) return;
        const prev = applied ?? {x0: 0, y0: 0, x1: w, y1: h};
        if (same(prev, next)) { applied = next; return; }
        if (busy()) { schedule(); return; }
        const [l, t, r, b] = board.getBoundingBox();
        const keep = board.keepaspectratio === true;
        const target = moveRoom([l, t, r, b], prev, next, w, h, keep);
        applied = next;
        stop();
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { set(target, keep, 'keep'); return; }
        const from: Box = [l, t, r, b];
        const start = performance.now();
        const step = (now: number) => {
            const k = Math.min(1, (now - start) / GLIDE_MS);
            const e = 1 - Math.pow(1 - k, 3);
            set(from.map((v, i) => v + (target[i] - v) * e) as Box, keep, 'keep');
            raf = k < 1 ? requestAnimationFrame(step) : 0;
        };
        raf = requestAnimationFrame(step);
    };
    function schedule() { window.clearTimeout(timer); timer = window.setTimeout(check, DEBOUNCE_MS); }

    const mutations = new MutationObserver(schedule);
    const dock = frame?.querySelector('.ux-dock');
    if (dock) mutations.observe(dock, {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style']});
    const resize = new ResizeObserver(schedule);
    if (frame) resize.observe(frame);
    if (dock) resize.observe(dock);
    const down = () => { pointerDown = true; };
    const up = () => { pointerDown = false; schedule(); };
    container.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    schedule();

    return () => {
        stop();
        window.clearTimeout(timer);
        mutations.disconnect();
        resize.disconnect();
        container.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        delete container.dataset.roomFree;
        if (board.setBoundingBox !== original) delete (board as Partial<RoomBoard>).setBoundingBox;
    };
}

/** Starts the behaviour for the page's main board (following it when the graph replaces it); returns the stop function. */
export function startBoardRoom(root: ParentNode = document): () => void {
    let current: RoomBoard | undefined;
    let detach: (() => void) | undefined;
    const sync = () => {
        const main = findMainBoard(root) as RoomBoard | undefined;
        if (main === current) return;
        detach?.();
        detach = undefined;
        current = undefined;
        if (main && main.containerObj.clientWidth > 0) { current = main; detach = attach(main); }
    };
    sync();
    const poll = window.setInterval(sync, 400);
    return () => { window.clearInterval(poll); detach?.(); };
}
