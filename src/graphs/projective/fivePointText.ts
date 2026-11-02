import {t as translate} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {Conic} from "../../projective/conic";
import {fractionText} from "./crossRatioModel";
import {FIVE_POINT_NAMES, FivePointScene, FivePointStatusKind, DEVIATION_SAMPLES} from "./fivePointModel";
import {pointText} from "./polePolarModel";
import {MIN_CIRCLE_PIECES} from "../curves/rational/RationalBezierCurveCircleGraphN";

type Translate = typeof translate;

const MINUS = "−";
const names = (indices: readonly number[]): string => indices.map(i => FIVE_POINT_NAMES[i]).join(", ");

/** `9x² + 25y² − 225 = 0` from exact integer coefficients (coefficients 1 are not written, the first term carries the sign). */
export function conicEquation(c: Conic): string {
    const terms = ["x²", "xy", "y²", "x", "y", ""];
    let out = "";
    c.forEach((value, i) => {
        if (value === 0n) return;
        const negative = value < 0n;
        const digits = String(negative ? -value : value);
        const body = terms[i] !== "" && digits === "1" ? terms[i] : `${digits}${terms[i]}`;
        out += out === "" ? `${negative ? MINUS : ""}${body}` : ` ${negative ? MINUS : "+"} ${body}`;
    });
    return `${out === "" ? "0" : out} = 0`;
}

const TYPE_KEYS = {
    ellipse: "projective_five_point_type_ellipse", circle: "projective_five_point_type_circle", parabola: "projective_five_point_type_parabola",
    hyperbola: "projective_five_point_type_hyperbola",
} as const;

/** The deviation as `3,2·10⁻¹⁶` style text. */
export function deviationText(value: number, language: NumberLanguage): string {
    if (value === 0) return "0";
    const [mantissa, exponent] = value.toExponential(1).split("e");
    const shown = language === "sl" ? mantissa.replace(".", ",") : mantissa;
    const sup = String(Number(exponent)).replace("-", "⁻").replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
    return `${shown}·10${sup}`;
}

export interface FivePointText {
    readonly kind: FivePointStatusKind;
    /** The status sentence (with the stale note when a stale conic is drawn). */
    readonly status: string;
    readonly conic?: string;
    readonly control?: string;
    readonly weight?: string;
    readonly weightKind?: string;
    readonly farin?: string;
    readonly deviation?: string;
    /** Short weight readout for the board. */
    readonly weightBoard?: string;
}

const approx = (value: number, language: NumberLanguage): string => formatNumber(value, language, 4);
const view = (p: {x: number; y: number}, language: NumberLanguage): string => `(${approx(p.x, language)}, ${approx(p.y, language)})`;

export function describeFivePoint(scene: FivePointScene, stale: boolean, t: Translate, language: NumberLanguage): FivePointText {
    const arc = scene.arc;
    let status: string;
    switch (scene.kind) {
        case "ok": {
            const type = scene.type === "ellipse" || scene.type === "circle" || scene.type === "parabola" || scene.type === "hyperbola" ? scene.type : "ellipse";
            status = t("projective_five_point_status_ok", {value0: t(TYPE_KEYS[type])});
            break;
        }
        case "line-pair":
            status = t("projective_five_point_status_line_pair", {value0: names(scene.collinearSet)});
            break;
        case "pencil-collinear":
            status = t("projective_five_point_status_pencil_collinear", {value0: names(scene.collinearSet)});
            break;
        case "pencil-repeated":
            status = t("projective_five_point_status_pencil_repeated", {value0: names(scene.repeated ?? [])});
            break;
        case "split-needed":
            status = t("projective_five_point_status_split", {value0: String(MIN_CIRCLE_PIECES)});
            break;
        case "complementary-arc":
            status = t("projective_five_point_status_complementary");
            break;
        case "no-real-weight":
            status = t("projective_five_point_status_no_real_weight");
            break;
        case "arc-invalid":
            status = t("projective_five_point_status_arc_invalid");
            break;
        default:
            status = t("projective_five_point_status_invalid");
    }
    if (stale) status = `${status} ${t("projective_five_point_stale")}`;
    const typeName = scene.status === "unique" && scene.type && scene.type in TYPE_KEYS
        ? t(TYPE_KEYS[scene.type as keyof typeof TYPE_KEYS]) : t("projective_five_point_type_line_pair");
    const conic = scene.conic && scene.status !== "invalid" && scene.status !== "pencil"
        ? t("projective_five_point_conic", {value0: typeName, value1: conicEquation(scene.conic)}) : undefined;
    if (!arc || arc.status !== "ok") return {kind: scene.kind, status, conic};
    const [p0, p1, p2] = arc.points;
    const exact = arc.weightExact;
    const weight = exact
        ? t("projective_five_point_weight_exact", {value0: fractionText(exact), value1: fractionText(arc.weightSquared)})
        : t("projective_five_point_weight_decimal", {value0: approx(arc.weight, language), value1: fractionText(arc.weightSquared)});
    const w2 = arc.weightSquared;
    const weightKind = w2.num > w2.den
        ? t("projective_five_point_weight_hyperbola", {value0: approx(arc.denominatorZeros[0], language), value1: approx(arc.denominatorZeros[1], language)})
        : w2.num === w2.den ? t("projective_five_point_weight_parabola") : t("projective_five_point_weight_ellipse");
    return {
        kind: scene.kind, status, conic, weight, weightKind,
        control: t("projective_five_point_control", {value0: pointText(p0), value1: pointText(p1), value2: pointText(p2)}),
        farin: t("projective_five_point_farin", {value0: view(arc.farinPoints[0], language), value1: view(arc.farinPoints[1], language), value2: view(arc.shoulder, language)}),
        deviation: scene.deviation === undefined ? undefined
            : t("projective_five_point_deviation", {value0: String(DEVIATION_SAMPLES), value1: deviationText(scene.deviation, language)}),
        weightBoard: `w² = ${fractionText(arc.weightSquared)}, w ${exact ? "=" : "≈"} ${exact ? fractionText(exact) : approx(arc.weight, language)}`,
    };
}
