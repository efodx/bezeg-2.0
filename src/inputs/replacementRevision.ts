import {createContext} from "react";

/**
 * Counts authoritative scene replacements (Reset, preset or lesson restore) around the inspector panels. A text field drops its
 * draft and hint when it changes, even when the replacement restores the same number, which value comparison cannot see.
 */
export const ReplacementRevision = createContext(0);
