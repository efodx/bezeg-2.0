import React from "react";
import {isMessageNumber, Message, renderMessage, useT} from "../localization";
import "./RefusalChannel.css";

/** What a graph tells the learner when the model refused an edit: a localizable message, or a plain text when only that exists. */
export type Refusal = Message | string | (() => Message | string);

/** The refusal's text now: a function is called at render, so that numbers it formats follow the current language. */
function resolved(refusal: Refusal): Message | string {
    return typeof refusal === "function" ? refusal() : refusal;
}

function sameRefusal(a: Refusal, b: Refusal): boolean {
    if (typeof a === "string" || typeof b === "string" || typeof a === "function" || typeof b === "function") return a === b;
    const keys = Object.keys(a.params);
    return a.key === b.key && keys.length === Object.keys(b.params).length
        && keys.every(name => {
            const left = a.params[name], right = b.params[name];
            if (typeof left !== "object" || typeof right !== "object") return left === right;
            if (isMessageNumber(left) || isMessageNumber(right)) {
                return isMessageNumber(left) && isMessageNumber(right) && left.value === right.value && left.maxDecimals === right.maxDecimals;
            }
            return sameRefusal(left, right);
        });
}

/**
 * The one refusal a graph shows: at most one at a time, kept until an edit is accepted. A message is stored, not its text, so
 * that a language switch re-renders it. The owner wires `onChange` to its re-render.
 */
export class RefusalChannel {
    private current?: Refusal;
    private serial = 0;

    constructor(private readonly onChange?: () => void) {}

    get refusal(): Refusal | undefined {
        return this.current;
    }

    /** The count of announced refusals; the notice re-mounts its line when it changes, so a repeated refusal is read again. */
    get announcements(): number {
        return this.serial;
    }

    /**
     * `announce` marks a refusal of a deliberate action (a press, a typed value): the same refusal again is announced again.
     * Without it (drag frames) an equal refusal changes nothing.
     */
    refuse(refusal: Refusal, announce = false): void {
        if (!announce && this.current !== undefined && sameRefusal(this.current, refusal)) return;
        this.current = refusal;
        this.serial += 1;
        this.onChange?.();
    }

    clear(): void {
        if (this.current === undefined) return;
        this.current = undefined;
        this.onChange?.();
    }
}

/**
 * Shows the channel's refusal alone in its own polite status region (the region is always present so that a change is
 * announced). Other status lines belong in another region.
 */
export function RefusalNotice({channel}: {readonly channel: RefusalChannel}) {
    useT(); // re-render on a language switch
    const current = channel.refusal;
    const refusal = current === undefined ? undefined : resolved(current);
    return <div role="status" aria-live="polite" data-refusal-notice>
        {refusal !== undefined && <p key={channel.announcements} className="inspector-help">{typeof refusal === "string" ? refusal : renderMessage(refusal)}</p>}
    </div>;
}
