import {currentLanguage, message, Message} from "../../localization";
import {FourierSeriesIssue, FourierTerm, FourierTermList} from "../../analysis/fourierSeriesModel";
import {formatNumber} from "../../analysis/format";

/** A bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/**
 * The words for a Fourier series rule that a stored Preset or file broke ("correct the value in the file"). The rule itself, with
 * the range and the examples it names, comes from `analysis/fourierSeriesModel`; this only chooses the localized text.
 */
export function fourierSeriesFileMessage(issue: FourierSeriesIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_fourier_series_example", {value0: issue.allowed.join(", ")});
        case "n": return message("invalid_fourier_series_n", {value0: issue.min, value1: issue.max});
        case "x": return message("invalid_fourier_series_x", {value0: bound(issue.min), value1: bound(issue.max)});
        case "epsilon": return message("invalid_fourier_series_epsilon", {value0: bound(issue.min), value1: bound(issue.max)});
    }
}

/**
 * The words for a rule that an edit (number field, buttons, drag) would break. Used by the graph's setters, so the `DomainError` a
 * learner can see is localized. Numbers follow the current language like the fields' own hints.
 */
export function fourierSeriesEditMessage(issue: FourierSeriesIssue): Message {
    const language = currentLanguage();
    switch (issue.kind) {
        case "example": return message("fourier_example_rejected", {value0: issue.allowed.join(", ")});
        case "n": return message("fourier_n_rejected_hint", {value0: issue.min, value1: issue.max});
        case "x": return message("fourier_x_rejected_hint", {value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language)});
        case "epsilon": return message("fourier_epsilon_rejected_hint", {value0: formatNumber(issue.min, language), value1: formatNumber(issue.max, language)});
    }
}

const termText = (term: FourierTerm) => (term.k === 1 ? "sin x" : `sin ${term.k}x/${term.k}`);

/**
 * The partial sum as language-neutral text, for example `Sₙ(x) = 4/π · (sin x + sin 3x/3 + sin 5x/5 + … + sin 11x/11)`; the
 * signs are those of the coefficients, a "−" replacing "+" for a negative one. Only the label of the row is localized.
 */
export function fourierTermsText(list: FourierTermList): string {
    const shown = list.last ? [...list.leading, null, list.last] : list.leading;
    let body = "";
    shown.forEach((term, index) => {
        const sign = term === null ? "+" : term.sign < 0 ? "−" : "+";
        const text = term === null ? "…" : termText(term);
        if (index === 0) body = term !== null && term.sign < 0 ? `−${text}` : text;
        else body += ` ${sign} ${text}`;
    });
    const prefactor = list.prefactor === "four-over-pi" ? "4/π" : "2";
    return `Sₙ(x) = ${prefactor} · (${body})`;
}
