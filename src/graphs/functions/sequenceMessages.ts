import {message, Message, messageNumber} from "../../localization";
import {SequenceEditIssue, SequenceIssue} from "../../analysis/sequenceModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a sequence rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges, grid steps and examples it names, comes from `analysis/sequenceModel`; this only chooses the localized text.
 */
export function sequenceFileMessage(issue: SequenceIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_sequence_example", {value0: issue.allowed.join(", ")});
        case "epsilon": return message("invalid_sequence_epsilon", {value0: bound(issue.min), value1: bound(issue.max), value2: bound(issue.step)});
        case "limit": return message("invalid_sequence_limit", {value0: bound(issue.min), value1: bound(issue.max), value2: bound(issue.step)});
        case "threshold": return message("invalid_sequence_threshold", {value0: issue.min, value1: issue.max});
        case "terms": return message("invalid_sequence_terms", {value0: issue.min, value1: issue.max});
        case "visibility": return message("invalid_sequence_visibility");
    }
}

/**
 * The words for a sequence rule that an edit (number field or lesson action) would break. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized. The bounds are formatted as the fields' own hints format them.
 */
export function sequenceEditMessage(issue: SequenceEditIssue): Message {
    switch (issue.kind) {
        case "example": return message("sequence_example_rejected", {value0: issue.allowed.join(", ")});
        case "epsilon": return message("sequence_epsilon_rejected_hint", {value0: messageNumber(issue.min, 2), value1: messageNumber(issue.max, 2)});
        case "limit": return message("sequence_limit_rejected_hint", {value0: messageNumber(issue.min), value1: messageNumber(issue.max)});
        case "threshold": return message("sequence_threshold_rejected_hint", {value0: issue.min, value1: issue.max});
    }
}
