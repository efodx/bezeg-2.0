import {message, Message, messageNumber} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {RationalFunctionIssue} from "../../analysis/rationalFunctionModel";
import {polyText} from "../../analysis/polynomial";
import {PolySpec} from "../../analysis/schoolFunctions";
import {zeroListFileMessage, zeroListIssueMessage} from "./zeroListMessages";

/** The reason a value was refused, in the current language (used by the graph's setters, so a learner never sees English by accident). */
export function rationalFunctionEditMessage(issue: RationalFunctionIssue): Message {
    const number = (value: number) => messageNumber(value);
    switch (issue.kind) {
        case "k-zero": return message("rational_function_k_zero");
        case "k-range": return message("rational_function_k_range", {value0: number(issue.min), value1: number(issue.max)});
        case "probe-range": return message("rational_function_probe_range", {value0: number(issue.min), value1: number(issue.max)});
        case "example": return message("rational_function_example_rejected", {value0: issue.allowed.join(", ")});
        default: return zeroListIssueMessage(issue);
    }
}

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function rationalFunctionFileMessage(issue: RationalFunctionIssue): Message {
    switch (issue.kind) {
        case "k-zero":
        case "k-range":
        case "probe-range":
        case "example": return message("zero_list_file", {value0: rationalFunctionEditMessage(issue)});
        default: return zeroListFileMessage(issue);
    }
}

/** Slovenian writes a decimal comma; the kernel text always writes a point. */
const localizeDecimals = (text: string, language: NumberLanguage): string =>
    language === "sl" ? text.replace(/(\d)\.(\d)/g, "$1,$2") : text;

/** The product form "k(x + 2)(x − 1)²" of a spec in plain text, with the decimal convention of the language. */
export const productText = (spec: PolySpec, language: NumberLanguage): string =>
    localizeDecimals(polyText(spec, {text: "x", atomic: true}, true).replace(/-/g, MINUS_SIGN), language);

/** A denominator with more than one factor is bracketed in "p / (q)". */
const bracketedDenominator = (spec: PolySpec, language: NumberLanguage): string => {
    const text = productText(spec, language);
    return spec.zeros.length + (spec.k === 1 ? 0 : 1) > 1 ? `(${text})` : text;
};

/** "p(x) / q(x)" in product form; the bare right-hand side of the rule. */
export const fractionText = (numerator: PolySpec, denominator: PolySpec, language: NumberLanguage): string =>
    denominator.zeros.length === 0 && denominator.k === 1
        ? productText(numerator, language)
        : `${productText(numerator, language)} / ${bracketedDenominator(denominator, language)}`;

/** "f(x) = ..." for the board and the readout. */
export const rationalRuleText = (numerator: PolySpec, denominator: PolySpec, language: NumberLanguage): string =>
    `f(x) = ${fractionText(numerator, denominator, language)}`;

/** Ascending coefficients as a polynomial in x ("x + 2", "−0,5x² + 1"); the zero polynomial is "0". */
export function coefficientsText(coefficients: readonly number[], language: NumberLanguage): string {
    const parts: string[] = [];
    for (let degree = coefficients.length - 1; degree >= 0; degree--) {
        const value = coefficients[degree];
        if (Math.abs(value) < 1e-12) continue;
        const size = Math.abs(value);
        const power = degree === 0 ? "" : degree === 1 ? "x" : `x${["", "", "²", "³", "⁴", "⁵"][degree] ?? `^${degree}`}`;
        const digits = degree > 0 && Math.abs(size - 1) < 1e-12 ? "" : formatNumber(size, language, 4);
        const body = `${digits}${power}`;
        parts.push(parts.length === 0 ? (value < 0 ? `${MINUS_SIGN}${body}` : body) : ` ${value < 0 ? MINUS_SIGN : "+"} ${body}`);
    }
    return parts.length === 0 ? "0" : parts.join("");
}

/** "y = x + 2", "y = 2", "y = −0,5x": the equation of an asymptote y = slope x + intercept. */
export const asymptoteEquationText = (slope: number, intercept: number, language: NumberLanguage): string =>
    `y = ${coefficientsText([intercept, slope], language)}`;
