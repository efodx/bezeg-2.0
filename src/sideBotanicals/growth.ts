// Growth of the side botanicals (docs/specs/side-botanicals.md, decision 9): a number that rises from 0 to 1 once,
// when the decoration first appears in a visit. No React and no DOM here; the host is injected.

/** Duration of the growth animation. */
export const LOAD_MS = 2500;

/** Growth `elapsedMs` after the start: an ease-out from 0 to 1 over LOAD_MS. */
export function loadRamp(elapsedMs: number): number {
    const rest = 1 - Math.min(1, Math.max(0, elapsedMs / LOAD_MS));
    return 1 - rest * rest * rest;
}

export interface GrowthHost {
    now(): number;
    reducedMotion(): boolean;
    requestFrame(callback: () => void): number;
    cancelFrame(id: number): void;
}

/** Highest growth reached in this visit. It survives route changes, so a visitor never sees the branches regrow. */
export interface GrowthVisit {reached: number}
const VISIT: GrowthVisit = {reached: 0};

export function windowGrowthHost(): GrowthHost {
    return {
        now: () => performance.now(),
        reducedMotion: () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (id) => cancelAnimationFrame(id),
    };
}

/**
 * Grows to 1 and reports each new value through `write`. Frames run only until growth is complete; with reduced
 * motion, or once the visit has reached 1, it writes 1 and requests none. Returns the disposer.
 */
export function startGrowth(write: (growth: number) => void, host: GrowthHost = windowGrowthHost(), visit: GrowthVisit = VISIT): () => void {
    if (host.reducedMotion()) visit.reached = 1;
    write(visit.reached);
    if (visit.reached >= 1) return () => undefined;
    const started = host.now();
    let frame = 0;
    const tick = () => {
        frame = 0;
        const next = Math.max(visit.reached, loadRamp(host.now() - started));
        if (next !== visit.reached) write(visit.reached = next);
        if (next < 1) frame = host.requestFrame(tick);
    };
    frame = host.requestFrame(tick);
    return () => {
        if (frame) host.cancelFrame(frame);
        frame = 0;
    };
}
