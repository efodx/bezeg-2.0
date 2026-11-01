import {currentLanguage, message, Message} from "../../localization";
import {UniformEditIssue, UniformIssue} from "../../analysis/uniformConvergenceModel";
import {formatNumber} from "../../analysis/format";

/** A bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a uniform convergence rule that a stored Preset or file broke ("correct the value in the file"). The rule itself,
 * with the range and the examples it names, comes from `analysis/uniformConvergenceModel`; this only chooses the localized text.
 */
export function uniformConvergenceFileMessage(issue: UniformIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_uniform_example", {value0: issue.allowed.join(", ")});
        case "r": return message("invalid_uniform_r", {value0: bound(issue.min), value1: bound(issue.max)});
        case "n": return message("invalid_uniform_n", {value0: issue.min, value1: issue.max});
        case "x": return message("invalid_uniform_x", {value0: bound(issue.r)});
        case "epsilon": return message("invalid_uniform_epsilon", {value0: bound(issue.min), value1: bound(issue.max)});
        case "visibility": return message("invalid_uniform_visibility");
    }
}

/**
 * The words for a uniform convergence rule that an edit (number field, lesson action, drag) would break. Used by the graph's
 * setters, so the `DomainError` a learner can see is localized. Numbers follow the current language like the fields' own hints.
 */
export function uniformConvergenceEditMessage(issue: UniformEditIssue): Message {
    const language = currentLanguage();
    switch (issue.kind) {
        case "example": return message("uniform_example_rejected", {value0: issue.allowed.join(", ")});
        // A change of r is refused for a bad value and for leaving x outside [0, r]; the field's hint names both rules.
        case "r": return message("uniform_r_rejected_hint", {
            value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language), value2: formatNumber(issue.x ?? 0, language),
        });
        case "x-outside-domain": return message("uniform_r_rejected_hint", {
            value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language), value2: formatNumber(issue.x, language),
        });
        case "n": return message("uniform_n_rejected_hint", {value0: issue.min, value1: issue.max});
        case "x": return message("uniform_x_rejected_hint", {value0: formatNumber(issue.r, language)});
        case "epsilon": return message("uniform_epsilon_rejected_hint", {value0: formatNumber(issue.min, language, 2), value1: formatNumber(issue.max, language, 2)});
    }
}
