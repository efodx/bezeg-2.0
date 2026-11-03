import {message, Message} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {CltIssue} from "../../analysis/cltModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function cltFileMessage(issue: CltIssue): Message {
    switch (issue.kind) {
        case "heights": return message("prob_clt_invalid_heights", {value0: issue.count});
        case "height": return message("prob_clt_invalid_height", {value0: issue.max});
        case "index": return message("prob_clt_invalid_heights", {value0: issue.count});
        case "zero": return message("prob_clt_invalid_zero");
        case "n": return message("prob_clt_invalid_n", {value0: issue.max});
        case "flag": return message("prob_clt_invalid_flag", {value0: issue.field});
        case "example": return message("prob_clt_invalid_example", {value0: issue.allowed.join(", ")});
        case "status": return message("prob_clt_status_failed", {value0: issue.status});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function cltEditMessage(issue: CltIssue): Message {
    switch (issue.kind) {
        case "heights": return message("prob_clt_heights_rejected", {value0: issue.count});
        case "height": return message("prob_clt_height_rejected", {value0: issue.max});
        case "index": return message("prob_clt_heights_rejected", {value0: issue.count});
        case "zero": return message("prob_clt_zero_rejected");
        case "n": return message("prob_clt_n_rejected", {value0: issue.max});
        case "flag": return message("prob_clt_flag_rejected", {value0: issue.field});
        case "example": return message("prob_clt_example_rejected", {value0: issue.allowed.join(", ")});
        case "status": return message("prob_clt_status_failed", {value0: issue.status});
    }
}

/** A mean, variance or sum moment, at most four decimals. */
export const cltNumber = (value: number, language: NumberLanguage): string => formatNumber(value, language, 4);

/** The Kolmogorov distance, five decimals (0,05721). */
export const cltDistance = (value: number, language: NumberLanguage): string => formatNumber(value, language, 5);
