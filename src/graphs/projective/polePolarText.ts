import {t as translate} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {Hom} from "../../projective/homogeneous";
import {fractionText} from "./crossRatioModel";
import {isLineAtInfinity, NUMERICAL_TOLERANCE, pointText, PolePolarScene, TangencyPoint, TangentLine} from "./polePolarModel";

type Translate = typeof translate;

const MINUS = "−";
const minus = (text: string): string => text.replace("-", MINUS);

/** `3x + 35y - 75 = 0` (Unicode minus) from exact integer coefficients, the first non-zero of x and y positive. Coefficients 1 are not written. */
export function exactEquation(line: Hom): string {
    const flip = line[0] < 0n || (line[0] === 0n && line[1] < 0n);
    return joinTerms([line[0], line[1], line[2]].map(v => String(flip ? -v : v)));
}

/** The same equation from numerical coefficients, scaled so the first non-zero of x and y is 1, with decimals in `language`. */
export function numericalEquation(coefficients: readonly [number, number, number], language: NumberLanguage): string {
    const lead = Math.abs(coefficients[0]) > 1e-12 ? coefficients[0] : coefficients[1];
    return joinTerms(coefficients.map(v => formatNumber(v / lead, language, 4)));
}

const EQUATION_NAMES = ["x", "y", ""] as const;

function joinTerms(values: readonly string[]): string {
    let out = "";
    values.forEach((value, i) => {
        if (value === "0") return;
        const isNegative = value.startsWith("-") || value.startsWith(MINUS);
        const digits = isNegative ? value.slice(1) : value;
        const name = EQUATION_NAMES[i];
        const body = name !== "" && digits === "1" ? name : `${digits}${name}`;
        out += out === "" ? `${isNegative ? MINUS : ""}${body}` : ` ${isNegative ? MINUS : "+"} ${body}`;
    });
    return `${out === "" ? "0" : out} = 0`;
}

const tangentEquation = (line: TangentLine, language: NumberLanguage): string =>
    line.exact ? exactEquation(line.line) : numericalEquation(line.coefficients, language);

function tangencyText(point: TangencyPoint, language: NumberLanguage): string {
    if (!point.exact) {
        const a = point.approx;
        return a.kind === "finite"
            ? `(${formatNumber(a.x, language, 4)}, ${formatNumber(a.y, language, 4)})`
            : `(${formatNumber(a.dx, language, 4)}, ${formatNumber(a.dy, language, 4)})`;
    }
    return point.view.kind === "finite" ? `(${fractionText(point.view.x)}, ${fractionText(point.view.y)})` : pointText(point.point);
}

export type PolePolarRegion = "outside" | "on" | "inside" | "degenerate";

/** The scene as readable text: the values the board draws, for the inspector, the board text and assistive technology. */
export interface PolePolarText {
    readonly region: PolePolarRegion;
    /** The region sentence, exact; includes the note for a point at infinity. */
    readonly status: string;
    readonly polar?: string;
    readonly tangents: readonly string[];
    readonly tangency: readonly string[];
    /** Present only when the tangency points are decimals. */
    readonly numerical?: string;
    readonly centre: string;
    readonly ideal: boolean;
}

export const TANGENT_NAMES = ["t₁", "t₂"] as const;
export const TANGENCY_NAMES = ["T₁", "T₂"] as const;

export function describePolePolar(scene: PolePolarScene, t: Translate, language: NumberLanguage): PolePolarText {
    const where = pointText(scene.p);
    const region: PolePolarRegion = scene.side;
    const base = region === "outside" ? t("projective_k3_status_outside", {value0: where}) : region === "on" ? t("projective_k3_status_on", {value0: where})
        : region === "inside" ? t("projective_k3_status_inside", {value0: where}) : t("projective_k3_status_degenerate");
    const flat = region === "on" && scene.polar !== undefined && isLineAtInfinity(scene.polar);
    const withIdeal = scene.ideal ? `${t("projective_k3_status_ideal", {value0: where})} ${base}` : base;
    const status = flat ? `${withIdeal} ${t("projective_k3_tangent_infinity")}` : withIdeal;
    const centre = scene.centre === undefined ? t("projective_k3_centre_none")
        : scene.centre.kind === "finite"
            ? t("projective_k3_centre", {value0: `(${fractionText(scene.centre.x)}, ${fractionText(scene.centre.y)})`})
            : t("projective_k3_centre_ideal", {value0: minus(String(scene.centre.direction[0])), value1: minus(String(scene.centre.direction[1]))});
    return {
        region, status, centre, ideal: scene.ideal,
        polar: scene.polar && (isLineAtInfinity(scene.polar) ? t("projective_k3_polar_infinity") : t("projective_k3_polar", {value0: exactEquation(scene.polar)})),
        tangents: scene.side === "outside" ? scene.tangents.filter(line => !(line.exact && isLineAtInfinity(line.line))).map((line, i) => t("projective_k3_tangent", {value0: TANGENT_NAMES[i], value1: tangentEquation(line, language)})) : [],
        tangency: scene.tangency.map((point, i) => t("projective_k3_tangency", {value0: TANGENCY_NAMES[i], value1: tangencyText(point, language)})),
        numerical: scene.numerical ? t("projective_k3_numerical", {value0: String(NUMERICAL_TOLERANCE).replace("1e-9", "10⁻⁹")}) : undefined,
    };
}
