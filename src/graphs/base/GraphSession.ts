import {Board, JSXGraph} from "jsxgraph";
import {DisplaySettings} from "./DisplaySettings";

export type GraphBoardOptions = Parameters<typeof JSXGraph.initBoard>[1];

type BoardEventListener = (...args: any[]) => void;

export interface GraphSessionDependencies {
    initBoard: (container: string | HTMLElement, options: GraphBoardOptions) => Board;
    freeBoard: (board: Board) => void;
}

const defaultDependencies: GraphSessionDependencies = {
    initBoard: (container, options) => JSXGraph.initBoard(container, options),
    freeBoard: board => JSXGraph.freeBoard(board),
};

const sessionsByBoard = new WeakMap<Board, GraphSession>();

/** Owns one JSXGraph board and every lifecycle resource attached by the graph. */
export class GraphSession {
    private board?: Board;
    private disposed = false;
    private ready = false;
    private resizeObserver?: ResizeObserver;
    private readonly cleanups = new Set<() => void>();
    private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    private readonly readyWaiters = new Set<() => void>();
    private readonly abortController = new AbortController();
    private refreshPending = false;
    private pendingTransitions = 0;

    /**
     * @param displaySettings the owning graph's display settings, which style callbacks reach through the board
     */
    constructor(
        private readonly dependencies: GraphSessionDependencies = defaultDependencies,
        readonly displaySettings: DisplaySettings = new DisplaySettings(),
    ) {}

    get isAlive(): boolean {
        return !this.disposed && this.board !== undefined;
    }

    get isReady(): boolean {
        return this.isAlive && this.ready;
    }

    get isSettled(): boolean {
        return this.isReady && this.pendingTimers.size === 0 && this.pendingTransitions === 0;
    }

    get signal(): AbortSignal {
        return this.abortController.signal;
    }

    createBoard(container: string | HTMLElement, options: GraphBoardOptions): Board {
        if (this.disposed) throw new Error("A disposed graph session cannot create a board.");
        if (this.board) throw new Error("A graph session can own only one board.");
        const board = this.dependencies.initBoard(container, options);
        this.board = board;
        sessionsByBoard.set(board, this);
        // JSXGraph caches the container position for a second (and throughout drags).
        // A scroll or inspector layout change can move it before the next gesture.
        // Capture runs before JSXGraph's native target listener and our board handlers,
        // so both dragging and curve editing use the same fresh pointer origin.
        const refreshPointerOrigin = () => { board.cPos = []; };
        board.containerObj.addEventListener('pointerdown', refreshPointerOrigin, true);
        this.registerCleanup(() => board.containerObj.removeEventListener('pointerdown', refreshPointerOrigin, true));
        return board;
    }

    /** Track a JSXGraph event subscription and return its idempotent unsubscribe function. */
    on(event: string, listener: BoardEventListener): () => void {
        const board = this.requireBoard();
        board.on(event, listener);
        let subscribed = true;
        const unsubscribe = () => {
            if (!subscribed) return;
            subscribed = false;
            this.cleanups.delete(unsubscribe);
            try {
                board.off(event, listener);
            } catch {
                // The board may already have removed this subscription while tearing down.
            }
        };
        this.cleanups.add(unsubscribe);
        return unsubscribe;
    }

    /** Track an owned resource cleanup such as a subscription or auxiliary-board hook. */
    registerCleanup(cleanup: () => void): () => void {
        if (!this.isAlive) {
            cleanup();
            return () => undefined;
        }
        let registered = true;
        const dispose = () => {
            if (!registered) return;
            registered = false;
            this.cleanups.delete(dispose);
            cleanup();
        };
        this.cleanups.add(dispose);
        return dispose;
    }

    observeResize(container: Element): void {
        if (!this.isAlive || typeof ResizeObserver === "undefined") return;
        this.resizeObserver?.disconnect();
        const observer = new ResizeObserver(entries => {
            const board = this.board;
            const entry = entries[0];
            if (!this.isAlive || !board || !entry) return;
            const {width, height} = entry.contentRect;
            if (width > 0 && height > 0) board.resizeContainer(width, height, true);
        });
        this.resizeObserver = observer;
        observer.observe(container);
    }

    /** Preserve the control-point drag refresh while owning its deferred pass. */
    requestFullUpdate(): void {
        const board = this.board;
        if (!this.isAlive || !board) return;
        if (!board.inUpdate) {
            board.fullUpdate();
            return;
        }
        if (this.refreshPending) return;
        this.refreshPending = true;
        let timer: ReturnType<typeof setTimeout>;
        timer = setTimeout(() => {
            this.pendingTimers.delete(timer);
            this.refreshPending = false;
            if (this.isAlive && this.board === board) board.fullUpdate();
            this.resolveReadyWaitersIfSettled();
        }, 0);
        this.pendingTimers.add(timer);
    }

    markReady(): void {
        if (!this.isAlive || this.ready) return;
        this.ready = true;
        this.resolveReadyWaitersIfSettled();
    }

    /** Track an asynchronous scene change so readiness waits for its React and board work. */
    beginTransition(): () => void {
        if (!this.isAlive) return () => undefined;
        this.pendingTransitions++;
        let active = true;
        return () => {
            if (!active) return;
            active = false;
            this.pendingTransitions = Math.max(0, this.pendingTransitions - 1);
            this.resolveReadyWaitersIfSettled();
        };
    }

    /** Resolves when ready and settled, or when disposal aborts the session. */
    waitUntilReady(): Promise<void> {
        if (this.isSettled || !this.isAlive) return Promise.resolve();
        return new Promise(resolve => this.readyWaiters.add(resolve));
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.ready = false;
        this.abortController.abort();
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        for (const timer of this.pendingTimers) clearTimeout(timer);
        this.pendingTimers.clear();
        this.refreshPending = false;
        this.resolveReadyWaiters();
        for (const cleanup of [...this.cleanups]) {
            try {
                cleanup();
            } catch {
                // Keep disposing the rest of the session even if one owner failed to clean up.
            }
        }
        this.cleanups.clear();
        const board = this.board;
        this.board = undefined;
        if (board) this.dependencies.freeBoard(board);
    }

    private requireBoard(): Board {
        if (!this.isAlive || !this.board) throw new Error("The graph session is no longer active.");
        return this.board;
    }

    private resolveReadyWaiters(): void {
        for (const resolve of this.readyWaiters) resolve();
        this.readyWaiters.clear();
    }

    private resolveReadyWaitersIfSettled(): void {
        if (this.isSettled) this.resolveReadyWaiters();
    }
}

/** Finds the owner for an adapter callback without retaining disposed boards. */
export function graphSessionForBoard(board: Board): GraphSession | undefined {
    return sessionsByBoard.get(board);
}
