import {currentLanguage, message, Message} from "../../localization";
import {AccumulationEditIssue, AccumulationIssue} from "../../analysis/accumulationModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for an accumulation rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with
 * the range and the functions it names, comes from `analysis/accumulationModel`; this only chooses the localized text.
 */
export function accumulationFileMessage(issue: AccumulationIssue): Message {
    switch (issue.kind) {
        case "function": return message("invalid_accumulation_function", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_accumulation_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "visibility": return message("invalid_accumulation_visibility");
    }
}

/**
 * The words for an accumulation rule that an edit (number field, lesson action, drag) would break. Used by the graph's setters, so
 * the `DomainError` a learner can see is localized.
 */
export function accumulationEditMessage(issue: AccumulationEditIssue): Message {
    switch (issue.kind) {
        case "function": return message("accumulation_function_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language.
            const min = formatNumber(issue.min, currentLanguage()), max = formatNumber(issue.max, currentLanguage());
            return issue.points[0] === "x"
                ? message("accumulation_x_range_rejected", {value0: min, value1: max})
                : message("accumulation_a_range_rejected", {value0: min, value1: max});
        }
    }
}
