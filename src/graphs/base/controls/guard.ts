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
