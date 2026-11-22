import {Board, JSXGraph} from "jsxgraph";
import {DisplaySettings} from "./DisplaySettings";
import {applyBoardTextDefaults} from "../styles/BoardText";
import {ViewAdapter, type ViewBoard} from "./writes/viewAdapter";

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
    private viewAdapter?: ViewAdapter;
    private readonly viewSubscriptions = new Map<() => void, () => void>();
    private adoptedMainView = false;
    private disposed = false;
    private ready = false;
    private resizeObserver?: ResizeObserver;
    private readonly cleanups = new Set<() => void>();
    private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    private readonly readyWaiters = new Set<() => void>();
    private readonly abortController = new AbortController();
    private refreshPending = false;
    /** How many of this session's board listeners are running now (see `on`). */
    private dispatchDepth = 0;
    private pendingTransitions = 0;

    /**
     * @param displaySettings the owning graph's display settings, which style callbacks reach through the board
     */
    constructor(
        private readonly dependencies: GraphSessionDependencies = defaultDependencies,
        readonly displaySettings: DisplaySettings = new DisplaySettings(),
    ) {}

    get isAlive(): boolean {
        return !this.disposed && (this.board !== undefined || this.adoptedMainView);
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
        applyBoardTextDefaults(board);
        this.board = board;
        sessionsByBoard.set(board, this);
        this.refreshPointerOriginOnPointerDown(board);
        // The adapter listens through the session's safe `on`, so its unsubscribe never removes a handler during dispatch.
        this.viewAdapter = new ViewAdapter(viewBoardOver(board, (options as {boundingBox?: number[]} | undefined)?.boundingBox, {
            on: (event, handler) => {
                // A test fake board may have no event API.
                if (typeof board.on === "function") this.viewSubscriptions.set(handler, this.on(event, handler));
            },
            off: (_event, handler) => {
                this.viewSubscriptions.get(handler)?.();
                this.viewSubscriptions.delete(handler);
            },
        }));
        return board;
    }

    /** The main board's view adapter (task 01b): the only writer of its view. */
    get view(): ViewAdapter {
        if (!this.viewAdapter) throw new Error("This graph session has no board, so no view.");
        return this.viewAdapter;
    }

    /**
     * Create a JSXGraph board that the session owns besides its main view (for example a parameter-domain inset).
     * The board is freed exactly once: by the returned `release` (for example when the control showing it unmounts) or
     * when the session is disposed, whichever comes first.
     */
    createAuxiliaryBoard(container: string | HTMLElement, options: GraphBoardOptions): {board: Board; release: () => void} {
        if (!this.isAlive) throw new Error("An inactive graph session cannot create an auxiliary board.");
        const board = this.dependencies.initBoard(container, options);
        applyBoardTextDefaults(board);
        const stopRefreshingOrigin = this.refreshPointerOriginOnPointerDown(board);
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            stopRefreshingOrigin();
            unregister();
            this.dependencies.freeBoard(board);
        };
        const unregister = this.registerCleanup(release);
        return {board, release};
    }

    /**
     * JSXGraph caches the container position for a second (and throughout drags).
     * A scroll or inspector layout change can move it before the next gesture.
     * Capture runs before JSXGraph's native target listener and our board handlers,
     * so both dragging and curve editing use the same fresh pointer origin.
     */
    private refreshPointerOriginOnPointerDown(board: Board): () => void {
        const refreshPointerOrigin = () => { board.cPos = []; };
        board.containerObj.addEventListener('pointerdown', refreshPointerOrigin, true);
        return this.registerCleanup(() => board.containerObj.removeEventListener('pointerdown', refreshPointerOrigin, true));
    }

    /**
     * Make this session alive for a main view that is not a JSXGraph board (such as a Three surface view).
     * `dispose` runs once, when the session is disposed; on an already disposed session it runs immediately.
     */
    adoptMainView(dispose: () => void): void {
        if (this.disposed) {
            dispose();
            return;
        }
        if (this.board || this.adoptedMainView) throw new Error("A graph session can own only one main view.");
        this.adoptedMainView = true;
        this.registerCleanup(dispose);
    }

    /**
     * Track a JSXGraph event subscription and return its idempotent unsubscribe function.
     *
     * Rule: a board event listener never removes a handler synchronously inside that event. JSXGraph's `trigger`
     * caches the handler count, so removal during dispatch breaks its loop (`reading 'handler'`). The listener is
     * wrapped: it does nothing once unsubscribed, and while any listener of this session runs, `unsubscribe` defers
     * `board.off` to a microtask; otherwise it removes at once.
     */
    on(event: string, listener: BoardEventListener): () => void {
        const board = this.requireBoard();
        let subscribed = true;
        const wrapper: BoardEventListener = (...args) => {
            if (!subscribed) return;
            this.dispatchDepth++;
            try {
                listener(...args);
            } finally {
                this.dispatchDepth--;
            }
        };
        board.on(event, wrapper);
        const remove = () => {
            try {
                board.off(event, wrapper);
            } catch {
                // The board may already have removed this subscription while tearing down.
            }
        };
        const unsubscribe = () => {
            if (!subscribed) return;
            subscribed = false;
            this.cleanups.delete(unsubscribe);
            if (this.dispatchDepth > 0) queueMicrotask(remove);
            else remove();
        };
        this.cleanups.add(unsubscribe);
        return unsubscribe;
    }

    /** Runs `listener` on the first `event` only, then unsubscribes through the same safe path as {@link on}. */
    once(event: string, listener: BoardEventListener): () => void {
        const unsubscribe: () => void = this.on(event, (...args) => {
            unsubscribe();
            listener(...args);
        });
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
            if (width <= 0 || height <= 0) return;
            const resize = () => board.resizeContainer(width, height, true);
            if (this.viewAdapter) this.viewAdapter.resizing(resize);
            else resize();
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
        this.viewAdapter?.dispose();
        this.viewAdapter = undefined;
        this.viewSubscriptions.clear();
        this.adoptedMainView = false;
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

/**
 * The adapter's view of a JSXGraph board. A board without a size (hidden or zero-size container, jsdom) reports a NaN
 * box: the adapter then keeps the last finite box, starting from `requested` (the box the board was made with).
 * Tolerates a board that lacks a method (the test fakes of graphs mounted without a session).
 */
export function viewBoardOver(
    board: Board,
    requested: readonly number[] | undefined,
    events: Pick<ViewBoard, "on" | "off"> = {on: () => undefined, off: () => undefined},
): ViewBoard {
    const finite = (box: readonly number[] | undefined): box is readonly number[] => box?.length === 4 && box.every(Number.isFinite);
    let lastFinite: number[] = finite(requested) ? [...requested] : [-1, 1, 1, -1];
    return {
        getBoundingBox: () => {
            const box = typeof board.getBoundingBox === "function" ? board.getBoundingBox() : undefined;
            if (finite(box)) lastFinite = [...box];
            return lastFinite;
        },
        setBoundingBox: (box, keepAspectRatio, zoom) => (zoom === undefined
            ? board.setBoundingBox(box as [number, number, number, number], keepAspectRatio)
            : board.setBoundingBox(box as [number, number, number, number], keepAspectRatio, zoom)),
        zoomIn: () => board.zoomIn(),
        zoomOut: () => board.zoomOut(),
        ...events,
    };
}

/** Finds the owner for an adapter callback without retaining disposed boards. */
export function graphSessionForBoard(board: Board): GraphSession | undefined {
    return sessionsByBoard.get(board);
}
