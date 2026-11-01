import {currentLanguage, message, Message} from "../../localization";
import {RootFindingEditIssue, RootFindingIssue} from "../../analysis/rootFindingModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a root-finding rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * range and the allowed values it names, comes from `analysis/rootFindingModel`; this only chooses the localized text.
 */
export function rootFindingFileMessage(issue: RootFindingIssue): Message {
    switch (issue.kind) {
        case "method": return message("invalid_root_finding_method", {value0: issue.allowed.join(", ")});
        case "example": return message("invalid_root_finding_example", {value0: issue.allowed.join(", ")});
        case "range": return message("invalid_root_finding_starts", {value0: bound(issue.min), value1: bound(issue.max)});
        case "equal-starts": return message("invalid_root_finding_equal_starts");
        case "step": return message("invalid_root_finding_step", {value0: issue.max});
    }
}

/**
 * The words for a root-finding rule that an edit (number field, drag or lesson action) would break. Used by the graph's setters, so
 * the `DomainError` a learner can see is localized.
 */
export function rootFindingEditMessage(issue: RootFindingEditIssue): Message {
    switch (issue.kind) {
        case "method": return message("root_finding_method_rejected", {value0: issue.allowed.join(", ")});
        case "example": return message("root_finding_example_rejected", {value0: issue.allowed.join(", ")});
        case "range": {
            // Edit messages are read in the app, so bounds follow the current language like the fields' own hints.
            const [start] = issue.starts;
            return message("root_finding_start_range_rejected", {
                value0: start, value1: formatNumber(issue.min, currentLanguage()), value2: formatNumber(issue.max, currentLanguage()),
            });
        }
        case "equal-starts": return message("root_finding_equal_starts_rejected");
    }
}
