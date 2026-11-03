import {currentLanguage, message, Message} from "../../localization";
import {EulerIssue} from "../../analysis/eulerModel";
import {formatNumber} from "../../analysis/format";

/** A range bound or step as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en", 4);

/**
 * The words for an Euler model that a stored Preset or file broke ("correct the value in the file"). The rule itself, with the
 * ranges and the allowed values it names, comes from `analysis/eulerModel`; this only chooses the localized text.
 */
export function eulerFileMessage(issue: EulerIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_euler_ode_example", {value0: issue.allowed.join(", ")});
        case "x-range": return message("invalid_euler_ode_x_range", {value0: issue.coordinates.join(", "), value1: bound(issue.min), value2: bound(issue.max)});
        case "y-range": return message("invalid_euler_ode_y_range", {value0: bound(issue.min), value1: bound(issue.max)});
        case "order": return message("invalid_euler_ode_order");
        case "step": return message("invalid_euler_ode_step", {value0: issue.allowed.map(bound).join(", ")});
        case "toggle": return message("invalid_euler_ode_toggle", {value0: issue.field});
        case "reveal": return message("invalid_euler_ode_reveal", {value0: bound(issue.min), value1: bound(issue.max)});
    }
}

/**
 * The words for an edit (number field, drag or slider) that would break the model. Used by the graph's setters, so the
 * `DomainError` a learner can see is localized.
 */
export function eulerEditMessage(issue: EulerIssue): Message {
    switch (issue.kind) {
        case "example": return message("euler_ode_example_rejected", {value0: issue.allowed.join(", ")});
        case "x-range": return message("euler_ode_x_range_rejected", {value0: formatNumber(issue.min, currentLanguage(), 4), value1: formatNumber(issue.max, currentLanguage(), 4)});
        case "y-range": return message("euler_ode_y_range_rejected", {value0: formatNumber(issue.min, currentLanguage(), 4), value1: formatNumber(issue.max, currentLanguage(), 4)});
        case "order": return message(issue.moving === "xEnd" ? "euler_ode_end_order_rejected" : "euler_ode_x0_order_rejected");
        case "step": return message("euler_ode_step_rejected", {value0: issue.allowed.map(step => formatNumber(step, currentLanguage(), 4)).join(", ")});
        // Only stored data can carry these two: the toggle and step-reveal setters take typed values and return no issue.
        case "toggle": return message("invalid_euler_ode_toggle", {value0: issue.field});
        case "reveal": return message("invalid_euler_ode_reveal", {value0: bound(issue.min), value1: bound(issue.max)});
    }
}
