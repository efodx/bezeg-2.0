import {useSyncExternalStore} from "react";
import {notifyLanguageLockChanged, registerLanguageLock} from "../../../localization";

/**
 * The figure export operation: who may export, whether an export is running, whether the last one failed, and what
 * waits for it to finish. Two scopes live here and stay apart:
 *
 * - App scope (module functions): every capture in the page holds the language fixed and shows one failure state.
 * - Graph scope (`FigureExportScope`): one graph admits one single-figure export or one figure batch at a time and
 *   holds back a Preset reload until its export has finished.
 */

// App scope ------------------------------------------------------------------------------------------------------

let appExports = 0;
/** Which kind of export failed last, so its alert shows beside the control the learner used. */
export type FigureExportKind = 'single' | 'batch';
let appFailed: FigureExportKind | undefined;
let revision = 0;
const listeners = new Set<() => void>();
const changed = () => { revision++; listeners.forEach(listener => listener()); notifyLanguageLockChanged(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

// The language module asks this predicate before it switches language; it never stores export state.
registerLanguageLock(() => appExports > 0);

/** Marks a capture as running (language locked, failure cleared when none was running). Returns an idempotent release. */
export function beginAppFigureExport(): () => void {
    if (appExports === 0) appFailed = undefined;
    appExports++; changed();
    let finished = false;
    return () => { if (!finished) { finished = true; appExports--; changed(); } };
}

/** Makes the failure visible next to the export controls until the next export begins. */
export function reportFigureExportFailure(kind: FigureExportKind): void { appFailed = kind; changed(); }

/** Subscribes the component to the app-wide export state. */
export function useFigureExportState(): {exporting: boolean; failed: FigureExportKind | undefined} {
    useSyncExternalStore(subscribe, () => revision, () => revision);
    return {exporting: appExports > 0, failed: appFailed};
}

// Batch claim per graph session ---------------------------------------------------------------------------------------

const claimedBatches = new WeakSet<AbortSignal>();

/** Claims the figure batch of one graph session; undefined when it already has one. The release is idempotent. */
export function claimSessionBatch(session: AbortSignal): (() => void) | undefined {
    if (claimedBatches.has(session)) return undefined;
    claimedBatches.add(session);
    let released = false;
    return () => { if (!released) { released = true; claimedBatches.delete(session); } };
}

// Graph scope ----------------------------------------------------------------------------------------------------

export interface FigureExportScopeHost {
    /** Re-renders the graph's panels; the callback runs after that render. */
    requestRender(callback?: () => void): void;
    /** Performs the Preset reload an import deferred; the host decides whether it is still safe. */
    reload(): void;
}

export class FigureExportScope {
    private singles = 0;
    private batch = false;
    private reloadDeferred = false;
    private generation = 0;

    constructor(private readonly host: FigureExportScopeHost) {}

    /** True while a single figure or a batch is being captured; scene-changing work must wait. */
    get busy(): boolean { return this.batch || this.singles > 0; }
    get batchActive(): boolean { return this.batch; }

    /** Asks for a reload and reports whether it may run now; when it may not, it runs once the export finishes. */
    requestReload(): boolean {
        if (!this.busy) return true;
        this.reloadDeferred = true;
        return false;
    }

    /** Runs one single-figure capture under admission; resolves at once when another export is running. */
    runSingle(capture: () => Promise<void>): Promise<void> {
        if (this.busy) return Promise.resolve();
        const generation = this.generation;
        this.singles++;
        const release = () => {
            if (generation !== this.generation) return;
            this.singles = Math.max(0, this.singles - 1);
            this.host.requestRender();
            this.runDeferredReload();
        };
        try {
            return capture().finally(release);
        } catch (error) {
            release();
            return Promise.reject(error);
        }
    }

    /** Admits a figure batch; undefined when any export is running. `release(afterRender)` ends it and runs a deferred reload. */
    admitBatch(): ((afterRender?: () => void) => void) | undefined {
        if (this.busy) return undefined;
        const generation = this.generation;
        this.batch = true;
        let released = false;
        return afterRender => {
            if (released) return;
            released = true;
            if (generation !== this.generation) { afterRender?.(); return; }
            this.batch = false;
            this.host.requestRender(afterRender);
            this.runDeferredReload();
        };
    }

    /** The graph is going away: late releases do nothing and a deferred reload is dropped. */
    teardown(): void {
        this.generation++;
        this.singles = 0;
        this.batch = false;
        this.reloadDeferred = false;
    }

    private runDeferredReload(): void {
        if (!this.reloadDeferred || this.busy) return;
        this.reloadDeferred = false;
        this.host.reload();
    }
}
