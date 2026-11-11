import {message, Message, messageNumber} from "../../localization";
import {MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {PolynomialZerosIssue} from "../../analysis/polynomialZerosModel";
import {polyText} from "../../analysis/polynomial";
import {PolySpec} from "../../analysis/schoolFunctions";
import {zeroListFileMessage, zeroListIssueMessage} from "./zeroListMessages";

/** The reason a value was refused, in the current language (used by the graph's setters, so a learner never sees English by accident). */
export function polynomialZerosEditMessage(issue: PolynomialZerosIssue): Message {
    switch (issue.kind) {
        case "k-zero": return message("polynomial_zeros_k_zero");
        case "k-range": return message("polynomial_zeros_k_range", {
            value0: messageNumber(issue.min), value1: messageNumber(issue.max),
        });
        case "example": return message("polynomial_zeros_example_rejected", {value0: issue.allowed.join(", ")});
        case "visibility": return message("polynomial_zeros_visibility");
        default: return zeroListIssueMessage(issue);
    }
}

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function polynomialZerosFileMessage(issue: PolynomialZerosIssue): Message {
    switch (issue.kind) {
        case "k-zero":
        case "k-range":
        case "example":
        case "visibility": return message("zero_list_file", {value0: polynomialZerosEditMessage(issue)});
        default: return zeroListFileMessage(issue);
    }
}

/** Slovenian writes a decimal comma; the kernel text always writes a point. */
const localizeDecimals = (text: string, language: NumberLanguage): string =>
    language === "sl" ? text.replace(/(\d)\.(\d)/g, "$1,$2") : text;

/** The product form "k(x + 2)(x − 1)²" of a spec in plain text, with the decimal convention of the language. */
export function polynomialProductText(spec: PolySpec, language: NumberLanguage): string {
    return localizeDecimals(polyText(spec, {text: "x", atomic: true}, true).replace(/-/g, MINUS_SIGN), language);
}

/** "p(x) = ..." for the board and the readout. */
export const polynomialRuleText = (spec: PolySpec, language: NumberLanguage): string => `p(x) = ${polynomialProductText(spec, language)}`;
