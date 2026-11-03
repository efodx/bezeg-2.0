import {message, Message} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    CORRELATION_COORDINATE_LIMIT, CORRELATION_POINTS_MAX, CORRELATION_POINTS_MIN, CorrelationIssue,
} from "../../analysis/correlationModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function correlationFileMessage(issue: CorrelationIssue): Message {
    switch (issue.kind) {
        case "points": return message("prob_correlation_invalid_points", {value0: issue.min, value1: issue.max});
        case "coordinate": return message("prob_correlation_invalid_coordinate", {value0: issue.index + 1, value1: issue.limit});
        case "grid": return message("prob_correlation_invalid_grid", {value0: issue.index + 1});
        case "index": return message("prob_correlation_invalid_points", {value0: CORRELATION_POINTS_MIN, value1: CORRELATION_POINTS_MAX});
        case "flag": return message("prob_correlation_invalid_flag", {value0: issue.field});
        case "example": return message("prob_correlation_invalid_example", {value0: issue.allowed.join(", ")});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function correlationEditMessage(issue: CorrelationIssue): Message {
    switch (issue.kind) {
        case "points": return message("prob_correlation_points_rejected", {value0: issue.min, value1: issue.max});
        case "coordinate": return message("prob_correlation_coordinate_rejected", {value0: issue.limit});
        case "grid": return message("prob_correlation_coordinate_rejected", {value0: CORRELATION_COORDINATE_LIMIT});
        case "index": return message("prob_correlation_index_rejected", {value0: issue.count});
        case "flag": return message("prob_correlation_flag_rejected", {value0: issue.field});
        case "example": return message("prob_correlation_example_rejected", {value0: issue.allowed.join(", ")});
    }
}

/** r and the line coefficients: at most six decimals (0,852632), exactly 0 shown as 0. */
export const correlationNumber = (value: number, language: NumberLanguage, decimals = 6): string => formatNumber(value, language, decimals);
