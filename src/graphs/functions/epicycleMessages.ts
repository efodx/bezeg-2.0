import {message, Message} from "../../localization";
import {EpicycleIssue} from "../../analysis/epicycleModel";

/**
 * The words for an epicycle rule that a value, an edit or a stored file broke. The rule itself, with the range and the choices it
 * names, comes from `analysis/epicycleModel`; this only chooses the localized text.
 */
export function epicycleIssueMessage(issue: EpicycleIssue): Message {
    switch (issue.kind) {
        case "vertex-count": return message("epicycle_issue_vertex_count", {value0: issue.min, value1: issue.max});
        case "spans-count": return message("epicycle_issue_spans_count", {value0: issue.expected});
        case "span-kind": return message("epicycle_issue_span_kind");
        case "coordinate": return message("epicycle_issue_coordinate", {value0: issue.min, value1: issue.max});
        case "n": return message("epicycle_issue_n", {value0: issue.min, value1: issue.max});
        case "parametrization": return message("epicycle_issue_parametrization", {value0: issue.allowed.join(", ")});
        case "example": return message("epicycle_issue_example", {value0: issue.allowed.join(", ")});
        case "index": return message("epicycle_issue_index");
        case "no-control": return message("epicycle_issue_no_control");
    }
}

/** A Preset or file that broke a rule: the rule, then what to do ("correct the value in the file"). */
export function epicycleFileMessage(issue: EpicycleIssue): Message {
    return message("invalid_epicycle_data", {value0: epicycleIssueMessage(issue)});
}
