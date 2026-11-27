import {currentLanguage, message, messageNumber, type Message, type MessageNumber} from "../../localization";
import type {FormattedValue} from "../base/declare/graphDeclaration";
import {formatArgument} from "../../analysis/complexFormat";
import type {Complex} from "../../analysis/complex";

/** Decimals of a complex coordinate in a readout (`formatCoordinate`). */
const DIGITS = 4;
const rounded = (value: number): number => Number(value.toFixed(DIGITS));

/**
 * A complex number as the catalog message "a + bi" ("1 + i", "−1 + i", "2", "−i", "0,5 − 1,25i", "0"), the same text as `formatComplex`
 * but built from message pieces, because a declared value may not hold a formatted string with letters (the imaginary unit).
 */
export function complexValueMessage(z: Complex): Message | MessageNumber {
    const re = rounded(z.re);
    const im = rounded(z.im);
    if (im === 0) return messageNumber(z.re, DIGITS);
    const magnitude = Math.abs(im);
    const part = magnitude === 1 ? message("complex_value_i") : message("complex_value_imag", {value0: messageNumber(Math.abs(z.im), DIGITS)});
    if (re === 0) return im < 0 ? message("complex_value_negative", {value0: part}) : part;
    return im < 0 ? message("complex_value_minus", {value0: messageNumber(z.re, DIGITS), value1: part})
        : message("complex_value_plus", {value0: messageNumber(z.re, DIGITS), value1: part});
}

/** An argument in radians as the text `formatArgument` gives (digits, π and signs only); "not defined" is a catalog word. */
export function argumentValue(value: number | undefined): FormattedValue | Message {
    if (value === undefined) return message("complex_undefined");
    return {kind: "formatted", text: formatArgument(value, currentLanguage(), "")};
}
