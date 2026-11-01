import {currentLanguage, message, Message} from "../../localization";
import {TaylorEditIssue, TaylorIssue} from "../../analysis/taylorModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a Taylor rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges and the examples it names, comes from `analysis/taylorModel`; this only chooses the localized text.
 */
export function taylorFileMessage(issue: TaylorIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_taylor_example", {value0: issue.allowed.join(", ")});
        case "center":
            return issue.min === issue.max
                ? message("invalid_taylor_center_fixed", {value0: issue.example, value1: bound(issue.min)})
                : message("invalid_taylor_center", {value0: issue.example, value1: bound(issue.min), value2: bound(issue.max)});
        case "degree": return message("invalid_taylor_degree", {value0: issue.min, value1: issue.max});
        case "x": return message("invalid_taylor_x", {value0: issue.example, value1: bound(issue.min), value2: bound(issue.max)});
        case "visibility": return message("invalid_taylor_visibility");
    }
}

/**
 * The words for a Taylor rule that an edit (number field, lesson action, drag) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized. Bounds follow the current language like the fields' own hints.
 */
export function taylorEditMessage(issue: TaylorEditIssue): Message {
    const language = currentLanguage();
    switch (issue.kind) {
        case "example": return message("taylor_example_rejected", {value0: issue.allowed.join(", ")});
        case "center":
            return issue.min === issue.max
                ? message("taylor_center_fixed_rejected", {value0: formatNumber(issue.min, language)})
                : message("taylor_center_rejected_hint", {value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language)});
        case "degree": return message("taylor_degree_rejected_hint", {value0: issue.min, value1: issue.max});
        case "x": return message("taylor_x_rejected_hint", {value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language)});
    }
}
