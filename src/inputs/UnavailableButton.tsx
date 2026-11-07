import React, {useId} from "react";
import {joinIds} from "./describedBy";

interface UnavailableButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "title" | "disabled"> {
    /** Why the button cannot act now. With a reason it is unavailable; without one it is an ordinary button. */
    readonly reason?: string;
    readonly onPress: () => void;
    /** Called with the reason when an unavailable button is pressed (click, Enter or Space); the owner shows it in its status region. */
    readonly onBlockedPress?: (reason: string) => void;
}

/**
 * A button that can be unavailable without losing keyboard focus. Unavailable means aria-disabled (never `disabled`, which would
 * drop focus from a focused button), the reason in `title` and in a hidden description linked by aria-describedby, and no action on
 * click, Enter or Space; pressing it hands the reason to `onBlockedPress` so the owner can announce it.
 */
export function UnavailableButton({reason, onPress, onBlockedPress, children, ...attributes}: UnavailableButtonProps) {
    const descriptionId = `${useId()}-reason`;
    return <>
        <button {...attributes} type="button" aria-disabled={reason !== undefined} title={reason}
                aria-describedby={joinIds(reason !== undefined ? descriptionId : undefined, attributes["aria-describedby"])}
                onClick={() => {
                    if (reason === undefined) onPress();
                    else onBlockedPress?.(reason);
                }}>{children}</button>
        {reason !== undefined && <span id={descriptionId} hidden>{reason}</span>}
    </>;
}
