import {message, Message, messageNumber} from "../../localization";

/**
 * A formula the kernel wrote as plain text (symbols and numbers with a decimal point) as a catalog message: every number becomes a
 * `MessageNumber`, so it is formatted when the message renders and the decimal comma follows a language switch. The symbols between
 * the numbers are not words, so they pass through as literal parameters of the join message.
 */
export function formulaMessage(text: string): Message {
    const pieces = text.split(/(\d+(?:\.\d+)?)/).filter(piece => piece !== "");
    let tail: Message | string = "";
    for (let index = pieces.length - 1; index >= 0; index--) {
        const piece = pieces[index];
        const head = /^\d/.test(piece) ? messageNumber(Number(piece), (piece.split(".")[1] ?? "").length) : piece;
        tail = message("function_formula_join", {value0: head, value1: tail});
    }
    return typeof tail === "string" ? message("function_formula_join", {value0: "", value1: ""}) : tail;
}

/** Messages (or formulas) one after the other, a literal separator between them; the empty list is the empty text. */
export function joinedMessage(parts: readonly Message[], separator: string): Message {
    let tail: Message | undefined;
    for (let index = parts.length - 1; index >= 0; index--) {
        tail = tail === undefined ? parts[index] : message("function_formula_join", {value0: parts[index], value1: message("function_formula_join", {value0: separator, value1: tail})});
    }
    return tail ?? message("function_formula_join", {value0: "", value1: ""});
}
