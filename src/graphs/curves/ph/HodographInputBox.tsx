import {JSXGraph} from "jsxgraph";
import {useLayoutEffect, useRef} from "react";
import type {AxisStyleSet} from "../../styles/AxisStyles";

interface HodographInputBoxProps {
    /** Axis style presets of the owning graph, so the auxiliary axes follow its display settings. */
    axisStyles: AxisStyleSet
    setRef: (arg0: JXG.Board) => void
    onResize?: (board: JXG.Board) => void
    onDispose?: () => void
}

export function HodographInputbox(props: HodographInputBoxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbacks = useRef(props);
    callbacks.current = props;
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let board: JXG.Board | undefined;
        let disposed = false;
        const resizeBoard = (currentBoard: JXG.Board, width: number, height: number) => {
            const currentBox = currentBoard.getBoundingBox();
            const preservedBox: [number, number, number, number] = currentBox.length === 4 && currentBox.every(Number.isFinite)
                ? [currentBox[0], currentBox[1], currentBox[2], currentBox[3]]
                : [-5, 5, 5, -5];
            currentBoard.resizeContainer(width, height, true, true);
            // JSXGraph moves its origin when the container changes, even with
            // dontSetBoundingBox. Reapply the exact finite view after resizing.
            currentBoard.setBoundingBox(preservedBox, true);
        };
        const resize = (width: number, height: number) => {
            if (disposed || width <= 0 || height <= 0) return;
            if (!board) {
                board = JSXGraph.initBoard(container, {
                    showFullscreen: false,
                    boundingbox: [-5, 5, 5, -5],
                    axis: true,
                    showNavigation: false,
                    showCopyright: false,
                    showScreenshot: true,
                    defaultAxes: {
                        x: callbacks.current.axisStyles.auxiliaryX,
                        y: callbacks.current.axisStyles.auxiliaryY
                    },
                });
                // Apply the actual size while keeping the board's initial box.
                callbacks.current.setRef(board);
            }
            resizeBoard(board, width, height);
            callbacks.current.onResize?.(board);
        };
        const observer = new ResizeObserver(entries => {
            if (!entries.length) return;
            const {width, height} = entries[0].contentRect;
            resize(width, height);
        });
        observer.observe(container);
        const {width, height} = container.getBoundingClientRect();
        resize(width, height);
        return () => {
            disposed = true;
            observer.disconnect();
            if (board) {
                try {
                    callbacks.current.onDispose?.();
                } finally {
                    JSXGraph.freeBoard(board);
                    board = undefined;
                }
            }
        };
    }, []);

    // JSXGraph derives its element ids from the container id; the container itself is reached through the ref.
    return <div ref={containerRef} id="hodograph-input-box" style={{
        width: "100%",
        aspectRatio: 1 / 1,
        background: "var(--workspace-panel, var(--bezeg-panel, #fffdf5))",
        marginTop: "2vh",
        marginBottom: "2vh",
        borderRadius: "10px"
    }}/>;
}
