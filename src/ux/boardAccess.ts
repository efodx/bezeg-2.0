import JXG from 'jsxgraph';
import type {Board} from 'jsxgraph';

/** The JSXGraph board mounted inside an element (the workspace's main board), found through JSXGraph's own registry. */
export function findBoard(frame: HTMLElement | null): Board | undefined {
    if (!frame) return undefined;
    const boards = (JXG as unknown as {boards: Record<string, Board & {containerObj?: HTMLElement}>}).boards;
    let best: (Board & {containerObj?: HTMLElement}) | undefined;
    for (const board of Object.values(boards)) {
        const container = board.containerObj;
        if (!container || !frame.contains(container) || !container.isConnected) continue;
        // The main board is the largest one in the frame.
        if (!best || container.clientWidth * container.clientHeight > (best.containerObj!.clientWidth * best.containerObj!.clientHeight)) best = board;
    }
    return best;
}

/** Calls `use` with the current board and again whenever the frame's board is replaced; returns a disposer. */
export function watchBoard(frame: HTMLElement, use: (board: Board) => (() => void) | void): () => void {
    let current: Board | undefined;
    let dispose: (() => void) | void;
    const check = () => {
        const board = findBoard(frame);
        if (board === current) return;
        dispose?.();
        dispose = undefined;
        current = board;
        if (board) dispose = use(board);
    };
    check();
    const observer = new MutationObserver(() => check());
    observer.observe(frame, {childList: true, subtree: false});
    const timer = window.setInterval(check, 800);
    return () => { observer.disconnect(); window.clearInterval(timer); dispose?.(); };
}
