import type {Board} from "jsxgraph";
import type {GraphBoardOptions, GraphSession} from "../../base/GraphSession";

export interface AuxiliaryBoardLifetimeSpec {
    /** The session that owns the auxiliary board. It frees the board and releases this lifetime when it is disposed. */
    session: GraphSession
    /** The board the auxiliary board is linked to (`addChild`), so dragging on it updates the parent. */
    parent: Board
    /** The live host element supplied by the view; the board is created on it once it has a visible size. */
    host: HTMLElement
    boardOptions: GraphBoardOptions
    /** Called once, with the board, as soon as the host has a visible size. Returns nothing the module must track. */
    onBoard: (board: Board, lifetime: AuxiliaryBoardLifetime) => void
    /** Called after every resize, with the board already at the new size. */
    onResize?: (board: Board, lifetime: AuxiliaryBoardLifetime) => void
    /** Called once when the lifetime ends, after every adopted resource was released. */
    onRelease?: (lifetime: AuxiliaryBoardLifetime) => void
}

/**
 * One auxiliary board's lifetime: creation through the session, resize observation, the link to the parent board and
 * the resources adopted for it (for example model-point bindings). Releasing is idempotent and also happens when the
 * session ends; the view only supplies the host element. The graph keeps the mathematics shown on the board.
 */
export class AuxiliaryBoardLifetime {
    private board: Board | undefined;
    private releaseBoard: (() => void) | undefined;
    private observer: ResizeObserver | undefined;
    private linked = false;
    private released = false;
    private readonly adopted: Array<() => void> = [];
    private readonly unregister: () => void;

    constructor(private readonly spec: AuxiliaryBoardLifetimeSpec) {
        this.unregister = spec.session.registerCleanup(() => this.release());
        if (this.released) return;
        if (typeof ResizeObserver !== "undefined") {
            this.observer = new ResizeObserver(entries => {
                if (!entries.length) return;
                const {width, height} = entries[0].contentRect;
                this.resize(width, height);
            });
            this.observer.observe(spec.host);
        }
        const {width, height} = spec.host.getBoundingClientRect();
        this.resize(width, height);
    }

    get isReleased(): boolean { return this.released; }

    /** The board, once the host had a visible size. */
    get current(): Board | undefined { return this.board; }

    /** Links the board to the parent so parent updates redraw it. Safe to call repeatedly. */
    linkToParent(): void {
        if (this.released || !this.board || this.linked) return;
        this.linked = true;
        this.spec.parent.addChild(this.board);
    }

    /** Hands a resource to the lifetime; it is released (latest first) before the board is. Runs now when already released. */
    adopt(dispose: () => void): void {
        if (this.released) {
            dispose();
            return;
        }
        this.adopted.push(dispose);
    }

    /** Idempotent. Releases adopted resources, the parent link, the observer and the board. */
    release(): void {
        if (this.released) return;
        this.released = true;
        this.unregister();
        this.observer?.disconnect();
        this.observer = undefined;
        try {
            while (this.adopted.length) {
                try {
                    this.adopted.pop()!();
                } catch (error) {
                    console.error("An auxiliary board resource failed to release.", error);
                }
            }
            if (this.board && this.linked && this.spec.parent.renderer) this.spec.parent.removeChild(this.board);
            this.linked = false;
        } finally {
            const releaseBoard = this.releaseBoard;
            this.releaseBoard = undefined;
            this.board = undefined;
            try {
                releaseBoard?.();
            } finally {
                this.spec.onRelease?.(this);
            }
        }
    }

    private resize(width: number, height: number): void {
        if (this.released || width <= 0 || height <= 0) return;
        if (!this.board) {
            const {board, release} = this.spec.session.createAuxiliaryBoard(this.spec.host, this.spec.boardOptions);
            this.board = board;
            this.releaseBoard = release;
            this.spec.onBoard(board, this);
            if (this.released) return;
        }
        const board = this.board;
        const currentBox = board.getBoundingBox();
        const preservedBox: [number, number, number, number] = currentBox.length === 4 && currentBox.every(Number.isFinite)
            ? [currentBox[0], currentBox[1], currentBox[2], currentBox[3]]
            : [-5, 5, 5, -5];
        board.resizeContainer(width, height, true, true);
        // JSXGraph moves its origin when the container changes, even with dontSetBoundingBox. Reapply the exact finite view.
        board.setBoundingBox(preservedBox, true);
        this.spec.onResize?.(board, this);
    }
}
