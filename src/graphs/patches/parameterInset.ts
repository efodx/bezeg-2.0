import type {Board, Point} from "jsxgraph";
import type {GraphSession} from "../base/GraphSession";

export type InsetBoundingBox = [number, number, number, number];

export interface ParameterInset {
    board: Board;
    point: Point;
    /** Frees the board and stops watching its container; safe to call after the session already did. */
    release: () => void;
}

export interface ParameterInsetSpec {
    boundingBox: InsetBoundingBox;
    /** Draws the domain on the board and returns the draggable dot (created at the current parameters). */
    build: (board: Board) => Point;
    /** Maps a pointer position to the nearest allowed (u, v); the dot is moved back onto it when it differs. */
    constrain: (u: number, v: number) => readonly [number, number];
    /** Called with the constrained parameters on every drag. */
    onDrag: (u: number, v: number) => void;
    /** Called when the session (not `release`) ends the inset, so the owner can forget it. */
    onSessionEnd: () => void;
}

/**
 * Mounts a parameter-domain inset: a small board owned by `session` showing a domain with one draggable dot.
 * The board is freed exactly once, by `release` or when the session is disposed.
 */
export function mountParameterInset(session: GraphSession, container: HTMLElement, spec: ParameterInsetSpec): ParameterInset {
    const options = {
        boundingBox: spec.boundingBox, axis: false, keepAspectRatio: true, showNavigation: false, showCopyright: false,
        showScreenshot: false, showFullscreen: false, pan: {enabled: false}, zoom: {wheel: false, pinch: false},
    };
    const {board, release} = session.createAuxiliaryBoard(container, options);
    const point = spec.build(board);
    point.on("drag", () => {
        const [u, v] = spec.constrain(point.X(), point.Y());
        // Keep the dot inside the domain while the pointer is outside it.
        if (u !== point.X() || v !== point.Y()) point.moveTo([u, v]);
        spec.onDrag(u, v);
    });
    let live = true;
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(entries => {
            const {width, height} = entries[0]?.contentRect ?? {width: 0, height: 0};
            if (!live || width <= 0 || height <= 0) return;
            board.resizeContainer(width, height, true, true);
            board.setBoundingBox(spec.boundingBox, true);
        });
        observer.observe(container);
    }
    const stop = session.registerCleanup(() => {
        live = false;
        observer?.disconnect();
        spec.onSessionEnd();
    });
    return {board, point, release: () => { live = false; stop(); release(); }};
}
