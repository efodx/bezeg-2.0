import type {Board, GeometryElement} from "jsxgraph";
import type {GraphSession} from "./GraphSession";

/**
 * A graph-owned declaration of one standalone scene (the elements, listeners and model a graph draws on its board). The
 * host treats the scene opaquely: it only asks the declaration to create, synchronize and dispose it.
 * The declaration reads the current scene-store state itself (lazy getters); the host keeps no copy of it.
 */
export interface SceneDeclaration<Scene> {
    /**
     * Builds the scene on `board`. It may throw: it must then have released everything it acquired itself (the scene
     * constructor's own cleanup), because the host never receives the half-built scene.
     */
    create(board: Board): Scene;

    /**
     * Brings the scene in line with the current state. Returns false when the scene cannot show it (a changed creation
     * input that `sync` does not apply), so the host rebuilds it instead. Reuse is valid only when every changed
     * creation input is synchronized.
     */
    sync(scene: Scene): boolean;

    /** Removes everything the scene owns, including drag handlers and subscriptions. Must be idempotent. */
    dispose(scene: Scene): void;
}

/**
 * Runs a scene construction and, if it throws, removes every board object created since it began (a layer the scene
 * wraps may fail halfway and cannot clean up what it never returned), then rethrows. Declarations wrap `create` in it.
 * `construct` must stay synchronous: the sweep removes every object created meanwhile, so another owner's objects (a lesson
 * overlay) would be swept if construction yielded. It removes board objects only; a construction registers its listeners
 * and subscriptions after its last step that can throw.
 */
export function constructOrSweep<T>(board: Board, construct: () => T): T {
    const before = new Set(board.objectsList);
    try {
        return construct();
    } catch (error) {
        sweepObjectsSince(board, before);
        throw error;
    }
}

/** Removes every board object not in `before` (a snapshot of `board.objectsList`), newest first. */
export function sweepObjectsSince(board: Board, before: {has(object: object): boolean}): void {
    const leftover = board.objectsList.filter((object): object is GeometryElement => typeof object === "object" && object !== null && !before.has(object)).reverse();
    if (leftover.length) board.removeObject(leftover);
}

/**
 * The one live scene of a graph for one {@link GraphSession}. Created by mount/lifecycle work (never in render), released by
 * the session's registered cleanup before the board is freed. After the session ends it creates and synchronizes nothing.
 */
export class SceneSlot<Scene> {
    private scene?: Scene;

    constructor(private readonly session: GraphSession, private readonly board: Board, private readonly declaration: SceneDeclaration<Scene>) {
        session.registerCleanup(() => this.release());
    }

    /** The live scene, or undefined when none was built or it was released. */
    get current(): Scene | undefined {
        return this.scene;
    }

    /** Releases the current scene (if any) and builds a new one from the current state; a no-op once the session has ended. */
    rebuild(): void {
        this.release();
        if (!this.session.isAlive) return;
        const scene = this.declaration.create(this.board);
        if (!this.session.isAlive) {
            // The session ended while the scene was built: nothing may be published.
            this.declaration.dispose(scene);
            return;
        }
        this.scene = scene;
    }

    /** Synchronizes the live scene with the current state, or rebuilds it when the declaration cannot synchronize it. */
    reconcile(): void {
        const scene = this.scene;
        // A scene lives only while its session does (the session's cleanup releases it first), so none is left to sync afterwards.
        if (scene === undefined) return;
        if (!this.declaration.sync(scene)) this.rebuild();
    }

    /** Clears the slot, then disposes the scene it held. Safe to call repeatedly. */
    release(): void {
        const scene = this.scene;
        this.scene = undefined;
        if (scene !== undefined) this.declaration.dispose(scene);
    }
}
