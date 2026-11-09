import React from "react";

/**
 * A button that reveals a result hidden until asked and hides it again (spec decision 59). The label swaps with the state, so the
 * state is not repeated in `aria-pressed`; `data-revealed` and `data-action` are the hooks for tests and lessons.
 */
export function RevealButton(props: {
    revealed: boolean,
    showLabel: string,
    hideLabel: string,
    onToggle: () => void,
    /** The `data-action` hook. */
    action: string
}) {
    return <button type="button" data-action={props.action} data-revealed={props.revealed} onClick={props.onToggle}>
        {props.revealed ? props.hideLabel : props.showLabel}
    </button>;
}
