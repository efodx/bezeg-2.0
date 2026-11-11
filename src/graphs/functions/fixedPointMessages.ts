import {message, Message, messageNumber} from "../../localization";
import {FixedPointEditIssue, FixedPointIssue} from "../../analysis/fixedPointModel";
import {formatNumber} from "../../analysis/format";

/** A bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a fixed-point rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the examples it names, comes from `analysis/fixedPointModel`; this only chooses the localized text.
 */
export function fixedPointFileMessage(issue: FixedPointIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_fixed_point_example", {value0: issue.allowed.join(", ")});
        case "x0": return message("invalid_fixed_point_x0", {value0: issue.example, value1: bound(issue.min), value2: bound(issue.max)});
        case "step": return message("invalid_fixed_point_step", {value0: issue.max});
        case "digits": return message("invalid_fixed_point_digits", {value0: issue.min, value1: issue.max});
        case "visibility": return message("invalid_fixed_point_visibility");
    }
}

/**
 * The words for a fixed-point rule that an edit (number field, lesson action) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized. Bounds follow the current language like the fields' own hints.
 */
export function fixedPointEditMessage(issue: FixedPointEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("fixed_point_example_rejected", {value0: issue.allowed.join(", ")});
        case "x0": return message("fixed_point_x0_rejected_hint", {
            value0: messageNumber(issue.min), value1: messageNumber(issue.max),
        });
        case "digits": return message("fixed_point_digits_rejected_hint", {value0: issue.min, value1: issue.max});
    }
}
