/**
 * The one ordered path every scene replacement runs (architecture task A3, slice S2): mount, Preset reload, figure
 * batch scene and entry restore, lesson default scene, lesson fixture scene and lesson checkpoint.
 *
 *   dispose (once) -> import -> replace state -> restore transient state -> initialize -> sync -> finish
 *
 * The entries differ on purpose, and each difference is a field of the plan, not a separate code path (the reasons are
 * in docs/reviews/feature-streams/platform/a3-inventory.md and ADR 0015): the figure path disposes and
 * re-initializes because it keeps the board and rebuilds the scene, and defers the state replacement so `onStateChange`
 * diffs against the state before the load; lesson paths never re-initialize (`initialize()` is not idempotent) and
 * redraw synchronously so a rollback inside one tick is drawn before the host commits; mount runs on a fresh board.
 *
 * Disposal happens here, exactly once per replacement, and never inside a family's `importPresetData`. This module
 * knows neither React nor JSXGraph: the board is reached through `SceneReplacementHost`.
 */

/** What the replacement needs from the graph. BaseGraph builds this adapter per replacement. */
export interface SceneReplacementHost<S, T> {
    /** The family's `disposeFigureScene`. */
    disposeScene(): void;
    /** Batches board updates; both are no-ops without a board (or when the session ended before `resumeBoard`). */
    suspendBoard(): void;
    resumeBoard(): void;
    /** Replaces the whole scene state and writes the store synchronously. */
    replaceState(state: S): void;
    /** Replaces the whole scene state after the host commits: `next` returns the state or null to cancel. */
    replaceSceneState(next: () => S | null, afterCommit: () => void): void;
    restoreTransientState(saved: T | undefined): void;
    initialize(): void;
    syncReplacedScene(): void;
    bumpWorkspaceRevision(): void;
}

/** State replacement that is written immediately. */
export interface SyncStateReplacement<S> {
    mode: 'sync';
    /** A thunk: it runs after import, because a family's initial and lesson default state may depend on the imported scene. */
    state: () => S;
}

/** State replacement that is deferred and cancellable; used only by the figure path. */
export interface DeferredStateReplacement<S> {
    mode: 'deferred';
    /** The state, or null when the replacement is no longer current. Called when the replacement is scheduled. */
    next: () => S | null;
    /** False once the session ended, the operation was aborted or a newer replacement started. */
    isCurrent: () => boolean;
    signal: AbortSignal;
    /** Called when the signal aborts before the replacement finished (the caller invalidates its generation). */
    onCancel: () => void;
}

export interface SceneReplacementPlan<S, T> {
    /**
     * Whether `disposeFigureScene` runs. The figure path always disposes. Mount and the lesson paths dispose for
     * families whose `importPresetData` used to do it (`BaseGraph.disposesBeforeNonFigureImport`, true for curve
     * families) and not otherwise, so every family keeps its previous behavior.
     */
    dispose: boolean;
    /**
     * Wraps dispose and import in one board update batch (the figure path). A plan that disposes is batched
     * either way, as disposal used to run inside the curve importer's own batch.
     */
    suspendBoard: boolean;
    /** Loads the scene's Preset data (and, on mount, board view and graph state) through the family's importer. */
    importData: () => void;
    /** Runs after import and before the state is replaced (lesson view box). */
    afterImport?: () => void;
    /** The figure path bumps the workspace revision right after import; lesson paths do it in `finish`. */
    workspaceRevisionAfterImport?: boolean;
    /** Absent for mount, which sets state while importing. */
    state?: SyncStateReplacement<S> | DeferredStateReplacement<S>;
    /** Runs right after a synchronous state replacement (lesson display settings). */
    afterState?: () => void;
    /** Already cloned; undefined starts the scene with fresh transient state. */
    transientState: T | undefined;
    /** Whether `initialize()` runs. Lesson paths must not run it (ADR 0015); mount and the figure path do. */
    initialize: boolean;
    /** Last step, after `syncReplacedScene`: view box, board update, render request. */
    finish?: () => void;
}

/**
 * Runs the plan. Synchronous plans return undefined; a deferred plan returns a promise that settles when the new
 * scene is drawn (or the replacement was cancelled), and rejects with what initialize, sync or finish threw.
 */
export function replaceScene<S, T>(host: SceneReplacementHost<S, T>, plan: SceneReplacementPlan<S, T>): Promise<void> | undefined {
    const batch = plan.suspendBoard || plan.dispose;
    if (batch) host.suspendBoard();
    try {
        runDispose(host, plan);
        plan.importData();
    } finally {
        if (batch) host.resumeBoard();
    }
    if (plan.workspaceRevisionAfterImport) host.bumpWorkspaceRevision();
    plan.afterImport?.();

    const state = plan.state;
    if (state?.mode === 'deferred') return replaceDeferred(host, plan, state);
    if (state) host.replaceState(state.state());
    plan.afterState?.();
    finishReplacement(host, plan);
    return undefined;
}

/** Disposal for the plan: once, inside the replacement's board update batch. */
function runDispose<S, T>(host: SceneReplacementHost<S, T>, plan: SceneReplacementPlan<S, T>): void {
    if (plan.dispose) host.disposeScene();
}

/** Restore transient state, initialize per policy, sync, finish. */
function finishReplacement<S, T>(host: SceneReplacementHost<S, T>, plan: SceneReplacementPlan<S, T>): void {
    host.restoreTransientState(plan.transientState);
    drawReplacement(host, plan);
}

function drawReplacement<S, T>(host: SceneReplacementHost<S, T>, plan: SceneReplacementPlan<S, T>): void {
    if (plan.initialize) host.initialize();
    host.syncReplacedScene();
    plan.finish?.();
}

function replaceDeferred<S, T>(
    host: SceneReplacementHost<S, T>,
    plan: SceneReplacementPlan<S, T>,
    state: DeferredStateReplacement<S>,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let finished = false;
        const finish = (callback: () => void) => {
            if (finished) return;
            finished = true;
            state.signal.removeEventListener('abort', cancel);
            callback();
        };
        const cancel = () => {
            state.onCancel();
            finish(resolve);
        };
        state.signal.addEventListener('abort', cancel, {once: true});
        try {
            host.replaceSceneState(() => state.isCurrent() ? state.next() : null, () => {
                if (!state.isCurrent()) {
                    finish(resolve);
                    return;
                }
                try {
                    drawReplacement(host, plan);
                    finish(resolve);
                } catch (error) {
                    finish(() => reject(error));
                }
            });
            // Before the host renders the new scene, so controls never read a selection or a standard form that the
            // imported curves do not have yet.
            if (state.isCurrent()) host.restoreTransientState(plan.transientState);
        } catch (error) {
            finish(() => reject(error));
        }
    });
}
