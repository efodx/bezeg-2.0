/** The one keymap for value steppers: an arrow is one step; Shift with an arrow, PageUp and PageDown are the big step. */
export interface StepKeyEvent {
    key: string;
    shiftKey: boolean;
}

/** How many steps the big step is when a control does not set `bigStep`. */
export const DEFAULT_BIG_STEP_COUNT = 10;

export function resolveBigStep(step: number, bigStep?: number): number {
    return bigStep !== undefined && bigStep > 0 ? bigStep : step * DEFAULT_BIG_STEP_COUNT;
}

/**
 * The signed change a key asks for, or undefined when the key is not a step key.
 * `horizontal` also accepts Left and Right (a range input; in a text field they move the caret).
 */
export function stepKeyDelta(event: StepKeyEvent, step: number, bigStep?: number, horizontal = false): number | undefined {
    const big = resolveBigStep(step, bigStep);
    switch (event.key) {
        case "PageUp": return big;
        case "PageDown": return -big;
        case "ArrowUp": return event.shiftKey ? big : step;
        case "ArrowDown": return event.shiftKey ? -big : -step;
        case "ArrowRight": return horizontal ? (event.shiftKey ? big : step) : undefined;
        case "ArrowLeft": return horizontal ? (event.shiftKey ? -big : -step) : undefined;
        default: return undefined;
    }
}
