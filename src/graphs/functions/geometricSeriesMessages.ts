import {message, Message, messageNumber} from "../../localization";
import {SeriesFileIssue, SeriesIssue} from "../../analysis/geometricSeriesModel";
import {formatNumber} from "../../analysis/format";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a geometric-series rule that a stored Preset or file broke ("correct the value in the file"). The rule itself,
 * with the ranges it names, comes from `analysis/geometricSeriesModel`; this only chooses the localized text.
 */
export function geometricSeriesFileMessage(issue: SeriesFileIssue): Message {
    switch (issue.kind) {
        case "object": return message("invalid_series_object");
        case "a": return message("invalid_series_a", {value0: bound(issue.min), value1: bound(issue.max)});
        case "q": return message("invalid_series_q", {value0: bound(issue.min), value1: bound(issue.max)});
        case "tolerance": return message("invalid_series_tolerance", {value0: bound(issue.min), value1: bound(issue.max)});
        case "terms": return message("invalid_series_terms", {value0: issue.min, value1: issue.max});
        case "example": return message("series_example_rejected", {value0: issue.allowed.join(", ")});
    }
}

/** The words for a rule that an edit (number field, slider or lesson action) would break; bounds are formatted as the fields show them. */
export function geometricSeriesEditMessage(issue: SeriesIssue): Message {
    switch (issue.kind) {
        case "a": return message("series_a_rejected_hint", {value0: messageNumber(issue.min), value1: messageNumber(issue.max)});
        case "q": return message("series_q_rejected_hint", {value0: messageNumber(issue.min), value1: messageNumber(issue.max)});
        case "tolerance": return message("series_tolerance_rejected_hint", {value0: messageNumber(issue.min), value1: messageNumber(issue.max)});
        case "terms": return message("series_terms_rejected_hint", {value0: issue.min, value1: issue.max});
        case "example": return message("series_example_rejected", {value0: issue.allowed.join(", ")});
    }
}
