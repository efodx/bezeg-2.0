import {message, Message, messageNumber} from "../../localization";
import {QuadratureIssue} from "../../analysis/quadratureModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a quadrature rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges and the allowed values it names, comes from `analysis/quadratureModel`; this only chooses the localized text.
 */
export function quadratureFileMessage(issue: QuadratureIssue): Message {
    switch (issue.kind) {
        case "rule": return message("invalid_quadrature_rule", {value0: issue.allowed.join(", ")});
        case "function": return message("invalid_quadrature_function", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_quadrature_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_quadrature_order");
        case "count": return message(issue.even ? "invalid_quadrature_count_even" : "invalid_quadrature_count", {value0: issue.min, value1: issue.max});
    }
}

/**
 * The words for a quadrature rule that an edit (number field, drag, slider or lesson action) would break. Used by the graph's
 * setters, so the `DomainError` a learner can see is localized.
 */
export function quadratureEditMessage(issue: QuadratureIssue): Message {
    switch (issue.kind) {
        case "rule": return message("quadrature_rule_rejected", {value0: issue.allowed.join(", ")});
        case "function": return message("quadrature_function_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [endpoint] = issue.endpoints;
            return message("quadrature_endpoint_range_rejected", {
                value0: endpoint, value1: messageNumber(issue.min), value2: messageNumber(issue.max),
            });
        }
        case "order": return message(issue.moving === "b" ? "quadrature_b_rejected_hint" : "quadrature_a_rejected_hint");
        case "count": return message(issue.even ? "quadrature_n_even_rejected" : "quadrature_n_rejected", {value0: issue.min, value1: issue.max});
    }
}
