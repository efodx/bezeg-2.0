// Growth of the side botanicals (docs/specs/side-botanicals.md, decision 9): a number from 0 to 1 that rises on
// load and with scroll progress and never falls during a visit. No React and no DOM here; the host is injected.

/** Growth reached by the load animation alone on a page that scrolls. */
export const LOAD_GROWTH = .6;
/** Duration of the load animation. */
export const LOAD_MS = 2500;
/** Pages with less scroll range than this (px) grow straight to 1. */
export const MIN_SCROLL = 200;
/** Fastest change of the shown growth per second, so a jump to the page end grows in rather than popping. */
export const MAX_RATE = 1.2;
/** Longest time step counted for one frame, so the first frame after an idle period does not jump. */
const MAX_STEP_MS = 50;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Growth the page is heading for: 1 where it cannot scroll, otherwise LOAD_GROWTH at the top up to 1 at the end. */
export function growthGoal(scrollY: number, scrollable: number): number {
    if (!(scrollable >= MIN_SCROLL)) return 1;
    return LOAD_GROWTH + (1 - LOAD_GROWTH) * clamp01(scrollY / scrollable);
}

/** Share of the goal reached `elapsedMs` after load: an ease-out from 0 to 1 over LOAD_MS. */
export function loadRamp(elapsedMs: number): number {
    const rest = 1 - clamp01(elapsedMs / LOAD_MS);
    return 1 - rest * rest * rest;
}

export interface GrowthHost {
    now(): number;
    scrollY(): number;
    /** Scroll range of the page in px. */
    scrollable(): number;
    reducedMotion(): boolean;
    requestFrame(callback: () => void): number;
    cancelFrame(id: number): void;
    /** Subscribes to scrolling and returns the unsubscribe function. */
    onScroll(listener: () => void): () => void;
}

/** Highest growth reached in this visit. It survives route changes, so a visitor never sees the branches regrow. */
export interface GrowthVisit {reached: number}
const VISIT: GrowthVisit = {reached: 0};

export function windowGrowthHost(): GrowthHost {
    return {
        now: () => performance.now(),
        scrollY: () => window.scrollY,
        scrollable: () => document.documentElement.scrollHeight - window.innerHeight,
        reducedMotion: () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (id) => cancelAnimationFrame(id),
        onScroll: (listener) => {
            window.addEventListener('scroll', listener, {passive: true});
            return () => window.removeEventListener('scroll', listener);
        },
    };
}

/**
 * Drives growth and reports each new value through `write`. Frames run only during the load animation and while
 * the shown value is catching up; scrolling requests one frame at a time. Returns the disposer.
 */
export function startGrowth(write: (growth: number) => void, host: GrowthHost = windowGrowthHost(), visit: GrowthVisit = VISIT): () => void {
    if (host.reducedMotion()) {
        visit.reached = 1;
        write(1);
        return () => undefined;
    }
    const started = host.now();
    let last = started, shown = visit.reached, frame = 0;
    write(shown);
    const schedule = () => { if (!frame) frame = host.requestFrame(tick); };
    function tick() {
        frame = 0;
        const now = host.now();
        visit.reached = Math.max(visit.reached, loadRamp(now - started) * growthGoal(host.scrollY(), host.scrollable()));
        const next = Math.min(visit.reached, shown + Math.min(now - last, MAX_STEP_MS) / 1000 * MAX_RATE);
        last = now;
        if (next !== shown) write(shown = next);
        if (now - started < LOAD_MS || shown < visit.reached) schedule();
    }
    const stopListening = host.onScroll(schedule);
    schedule();
    return () => {
        stopListening();
        if (frame) host.cancelFrame(frame);
        frame = 0;
    };
}
