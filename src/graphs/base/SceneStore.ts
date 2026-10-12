/** A partial state update, or a function computing one (or `null` for "no change") from the current state. */
export type SceneStateUpdate<S> = Partial<S> | ((state: S) => Partial<S> | null);

/**
 * Synchronous state container of one graph scene.
 *
 * Unlike React component state, `setState` applies immediately, so code running later in the same tick (for example a
 * later action of a lesson scene) reads what an earlier one wrote. Every change replaces the state object, bumps the
 * version and notifies subscribers; `useSyncExternalStore` uses the version as its snapshot.
 */
export class SceneStore<S extends object> {
    private state: S;
    private version = 0;
    private readonly listeners = new Set<() => void>();

    constructor(initialState: S) {
        this.state = initialState;
    }

    getState(): S {
        return this.state;
    }

    /** Changes whenever the state changed or `notify()` was called. */
    getVersion(): number {
        return this.version;
    }

    /** Applies the update synchronously. Returns whether the state object was replaced. */
    setState(update: SceneStateUpdate<S>): boolean {
        const patch = typeof update === "function" ? update(this.state) : update;
        if (patch === null || patch === undefined) return false;
        this.state = {...this.state, ...patch};
        this.notify();
        return true;
    }

    /** Replaces the whole state object (no merge), for restoring a scene. */
    replaceState(next: S): void {
        this.state = next;
        this.notify();
    }

    /** Signals a change outside `S` (curve objects, adapter flags) that subscribers must re-render for. */
    notify(): void {
        this.version++;
        for (const listener of [...this.listeners]) listener();
    }

    /** Returns an idempotent unsubscribe function. */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
}
