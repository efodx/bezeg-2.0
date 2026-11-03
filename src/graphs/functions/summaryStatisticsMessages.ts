import {message, Message} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {SummaryIssue, SUMMARY_VALUES_MAX, SUMMARY_VALUES_MIN} from "../../analysis/summaryStatisticsModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function summaryFileMessage(issue: SummaryIssue): Message {
    switch (issue.kind) {
        case "values": return message("prob_summary_invalid_values", {value0: issue.min, value1: issue.max});
        case "value": return message("prob_summary_invalid_value", {value0: issue.min, value1: issue.max});
        case "grid": return message("prob_summary_invalid_grid");
        case "index": return message("prob_summary_invalid_values", {value0: SUMMARY_VALUES_MIN, value1: SUMMARY_VALUES_MAX});
        case "full": return message("prob_summary_invalid_values", {value0: SUMMARY_VALUES_MIN, value1: SUMMARY_VALUES_MAX});
        case "last": return message("prob_summary_invalid_values", {value0: issue.min, value1: SUMMARY_VALUES_MAX});
        case "rule": return message("prob_summary_invalid_rule", {value0: issue.allowed.join(", ")});
        case "sigma": return message("prob_summary_invalid_sigma", {value0: issue.allowed.join(", ")});
        case "flag": return message("prob_summary_invalid_flag", {value0: issue.field});
        case "example": return message("prob_summary_invalid_example", {value0: issue.allowed.join(", ")});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function summaryEditMessage(issue: SummaryIssue): Message {
    switch (issue.kind) {
        case "values": return message("prob_summary_values_rejected", {value0: issue.min, value1: issue.max});
        case "value": return message("prob_summary_value_rejected", {value0: issue.min, value1: issue.max});
        case "grid": return message("prob_summary_invalid_grid");
        case "index": return message("prob_summary_index_rejected", {value0: issue.count});
        case "full": return message("prob_summary_full_rejected", {value0: issue.max});
        case "last": return message("prob_summary_last_rejected", {value0: issue.min});
        case "rule": return message("prob_summary_rule_rejected", {value0: issue.allowed.join(", ")});
        case "sigma": return message("prob_summary_sigma_rejected", {value0: issue.allowed.join(", ")});
        case "flag": return message("prob_summary_flag_rejected", {value0: issue.field});
        case "example": return message("prob_summary_example_rejected", {value0: issue.allowed.join(", ")});
    }
}

/** A mean or deviation, at most six decimals (5,857143); the quartiles and fences are at most two. */
export const summaryNumber = (value: number, language: NumberLanguage, decimals = 6): string => formatNumber(value, language, decimals);
