import {currentLanguage, message, Message} from "../../localization";
import {MeanValueEditIssue, MeanValueIssue} from "../../analysis/meanValueModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a mean value rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the examples it names, comes from `analysis/meanValueModel`; this only chooses the localized text.
 */
export function meanValueFileMessage(issue: MeanValueIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_mean_value_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_mean_value_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_mean_value_order");
        case "revealed": return message("invalid_mean_value_revealed");
    }
}

/**
 * The words for a mean value rule that an edit (number field, lesson action, drag) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized.
 */
export function meanValueEditMessage(issue: MeanValueEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("mean_value_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [point] = issue.points;
            const min = formatNumber(issue.min, currentLanguage()), max = formatNumber(issue.max, currentLanguage());
            return point === "c"
                ? message("mean_value_c_range_rejected", {value0: min, value1: max})
                : message("mean_value_endpoint_range_rejected", {value0: point, value1: min, value2: max});
        }
        case "order":
            return message(issue.moving === "a" ? "mean_value_a_rejected_hint" : issue.moving === "b" ? "mean_value_b_rejected_hint" : "mean_value_c_rejected_hint");
    }
}
