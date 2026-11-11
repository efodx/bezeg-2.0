import {message, Message, messageNumber} from "../../localization";
import {ConvexityEditIssue, ConvexityIssue} from "../../analysis/convexityModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a convexity rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the examples it names, comes from `analysis/convexityModel`; this only chooses the localized text.
 */
export function convexityFileMessage(issue: ConvexityIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_convexity_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_convexity_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_convexity_order");
        case "visibility": return message("invalid_convexity_visibility");
    }
}

/**
 * The words for a convexity rule that an edit (number field, lesson action, drag) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized.
 */
export function convexityEditMessage(issue: ConvexityEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("convexity_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [point] = issue.points;
            const min = messageNumber(issue.min), max = messageNumber(issue.max);
            return point === "t"
                ? message("convexity_t_rejected_hint", {value0: min, value1: max})
                : message("convexity_endpoint_range_rejected", {value0: point, value1: min, value2: max});
        }
        case "order": return message(issue.moving === "b" ? "convexity_b_rejected_hint" : "convexity_a_rejected_hint");
    }
}
