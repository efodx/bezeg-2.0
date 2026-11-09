import {DomainError} from "../../functions/BaseFunctionGraph";
import type {RefusalChannel} from "../../../inputs/RefusalChannel";

/**
 * Runs an inspector edit. An accepted edit (including an accepted no-op) clears the channel and returns true; a `DomainError`
 * becomes the channel's refusal (its localizable reason, else its message text) and returns false; any other error is a bug and is
 * rethrown.
 */
export function guard(channel: RefusalChannel, action: () => void): boolean {
    try {
        action();
    } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        channel.refuse(error.reason ?? error.message, true);
        return false;
    }
    channel.clear();
    return true;
}

/**
 * Runs an edit made in a typed field (a number field, a slider's exact field, a count field). A typed value is refused in one place,
 * the field itself, which shows its hint when this returns false; so a `DomainError` returns false and nothing goes to the channel.
 * An accepted edit clears the channel; any other error is a bug and is rethrown.
 */
export function guardField(channel: RefusalChannel, action: () => void): boolean {
    try {
        action();
    } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        return false;
    }
    channel.clear();
    return true;
}
