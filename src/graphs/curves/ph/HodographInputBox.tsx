import {JSXGraph} from "jsxgraph";
import {useEffect, useRef} from "react";

interface HodographInputBoxProps {
    setRef: (arg0: JXG.Board) => void
    onDispose?: () => void
}

export function HodographInputbox(props: HodographInputBoxProps) {
    const callbacks = useRef(props);
    callbacks.current = props;
    useEffect(() => {
        const board = JSXGraph.initBoard("hodograph-input-box", {
            showFullscreen: false,
            boundingbox: [-5, 5, 5, -5],
            axis: true,
            showNavigation: false,
            showCopyright: false,
            showScreenshot: true,
            // TODO MAKE THIS GOOD
            // defaultAxes: {
            //     x: AxisStyles.defaultX,
            //     y: AxisStyles.defaultY
            // },
        });
        callbacks.current.setRef(board);
        const observer = new ResizeObserver(entries => {
            const {width, height} = entries[0].contentRect;
            if (width > 0 && height > 0) { board.resizeContainer(width, height, true); }
        });
        observer.observe(document.getElementById("hodograph-input-box")!);
        return () => { observer.disconnect(); callbacks.current.onDispose?.(); JSXGraph.freeBoard(board); };
    }, []);

    return <div id="hodograph-input-box" style={{
        width: "100%",
        aspectRatio: 1 / 1,
        background: "white",
        marginTop: "2vh",
        marginBottom: "2vh",
        borderRadius: "10px"
    }}/>;
}
