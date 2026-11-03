import {currentLanguage, message, Message} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ZeroListIssue} from "../../analysis/zeroListModel";

/**
 * The words for a zero list rule that a value broke. The rule itself, with the range, the grid and the cap it names, comes from
 * `analysis/zeroListModel`; this only chooses the localized text. Shared by the polynomial-zeros and the rational-function graph.
 * The texts are sentence fragments without a final full stop, so the file wrapper can append its instruction.
 */
export function zeroListIssueMessage(issue: ZeroListIssue): Message {
    const number = (value: number) => formatNumber(value, currentLanguage());
    switch (issue.kind) {
        case "zero-range": return message("zero_list_range", {value0: number(issue.min), value1: number(issue.max)});
        case "zero-grid": return message("zero_list_grid", {value0: number(issue.step)});
        case "multiplicity": return message("zero_list_multiplicity", {value0: number(issue.min), value1: number(issue.max)});
        case "degree": return message("zero_list_degree", {value0: number(issue.max)});
        case "merge": return message("zero_list_merge", {value0: number(issue.z), value1: number(issue.max)});
    }
}

/** A rule a stored file broke: the reason, then what to do about it. */
export const zeroListFileMessage = (issue: ZeroListIssue): Message => message("zero_list_file", {value0: zeroListIssueMessage(issue)});
