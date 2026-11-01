import {useLayoutEffect, useRef} from "react";

interface HodographInputBoxProps {
    /**
     * Called with the live host element once it is mounted. The returned `release` is called on unmount; it must be
     * idempotent, because the owner may release earlier (for example when the scene is replaced).
     */
    attach: (host: HTMLElement) => {release: () => void} | undefined
}

/** The hodograph board's host element. The board's lifetime belongs to the owner (see `AuxiliaryBoardLifetime`). */
export function HodographInputbox(props: HodographInputBoxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbacks = useRef(props);
    callbacks.current = props;
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const lifetime = callbacks.current.attach(container);
        return () => lifetime?.release();
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
