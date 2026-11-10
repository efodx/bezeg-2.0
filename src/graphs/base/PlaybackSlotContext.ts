import {createContext} from "react";

/**
 * The graph-adjacent playback slot of a workspace (docs/specs/mobile-graph-playback.md). `element` is the empty slot under the board
 * while the narrow or short layout is active, otherwise null. Exactly one playback group may claim it; `claim` returns the release
 * function, or undefined when the slot is taken or inactive.
 */
export interface PlaybackSlot {
    readonly element: HTMLElement | null;
    readonly claim: () => (() => void) | undefined;
}

export const PlaybackSlotContext = createContext<PlaybackSlot>({element: null, claim: () => undefined});
