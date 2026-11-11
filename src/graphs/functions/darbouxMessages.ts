import {message, Message, messageNumber} from "../../localization";
import {DarbouxEditIssue, DarbouxIssue} from "../../analysis/darbouxModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a Darboux rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges and the examples it names, comes from `analysis/darbouxModel`; this only chooses the localized text.
 */
export function darbouxFileMessage(issue: DarbouxIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_darboux_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_darboux_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_darboux_order");
        case "count": return message("invalid_darboux_count", {value0: issue.min, value1: issue.max});
        case "visibility": return message("invalid_darboux_visibility");
    }
}

/**
 * The words for a Darboux rule that an edit (number field, lesson action, drag or the refine button) would break. Used by the graph's
 * setters, so the `DomainError` a learner can see is localized.
 */
export function darbouxEditMessage(issue: DarbouxEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("darboux_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [endpoint] = issue.endpoints;
            return message("darboux_endpoint_range_rejected", {
                value0: endpoint, value1: messageNumber(issue.min), value2: messageNumber(issue.max),
            });
        }
        case "order": return message(issue.moving === "b" ? "darboux_b_rejected_hint" : "darboux_a_rejected_hint");
        case "count": return message("darboux_n_rejected_hint", {value0: issue.min, value1: issue.max});
        case "refine-limit": return message("darboux_refine_limit", {value0: issue.max});
    }
}
