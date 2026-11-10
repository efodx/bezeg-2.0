import {useEffect, useState} from "react";

export const GRAPH_ADJACENT_PLAYBACK_QUERY = "(max-width: 700px), (max-height: 500px)";

/** Whether playback controls belong under the board: phones, and short landscape viewports. The listener is removed on unmount. */
export function useGraphAdjacentPlayback(): boolean {
    const [matches, setMatches] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function"
        && window.matchMedia(GRAPH_ADJACENT_PLAYBACK_QUERY).matches);
    useEffect(() => {
        if (typeof window.matchMedia !== "function") return;
        const query = window.matchMedia(GRAPH_ADJACENT_PLAYBACK_QUERY);
        const update = () => setMatches(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return matches;
}
