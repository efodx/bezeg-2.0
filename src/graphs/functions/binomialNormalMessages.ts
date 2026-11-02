import {message, Message} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {BinomialNormalIssue} from "../../analysis/binomialNormalModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function binomialNormalFileMessage(issue: BinomialNormalIssue): Message {
    switch (issue.kind) {
        case "n": return message("prob_binomial_invalid_n", {value0: issue.max});
        case "p": return message(issue.degenerate ? "prob_binomial_invalid_p_degenerate" : "prob_binomial_invalid_p");
        case "k": return message("prob_binomial_invalid_k", {value0: issue.max});
        case "flag": return message("prob_binomial_invalid_flag", {value0: issue.field});
        case "example": return message("prob_binomial_invalid_example", {value0: issue.allowed.join(", ")});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function binomialNormalEditMessage(issue: BinomialNormalIssue): Message {
    switch (issue.kind) {
        case "n": return message("prob_binomial_n_rejected", {value0: issue.max});
        case "p": return message(issue.degenerate ? "prob_binomial_p_degenerate" : "prob_binomial_p_rejected");
        case "k": return message("prob_binomial_k_rejected", {value0: issue.max});
        case "flag": return message("prob_binomial_flag_rejected", {value0: issue.field});
        case "example": return message("prob_binomial_example_rejected", {value0: issue.allowed.join(", ")});
    }
}

/** A probability or an absolute error with five decimals, trailing zeros dropped (0,25172). */
export const binomialProbability = (value: number, language: NumberLanguage): string => formatNumber(value, language, 5);

/** n, k, a mean or a standard deviation, at most two decimals. */
export const binomialNumber = (value: number, language: NumberLanguage): string => formatNumber(value, language, 2);

/** The parameter p, at most four decimals (0,02; 0,125). */
export const binomialP = (value: number, language: NumberLanguage): string => formatNumber(value, language, 4);
