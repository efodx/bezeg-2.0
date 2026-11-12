import type {GraphSession} from "../base/GraphSession";

const RESIZE_SETTLE_MS = 150;

/**
 * Shows the opening view and keeps it while the board's size settles: a new board is created with `keepaspect`, which widens the exact
 * window, and the layout finishes after the first frame. A view whose centre is still the centre of the one drawn last (a resize keeps the centre, and changes the corners) is drawn again for the
 * settled size, so the first load equals what Reset shows; a view the user moved is left alone. The observer is released with the session.
 */
export function keepOpeningView(board: JXG.Board, session: GraphSession | undefined, show: () => void): void {
    show();
    let shown = board.getBoundingBox();
    const container = board.containerObj as HTMLElement | undefined;
    if (!session || !container || typeof ResizeObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
    const centre = (box: number[]) => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    const observer = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (!session.isAlive || !centre(board.getBoundingBox()).every((value, index) => near(value, centre(shown)[index]))) return;
            show();
            board.update();
            shown = board.getBoundingBox();
        }, RESIZE_SETTLE_MS);
    });
    observer.observe(container);
    session.registerCleanup(() => { clearTimeout(timer); observer.disconnect(); });
}
