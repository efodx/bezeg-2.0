import {currentLanguage, message, Message} from "../../localization";
import {FunctionTransformationIssue} from "../../analysis/functionTransformationModel";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {TransformParams} from "../../analysis/transformation";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a transformation rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the allowed values it names, comes from `analysis/functionTransformationModel`; this only chooses the localized text.
 */
export function functionTransformationFileMessage(issue: FunctionTransformationIssue): Message {
    switch (issue.kind) {
        case "base": return message("invalid_function_transformation_base", {value0: issue.allowed.join(", ")});
        case "b-zero": return message("invalid_function_transformation_b_zero");
        case "range": return message("invalid_function_transformation_range", {value0: issue.field, value1: bound(issue.min), value2: bound(issue.max)});
        case "visibility": return message("invalid_function_transformation_visibility");
    }
}

/**
 * The words for a rule that an edit (number field, drag or lesson action) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized. Bounds follow the current language like the fields' own hints.
 */
export function functionTransformationEditMessage(issue: FunctionTransformationIssue): Message {
    switch (issue.kind) {
        case "base": return message("function_transformation_base_rejected", {value0: issue.allowed.join(", ")});
        case "b-zero": return message("function_transformation_b_zero_rejected");
        case "range": return message("function_transformation_range_rejected", {
            value0: issue.field, value1: formatNumber(issue.min, currentLanguage()), value2: formatNumber(issue.max, currentLanguage()),
        });
        case "visibility": return message("invalid_function_transformation_visibility");
    }
}

const PRECISE = 4;

/** A coefficient written in front of a factor: 1 is left out and -1 is a bare minus sign. */
const coefficient = (value: number, language: NumberLanguage): string =>
    value === 1 ? "" : value === -1 ? MINUS_SIGN : formatNumber(value, language, PRECISE);

/** `x - c` (or `x + |c|`; plain `x` for c = 0), the first operation inside f. */
export const shiftedArgument = (c: number, language: NumberLanguage): string =>
    c === 0 ? "x" : `x ${c > 0 ? MINUS_SIGN : "+"} ${formatNumber(Math.abs(c), language, PRECISE)}`;

/**
 * The composed rule written out, y = a f(b(x - c)) + d, with the numbers filled in and identity parameters left out (a = 1, b = 1,
 * c = 0, d = 0); decimal comma in Slovenian. Mathematical notation, not prose, so it is the same sentence in both languages.
 */
export function transformRuleText(p: TransformParams, language: NumberLanguage): string {
    const inside = p.c === 0
        ? `${coefficient(p.b, language)}x`
        : p.b === 1 ? shiftedArgument(p.c, language) : `${coefficient(p.b, language)}(${shiftedArgument(p.c, language)})`;
    const outside = p.d === 0 ? "" : ` ${p.d > 0 ? "+" : MINUS_SIGN} ${formatNumber(Math.abs(p.d), language, PRECISE)}`;
    const factor = coefficient(p.a, language);
    return `y = ${factor}${factor === "" || factor === MINUS_SIGN ? "" : " "}f(${inside})${outside}`;
}
