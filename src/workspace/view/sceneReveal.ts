// The scene reveal (task 07 slice 3b; design: docs/reviews/ux-picks-app-wide/briefs/notes/07-reveal-design.md).
// Across a lesson step, board objects that become visible fade in and objects that stop being visible fade out as a static ghost
// (a clone of their rendered nodes in an overlay above the board). Opacity is only ever inline style on rendered nodes, so graph
// state, presets and exports never see it. Framework-free: the board, the clock and the frames are injected.
import {easeOutCubic, GLIDE_MS} from './motion';

/** The part of a JSXGraph element the reveal reads. */
export interface RevealObject {
    readonly id: string;
    readonly rendNode?: Element | null;
    readonly visPropCalc?: {readonly visible?: boolean};
    readonly label?: {readonly id?: string; readonly rendNode?: Element | null; readonly visPropCalc?: {readonly visible?: boolean}} | null;
}

/** The part of a JSXGraph board the reveal reads. */
export interface RevealBoard {
    /** JSXGraph types the list as `unknown[]`; each entry is read as a `RevealObject`. */
    readonly objectsList: readonly unknown[];
    readonly containerObj: HTMLElement;
}

export interface SceneRevealDeps {
    now?(): number;
    requestFrame?(callback: () => void): number;
    cancelFrame?(id: number): void;
    reducedMotion?(): boolean;
}

/** More changed objects than this (appearing plus vanishing) are not revealed: the step applies as it always did. */
export const MAX_REVEALED_OBJECTS = 400;
/** A capture slower than this (ms) marks an expensive board (the phase portrait's field): no reveal. */
export const MAX_CAPTURE_MS = 8;
/** The ghost's opacity when the step lands. */
export const GHOST_OPACITY = 0.5;

interface Shown {
    readonly id: string;
    readonly nodes: Element[];
}

export interface Snapshot {
    readonly shown: Shown[];
    /** Detached deep copies of each shown object's nodes, in the same order. */
    readonly clones: Node[][];
}

export interface Reveal {
    /** Ends the fades at once: appearing objects at their own opacity, ghosts removed. */
    finish(): void;
    dispose(): void;
}

const isVisible = (object: {readonly rendNode?: Element | null; readonly visPropCalc?: {readonly visible?: boolean}}) =>
    object.rendNode != null && object.visPropCalc?.visible === true;

function shownObjects(board: RevealBoard): Shown[] {
    const shown: Shown[] = [];
    for (const entry of board.objectsList) {
        const object = entry as RevealObject;
        const nodes: Element[] = [];
        if (isVisible(object)) nodes.push(object.rendNode!);
        if (object.label && isVisible(object.label)) nodes.push(object.label.rendNode!);
        if (nodes.length > 0) shown.push({id: object.id, nodes});
    }
    return shown;
}

