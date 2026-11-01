import {currentLanguage, message, Message} from "../../localization";
import {ExtremaEditIssue, ExtremaIssue} from "../../analysis/extremaModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for an extrema rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the examples it names, comes from `analysis/extremaModel`; this only chooses the localized text.
 */
export function extremaFileMessage(issue: ExtremaIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_extrema_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_extrema_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_extrema_order");
        case "visibility": return message("invalid_extrema_revealed");
    }
}

/**
 * The words for an extrema rule that an edit (number field, lesson action, drag) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized.
 */
export function extremaEditMessage(issue: ExtremaEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("extrema_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [point] = issue.points;
            return message("extrema_endpoint_range_rejected", {
                value0: point, value1: formatNumber(issue.min, currentLanguage()), value2: formatNumber(issue.max, currentLanguage()),
            });
        }
        case "order": return message(issue.moving === "b" ? "extrema_b_rejected_hint" : "extrema_a_rejected_hint");
    }
}
