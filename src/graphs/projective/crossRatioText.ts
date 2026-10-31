import {t as translate} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {Fraction, fractionToNumber} from "../../projective/homogeneous";
import {CrossRatioScene, fractionText, POINT_NAMES} from "./crossRatioModel";

type Translate = typeof translate;

/** The scene as readable text: the same values the board draws, for the inspector, the board text and assistive technology. */
export interface CrossRatioText {
    readonly statusKind: "ok" | "ideal" | "undefined";
    readonly status: string;
    /** Absent when the cross-ratio is undefined. */
    readonly originalRatio?: string;
    readonly imageRatio?: string;
    readonly originals: string;
    readonly images?: string;
    /** Present only when an image is at infinity: the limit formula that the readout switched to. */
    readonly limit?: string;
}

const ratioPair = (value: Fraction, language: NumberLanguage): [string, string] =>
    [fractionText(value), formatNumber(fractionToNumber(value), language, 4)];

const LIMIT_KEYS = ["projective_k1_limit_a", "projective_k1_limit_b", "projective_k1_limit_c", "projective_k1_limit_d"] as const;

export function describeCrossRatio(scene: CrossRatioScene, t: Translate, language: NumberLanguage): CrossRatioText {
    const originals = scene.originals.map((p, i) => `${POINT_NAMES[i]} = ${p[0] / p[2]}`).join(", ");
    if (scene.status === "centre-on-line") return {statusKind: "undefined", status: t("projective_k1_status_centre_on_line"), originals};
    if (scene.status === "degenerate-second-line") return {statusKind: "undefined", status: t("projective_k1_status_line2"), originals};
    if (scene.status === "coincident-points") return {statusKind: "undefined", status: t("projective_k1_status_coincident"), originals};
    const images = (scene.imageViews ?? []).map((view, i) => {
        const name = `${POINT_NAMES[i]}\u2032`;
        return view.kind === "finite"
            ? `${name} = (${fractionText(view.x)}, ${fractionText(view.y)})`
            : t("projective_k1_image_ideal", {value0: name, value1: String(view.direction[0]).replace("-", "\u2212"), value2: String(view.direction[1]).replace("-", "\u2212")});
    }).join("; ");
    const original = scene.originalRatio?.status === "ok" ? ratioPair(scene.originalRatio.value, language) : undefined;
    const image = scene.imageRatio?.status === "ok" ? ratioPair(scene.imageRatio.value, language) : undefined;
    const ideal = scene.idealIndex !== undefined;
    return {
        statusKind: ideal ? "ideal" : "ok",
        status: ideal ? t("projective_k1_status_ideal", {value0: `${POINT_NAMES[scene.idealIndex ?? 0]}\u2032`}) : t("projective_k1_status_ok"),
        originalRatio: original && t("projective_k1_ratio_originals", {value0: original[0], value1: original[1]}),
        imageRatio: image && t("projective_k1_ratio_images", {value0: image[0], value1: image[1]}),
        originals,
        images,
        limit: ideal && image ? t(LIMIT_KEYS[scene.idealIndex ?? 0], {value0: image[0]}) : undefined,
    };
}
