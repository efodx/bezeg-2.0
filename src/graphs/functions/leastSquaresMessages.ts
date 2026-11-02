import {currentLanguage, message, Message, t} from "../../localization";
import {formatLineEquation, formatNumber, formatSignificant, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {LeastSquaresIssue, LeastSquaresUnfittable, NormalEquations} from "../../analysis/leastSquaresModel";

/** The words for a rule that a stored Preset or file broke ("correct the value in the file"). */
export function leastSquaresFileMessage(issue: LeastSquaresIssue): Message {
    switch (issue.kind) {
        case "points": return message("interp_lsq_invalid_points", {value0: issue.min, value1: issue.max});
        case "coordinate": return message("interp_lsq_invalid_coordinate", {value0: issue.index + 1, value1: issue.limit});
        case "degree": return message("interp_lsq_invalid_degree", {value0: issue.min, value1: issue.max});
        case "line": return message("interp_lsq_invalid_line", {value0: issue.field, value1: issue.limit});
        case "flag": return message("interp_lsq_invalid_flag", {value0: issue.field});
    }
}

/** The words for a rule that an edit would break (a `DomainError` reason). */
export function leastSquaresEditMessage(issue: LeastSquaresIssue): Message {
    switch (issue.kind) {
        case "points": return message("interp_lsq_points_rejected", {value0: issue.min, value1: issue.max});
        case "coordinate": return message("interp_lsq_coordinate_rejected", {value0: issue.limit});
        case "degree": return message("interp_lsq_degree_rejected", {value0: issue.min, value1: issue.max});
        case "line": return message("interp_lsq_line_rejected", {value0: issue.limit});
        // The switches can only write booleans, so only a file produces this; its message names the field.
        case "flag": return leastSquaresFileMessage(issue);
    }
}

/** Why there is no curve, as a clause that follows "No curve:". */
export function leastSquaresReason(reason: LeastSquaresUnfittable): string {
    switch (reason) {
        case "too-few": return t("interp_lsq_reason_too_few");
        case "vertical": return t("interp_lsq_reason_vertical");
        case "underdetermined": return t("interp_lsq_reason_underdetermined");
        case "rank": return t("interp_lsq_reason_rank");
    }
}

/** A rounding within this relative or absolute distance is float noise, not a rounding: 0,7000000000000001 is exactly 0,7. */
const ROUNDING_NOISE = 1e-9;

/** Whether showing `value` as `rounded` loses something: a non-zero value that shows as 0 is always approximate. */
const isRounded = (value: number, rounded: number): boolean =>
    Number.isFinite(value) && (rounded === 0 ? value !== 0 : Math.abs(value - rounded) > ROUNDING_NOISE * Math.abs(value));

/** A number with significant digits in the current language, "≈ " before it when the digits are rounded. */
export const leastSquaresNumber = (value: number, digits = 4) => {
    const text = formatSignificant(value, currentLanguage(), digits);
    return isRounded(value, Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(digits))) ? `≈ ${text}` : text;
};
/** A coefficient or residual, rounded to three decimals in the current language, "≈ " before it when the rounding is not exact. */
export const leastSquaresCoefficient = (value: number) => {
    const text = formatNumber(value, currentLanguage(), 3);
    return isRounded(value, Number(value.toFixed(3))) ? `≈ ${text}` : text;
};

const SUPERSCRIPTS = ["", "", "²", "³", "⁴", "⁵"];

/**
 * The fitted polynomial as text: a line as "y = 0,9x + 0,9" (the form of the linear-function lesson), a higher degree with
 * ascending powers as "y = 1,15 + 0,15x + 0,25x²"; terms whose rounded coefficient is 0 are left out.
 */
export function polynomialText(coefficients: readonly number[], language: NumberLanguage): string {
    if (coefficients.length === 2) return formatLineEquation({slope: coefficients[1], intercept: coefficients[0]}, language, 3);
    let text = "";
    coefficients.forEach((c, k) => {
        const digits = formatNumber(c, language, 3);
        if (digits === "0" && !(k === 0 && coefficients.slice(1).every(d => formatNumber(d, language, 3) === "0"))) return;
        const negative = digits.startsWith(MINUS_SIGN);
        const magnitude = negative ? digits.slice(1) : digits;
        const power = k === 0 ? "" : k === 1 ? "x" : `x${SUPERSCRIPTS[k]}`;
        const term = k > 0 && magnitude === "1" ? power : `${magnitude}${power}`;
        text += text === "" ? (negative ? `${MINUS_SIGN}${term}` : term) : ` ${negative ? MINUS_SIGN : "+"} ${term}`;
    });
    return `y = ${text}`;
}

/** A number inside LaTeX: three decimals at most, `\approx ` before it when rounded, `{,}` as the decimal comma of Slovenian, ASCII minus. */
const latexNumber = (value: number, language: NumberLanguage): string =>
    `${isRounded(value, Number(value.toFixed(3))) ? "\\approx " : ""}${formatNumber(value, language, 3).replace(MINUS_SIGN, "-").replace(",", "{,}")}`;

/**
 * The display of A^T A c = A^T y with the fit's numbers, as MathJax display math (`\[...\]`): the symbolic equation, the system
 * with its numbers, and the solution c of the QR fit (the displayed system is not what computes c).
 */
export function normalEquationsLatex(equations: NormalEquations, language: NumberLanguage): string {
    const size = equations.matrix.length;
    const number = (value: number) => latexNumber(value, language);
    const matrix = (rows: readonly (readonly number[])[]) => `\\begin{pmatrix}${rows.map(row => row.map(number).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
    const column = (values: readonly number[]) => matrix(values.map(v => [v]));
    const names = Array.from({length: size}, (_, k) => `c_{${k}}`);
    return [
        "\\[A^{T}A\\,c=A^{T}y\\]",
        `\\[${matrix(equations.matrix)}\\begin{pmatrix}${names.join(" \\\\ ")}\\end{pmatrix}=${column(equations.rhs)}\\]`,
        `\\[c=${column(equations.coefficients)}\\]`,
    ].join("");
}
