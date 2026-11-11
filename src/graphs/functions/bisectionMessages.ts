import {message, Message, messageNumber} from "../../localization";
import {BisectionEditIssue, BisectionIssue} from "../../analysis/bisectionModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a bisection rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the examples it names, comes from `analysis/bisectionModel`; this only chooses the localized text.
 */
export function bisectionFileMessage(issue: BisectionIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_bisection_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_bisection_endpoints", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_bisection_order");
        case "step": return message("invalid_bisection_step", {value0: issue.max});
    }
}

/**
 * The words for a bisection rule that an edit (number field or lesson action) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized.
 */
export function bisectionEditMessage(issue: BisectionEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("bisection_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [endpoint] = issue.endpoints;
            return message("bisection_endpoint_range_rejected", {
                value0: endpoint, value1: messageNumber(issue.min), value2: messageNumber(issue.max),
            });
        }
        case "order": return message(issue.moving === "b" ? "bisection_b_rejected_hint" : "bisection_a_rejected_hint");
    }
}
