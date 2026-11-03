import {message, Message} from "../../localization";
import {FourierCoefficientsIssue} from "../../analysis/fourierCoefficientsModel";

/**
 * The words for a Fourier coefficients rule that a value, an edit or a stored file broke. The rule itself, with the range and the
 * choices it names, comes from `analysis/fourierCoefficientsModel`; this only chooses the localized text. The ranges are whole
 * numbers, so one text serves the setters and the Preset check.
 */
export function fourierCoefficientsIssueMessage(issue: FourierCoefficientsIssue): Message {
    switch (issue.kind) {
        case "view": return message("fourier_coef_issue_view", {value0: issue.allowed.join(", ")});
        case "layout": return message("fourier_coef_issue_layout", {value0: issue.allowed.join(", ")});
        case "values-count": return message("fourier_coef_issue_values_count", {value0: issue.expected});
        case "value": return message("fourier_coef_issue_value", {value0: issue.min, value1: issue.max});
        case "handle": return message("fourier_coef_issue_handle", {value0: issue.count - 1});
        case "k": return message("fourier_coef_issue_k", {value0: issue.min, value1: issue.max});
        case "term": return message("fourier_coef_issue_term", {value0: issue.allowed.join(", ")});
        case "harmonic": return message("fourier_coef_issue_harmonic", {value0: issue.min, value1: issue.max});
        case "no-b0": return message("fourier_coef_issue_no_b0");
        case "k-below-selected": return message("fourier_coef_issue_k_below", {value0: issue.selected});
        case "overlay": return message("fourier_coef_issue_overlay");
        case "selections": return message("fourier_coef_issue_selections", {value0: issue.count, value1: issue.allowed.join(", ")});
        case "selections-distinct": return message("fourier_coef_issue_selections_distinct");
        case "n": return message("fourier_coef_issue_n", {value0: issue.min, value1: issue.max});
        case "scale": return message("fourier_coef_issue_scale", {value0: issue.allowed.join(", ")});
    }
}

/** A Preset or file that broke a rule: the rule, then what to do ("correct the value in the file"). */
export function fourierCoefficientsFileMessage(issue: FourierCoefficientsIssue): Message {
    return message("invalid_fourier_coefficients_data", {value0: fourierCoefficientsIssueMessage(issue)});
}
