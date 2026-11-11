import {message, Message, messageNumber} from "../../localization";
import {FunctionInverseIssue} from "../../analysis/functionInverseModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for an inverse-function rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with
 * the range and the allowed values it names, comes from `analysis/functionInverseModel`; this only chooses the localized text.
 */
export function functionInverseFileMessage(issue: FunctionInverseIssue): Message {
    switch (issue.kind) {
        case "restriction": return message("invalid_function_inverse_restriction", {value0: issue.allowed.join(", ")});
        case "base-one": return message("invalid_function_inverse_base_one");
        case "range": return message("invalid_function_inverse_range", {value0: issue.field, value1: bound(issue.min), value2: bound(issue.max)});
        case "visibility": return message("invalid_function_inverse_visibility", {value0: issue.field});
    }
}

/** The words for a rule that an edit (number field, drag or lesson action) would break; bounds follow the current language. */
export function functionInverseEditMessage(issue: FunctionInverseIssue): Message {
    switch (issue.kind) {
        case "restriction": return message("function_inverse_restriction_rejected", {value0: issue.allowed.join(", ")});
        case "base-one": return message("function_inverse_base_one_rejected");
        case "range": return message("function_inverse_range_rejected", {
            value0: issue.field, value1: messageNumber(issue.min), value2: messageNumber(issue.max),
        });
        case "visibility": return message("invalid_function_inverse_visibility", {value0: issue.field});
    }
}
