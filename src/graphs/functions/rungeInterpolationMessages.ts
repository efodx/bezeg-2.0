import {currentLanguage, message, Message, t} from "../../localization";
import {RungeIssue} from "../../analysis/rungeInterpolationModel";
import {InterpolationFunctionId} from "../../analysis/interpolation";
import {formatSignificant} from "../../analysis/format";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function rungeFileMessage(issue: RungeIssue): Message {
    switch (issue.kind) {
        case "function": return message("interp_runge_invalid_function", {value0: issue.allowed.join(", ")});
        case "degree": return message("interp_runge_invalid_degree", {value0: issue.min, value1: issue.max});
        case "rule": return message("interp_runge_invalid_rule", {value0: issue.allowed.join(", ")});
        case "flag": return message("interp_runge_invalid_flag", {value0: issue.field});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function rungeEditMessage(issue: RungeIssue): Message {
    switch (issue.kind) {
        case "degree": return message("interp_runge_degree_rejected", {value0: issue.min, value1: issue.max});
        case "rule": return message("interp_runge_rule_rejected");
        case "function": return message("interp_runge_function_rejected");
        // The switches can only write booleans, so only a file produces this; its message names the field.
        case "flag": return rungeFileMessage(issue);
    }
}

/** The localized name of a function of the closed list. */
export function rungeFunctionName(id: InterpolationFunctionId): string {
    switch (id) {
        case "runge": return t("interp_runge_function_runge");
        case "abs": return t("interp_runge_function_abs");
        case "sine": return t("interp_runge_function_sine");
    }
}

/** A number with significant digits in the current language. */
export const rungeNumber = (value: number, digits = 4) => formatSignificant(value, currentLanguage(), digits);
