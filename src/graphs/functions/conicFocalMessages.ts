import {message, Message, messageNumber} from "../../localization";
import {ConicFileIssue, ConicIssue} from "../../analysis/conicFocalModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a conic rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges it names, comes from `analysis/conicFocalModel`; this only chooses the localized text.
 */
export function conicFocalFileMessage(issue: ConicFileIssue): Message {
    switch (issue.kind) {
        case "object": return message("invalid_conic_object");
        case "focusX": return message("invalid_conic_focus_x", {value0: bound(issue.min), value1: bound(issue.max)});
        case "ell": return message("invalid_conic_ell", {value0: bound(issue.min), value1: bound(issue.max)});
        case "epsilon": return message("invalid_conic_epsilon", {value0: bound(issue.min), value1: bound(issue.max)});
        case "phi": return message("invalid_conic_phi", {value0: bound(issue.min), value1: bound(issue.max)});
        case "weight": return message("invalid_conic_weight", {value0: bound(issue.min), value1: bound(issue.max)});
        case "direction": return message("invalid_conic_direction");
        case "bridge": return message("invalid_conic_bridge");
        case "example": return message("conic_example_rejected", {value0: issue.allowed.join(", ")});
    }
}

/** The words for a rule that an edit (number field, slider or lesson action) would break; bounds are formatted as the fields show them. */
export function conicFocalEditMessage(issue: ConicIssue): Message {
    const range = (min: number, max: number) => ({value0: messageNumber(min), value1: messageNumber(max)});
    switch (issue.kind) {
        case "epsilon": return message("conic_epsilon_rejected_hint", range(issue.min, issue.max));
        case "ell": return message("conic_ell_rejected_hint", range(issue.min, issue.max));
        case "phi": return message("conic_phi_rejected_hint", range(issue.min, issue.max));
        case "weight": return message("conic_weight_rejected_hint", range(issue.min, issue.max));
        case "focusX": return message("invalid_conic_focus_x", range(issue.min, issue.max));
        case "direction": return message("invalid_conic_direction");
        case "bridge": return message("invalid_conic_bridge");
        case "example": return message("conic_example_rejected", {value0: issue.allowed.join(", ")});
    }
}