/** What the board shows now, with copies of the drawing; `undefined` when taking it was too slow to be worth a reveal. */
export function capture(board: RevealBoard, now: () => number = () => performance.now()): Snapshot | undefined {
    if (!Array.isArray(board.objectsList) || !board.containerObj) return undefined; // a fake board of a unit test
    const start = now();
    const shown = shownObjects(board);
    const clones = shown.map(entry => entry.nodes.map(node => node.cloneNode(true)));
    return now() - start > MAX_CAPTURE_MS ? undefined : {shown, clones};
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Diffs the board against `before` (taken before the step) and starts the fades. Returns `undefined` when nothing appears or
 * vanishes, or when the diff is too large.
 */
export function reveal(board: RevealBoard, before: Snapshot, deps: SceneRevealDeps = {}): Reveal | undefined {
    const now = deps.now ?? (() => performance.now());
    const requestFrame = deps.requestFrame ?? (callback => requestAnimationFrame(callback));
    const cancelFrame = deps.cancelFrame ?? (id => cancelAnimationFrame(id));
    const after = shownObjects(board);
    const afterIds = new Set(after.map(entry => entry.id));
    const beforeIds = new Set(before.shown.map(entry => entry.id));
    const appearing = after.filter(entry => !beforeIds.has(entry.id));
    const vanishing = before.shown.map((entry, index) => ({entry, index})).filter(({entry}) => !afterIds.has(entry.id));
    if (appearing.length + vanishing.length === 0 || appearing.length + vanishing.length > MAX_REVEALED_OBJECTS) return undefined;

    const container = board.containerObj;
    const doc = container.ownerDocument;
    // Appearing objects start transparent before anything is painted.
    const faded = appearing.flatMap(entry => entry.nodes).filter((node): node is HTMLElement | SVGElement => 'style' in node)
        .map(node => ({node, saved: node.style.opacity}));
    for (const {node} of faded) node.style.opacity = '0';

    let overlay: HTMLElement | undefined;
    if (vanishing.length > 0) {
        overlay = doc.createElement('div');
        overlay.className = 'scene-reveal';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
        overlay.style.opacity = String(GHOST_OPACITY);
        const svg = doc.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;left:0;top:0;overflow:hidden;pointer-events:none;';
        overlay.appendChild(svg);
        for (const {index} of vanishing) {
            for (const clone of before.clones[index]) {
                if (clone instanceof SVGElement) svg.appendChild(clone); else overlay.appendChild(clone);
            }
        }
        container.appendChild(overlay);
    }

    const start = now();
    let frameId: number | undefined;
    let done = false;
    const listenerTarget: Document = doc;
    const interrupt = (event: Event) => { if (event.type !== 'keydown' || (event as KeyboardEvent).key === 'Escape') finish(); };

    const finish = () => {
        if (done) return;
        done = true;
        if (frameId !== undefined) cancelFrame(frameId);
        frameId = undefined;
        listenerTarget.removeEventListener('pointerdown', interrupt, true);
        listenerTarget.removeEventListener('keydown', interrupt, true);
        for (const {node, saved} of faded) node.style.opacity = saved;
        overlay?.remove();
    };
    const tick = () => {
        frameId = undefined;
        if (done) return;
        const t = Math.min(1, Math.max(0, (now() - start) / GLIDE_MS));
        if (t >= 1) { finish(); return; }
        const k = easeOutCubic(t);
        for (const {node} of faded) node.style.opacity = String(k);
        if (overlay) overlay.style.opacity = String(GHOST_OPACITY * (1 - t));
        frameId = requestFrame(tick);
    };
    listenerTarget.addEventListener('pointerdown', interrupt, true);
    listenerTarget.addEventListener('keydown', interrupt, true);
    frameId = requestFrame(tick);
    return {finish, dispose: finish};
}

/** What `SceneReveal.begin` hands back: call `commit` once the step's board changes are drawn. */
export interface PendingReveal {
    commit(): void;
}

export interface SceneRevealOwnerDeps extends SceneRevealDeps {
    /** The main 2D board while it is alive; `undefined` for a graph without one (a surface) or after unmount. */
    board(): RevealBoard | undefined;
}

/** The one owner of a graph's running reveal: starts one per step, finishes it at the next step and on dispose. */
export class SceneReveal {
    private running: Reveal | undefined;
    private generation = 0;
    private disposed = false;
    private readonly reduced: () => boolean;

    constructor(private readonly deps: SceneRevealOwnerDeps) {
        this.reduced = deps.reducedMotion ?? (() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    isRunning(): boolean {
        return this.running !== undefined;
    }

    /** Finishes the previous reveal and looks at the board before a step; `undefined` when this step is not revealed. */
    begin(): PendingReveal | undefined {
        this.running?.finish();
        this.running = undefined;
        const generation = ++this.generation;
        if (this.disposed || this.reduced()) return undefined;
        const board = this.deps.board();
        if (!board) return undefined;
        const before = capture(board, this.deps.now);
        if (!before) return undefined;
        return {
            commit: () => {
                if (this.disposed || generation !== this.generation) return;
                const current = this.deps.board();
                if (current) this.running = reveal(current, before, this.deps);
            },
        };
    }

    dispose(): void {
        this.disposed = true;
        this.generation++;
        this.running?.dispose();
        this.running = undefined;
    }
}
