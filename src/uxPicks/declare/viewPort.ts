import type {Board} from 'jsxgraph';
import type {FitBox} from '../../graphs/base/fitBoundingBox';

/**
 * The seam between a graph's board and the view fit (`useViewFit`). `BaseGraph` registers one port per mounted board and keeps
 * the VIEW INTENT: the box the graph itself chose (default view, lesson frame view, loaded preset view). The fit is computed from the
 * intent and applied with `apply`, which never changes the intent; nothing feeds a fitted box back (the 6a428517 drift).
 */
export interface ViewPort {
    readonly container: HTMLElement;
    readonly board: Board;
    readonly equalAxisUnits: boolean;
    /** The intent box, or undefined before the graph has set any view. */
    intent(): FitBox | undefined;
    /** Sets the view without touching the intent. */
    apply(box: FitBox): void;
    /** The board's current box. */
    current(): FitBox;
    /**
     * World points the picture of the graph's present state spans (its content corners, not the box it was framed in): the director
     * keeps their hull visible and clear of the cards at the least zoom-out. Absent: the whole intent is kept (BaseGraph.viewMarks).
     */
    marks?(): readonly (readonly [number, number])[] | undefined;
}

type Kind = 'port' | 'intent' | 'action';

let port: ViewPort | undefined;
const listeners = new Set<(kind: Kind) => void>();
let fitHandler: (() => void) | undefined;
let navHandler: (() => void) | undefined;

const emit = (kind: Kind) => listeners.forEach(l => l(kind));

export function registerViewPort(next: ViewPort | undefined) { port = next; emit('port'); }
export function getViewPort(): ViewPort | undefined { return port; }
/** BaseGraph: the graph set a view of its own (start, lesson frame, preset). */
export function notifyViewIntent() { emit('intent'); }
/** BaseGraph: a lesson action was applied (a frame changes the scene by actions). */
export function notifyLessonAction() { emit('action'); }
export function subscribeViewPort(listener: (kind: Kind) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/**
 * The learner's switch for automatic fitting (owner, 2026-11-22: "one mode, but make it turnable on/off"). On: load, lesson
 * frames, resizes, card changes and released parameters refit. Off: the view moves only by the learner and "Prilagodi točkam".
 * Global, remembered in localStorage `ux-autofit`.
 */
const AUTO_KEY = 'ux-autofit';
let autoFit = (() => { try { return localStorage.getItem(AUTO_KEY) !== '0'; } catch { return true; } })();
const autoListeners = new Set<() => void>();
export function autoFitOn(): boolean { return autoFit; }
export function setAutoFit(on: boolean) {
    if (on === autoFit) return;
    autoFit = on;
    try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch { /* ignore */ }
    autoListeners.forEach(l => l());
}
export function subscribeAutoFit(listener: () => void): () => void {
    autoListeners.add(listener);
    return () => { autoListeners.delete(listener); };
}

/** useViewFit: the declaring graph's "Prilagodi točkam" (the same fit the automatic triggers run, once). */
export function setFitHandler(handler: (() => void) | undefined) { fitHandler = handler; }
/** BaseGraph's navigation 'fit' action: runs the handler when set; false when the original fit applies. */
export function runFitHandler(): boolean { if (!fitHandler) return false; fitHandler(); return true; }
/**
 * True while the view fit owns the shown view (a declaring graph with automatic fitting on): a view the graph or a lesson sets
 * then becomes the fit's new intent without being shown first, and the fit glides once from the box on screen (owner, 2026-11-22:
 * walking the Taylor lesson, the view jumped to each frame's unfitted box and glided back on frames that should not move).
 */
export function fitOwnsView(): boolean { return fitHandler !== undefined && autoFit; }
/** BaseGraph's navigation buttons (zoom, pan): the learner moved the view. */
export function setNavHandler(handler: (() => void) | undefined) { navHandler = handler; }
export function noteNavigation() { navHandler?.(); }
