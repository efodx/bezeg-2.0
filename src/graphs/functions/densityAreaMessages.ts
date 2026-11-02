import {message, Message, t} from "../../localization";
import {formatNumber, formatSignificant, NumberLanguage} from "../../analysis/format";
import {DensityAreaIssue, DensityIntervalKind, DENSITY_THIN_FRACTION} from "../../analysis/densityAreaModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function densityAreaFileMessage(issue: DensityAreaIssue): Message {
    switch (issue.kind) {
        case "mu": return message("prob_density_invalid_mu", {value0: issue.limit});
        // The sigma range (0,1 and 20) is written in the text: a number parameter would show 0.1 with a point in Slovenian. Pinned by tests.
        case "sigma": return message("prob_density_invalid_sigma");
        case "bound": return message("prob_density_invalid_bound", {value0: issue.field, value1: issue.limit});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function densityAreaEditMessage(issue: DensityAreaIssue): Message {
    switch (issue.kind) {
        case "mu": return message("prob_density_mu_rejected", {value0: issue.limit});
        case "sigma": return message("prob_density_sigma_rejected");
        case "bound": return message("prob_density_bound_rejected", {value0: issue.limit});
    }
}

/** A probability as a share of the total area in percent, four significant digits: 68,27; 0,0000009866 stays readable as 9,866·10⁻⁸. */
export const densityPercent = (probability: number, language: NumberLanguage): string => formatSignificant(probability * 100, language, 4);

/** A probability as a fraction of the total area, five significant digits (0,68269). */
export const densityFraction = (probability: number, language: NumberLanguage): string => formatSignificant(probability, language, 5);

/** A parameter or a bound, at most two decimals. */
export const densityNumber = (value: number, language: NumberLanguage): string => formatNumber(value, language, 2);

/** A standardized bound, at most three decimals (z = 2,333). */
export const densityZ = (value: number, language: NumberLanguage): string => formatNumber(value, language, 3);

/** The status sentence of an interval that is empty, a single value or very thin; "" for an ordinary interval. */
export function densityStatus(kind: DensityIntervalKind, language: NumberLanguage): string {
    switch (kind) {
        case "reversed": return t("prob_density_status_reversed");
        case "point": return t("prob_density_status_point");
        case "thin": return t("prob_density_status_thin", {value0: formatNumber(DENSITY_THIN_FRACTION * 100, language, 0)});
        case "interval": return "";
    }
}
