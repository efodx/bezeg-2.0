import {message, messageNumber, t as translate, type Message} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {Conic} from "../../projective/conic";
import {ThreeViewsScene} from "./threeViewsModel";

type Translate = typeof translate;

const MINUS = "−";

const TYPE_KEYS = {
    ellipse: "projective_five_point_type_ellipse", parabola: "projective_five_point_type_parabola", hyperbola: "projective_five_point_type_hyperbola",
} as const;

/** `X² + 3Y² + 4Y + 1 = 0` from exact integer coefficients (coefficients 1 are not written, the first term carries the sign). */
export function imageEquation(c: Conic): string {
    const terms = ["X²", "XY", "Y²", "X", "Y", ""];
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

const number = (value: number, language: NumberLanguage): string => formatNumber(value, language, 4);
const pair = (x: number, y: number, language: NumberLanguage): string => `(${number(x, language)}, ${number(y, language)})`;
const signed = (value: bigint): string => value < 0n ? `${MINUS}${-value}` : String(value);

export interface ThreeViewsText {
    readonly typeName: string;
    /** The status sentence: L misses / touches / cuts the circle and what that makes the image. */
    readonly status: string;
    readonly equation: string;
    readonly discriminant: string;
    readonly determinant: string;
    readonly infinity: string;
    readonly point?: string;
    /** c as shown, for the slider value and the board. */
    readonly cText: string;
    /** The board title of the image panel. */
    readonly imageTitle: string;
    readonly sourceTitle: string;
    /** The note that part of the image lies outside the image panel; undefined when everything is visible. */
    readonly clipped?: string;
    /** The same note as separate sentences (conic, then point), for the two lines on the board. */
    readonly clippedLines: readonly string[];
}

export function describeThreeViews(scene: ThreeViewsScene, t: Translate, language: NumberLanguage): ThreeViewsText {
    const cText = formatNumber(scene.cValue, language, 1);
    const typeName = t(TYPE_KEYS[scene.type]);
    const statusKey = scene.contact === "misses" ? "projective_three_views_status_misses"
        : scene.contact === "touches" ? "projective_three_views_status_touches" : "projective_three_views_status_cuts";
    const [first, second] = scene.ideal;
    const infinity = first === undefined ? t("projective_three_views_infinity_none")
        : second === undefined
            ? t("projective_three_views_infinity_touch", {
                value0: pair(first.x, scene.cValue, language), value1: pair(first.direction.x, first.direction.y, language),
            })
            : t("projective_three_views_infinity_two", {
                value0: pair(first.x, scene.cValue, language), value1: pair(second.x, scene.cValue, language),
                value2: pair(first.direction.x, first.direction.y, language), value3: pair(second.direction.x, second.direction.y, language),
            });
    let point: string | undefined;
    if (scene.point) {
        const where = pair(scene.point.x, scene.point.y, language);
        point = scene.point.image.kind === "finite"
            ? t("projective_three_views_point_finite", {value0: where, value1: pair(scene.point.image.X, scene.point.image.Y, language)})
            : t("projective_three_views_point_infinity", {value0: where, value1: pair(scene.point.image.direction.x, scene.point.image.direction.y, language)});
    }
    const clippedLines = [
        scene.clipped.conic ? t("projective_three_views_clipped_conic") : "",
        scene.clipped.point ? t("projective_three_views_clipped_point") : "",
    ].filter(Boolean);
    return {
        typeName, cText,
        status: t(statusKey, {value0: cText, value1: typeName}),
        equation: t("projective_three_views_equation", {value0: imageEquation(scene.conic)}),
        discriminant: t("projective_three_views_discriminant", {value0: signed(scene.discriminant)}),
        determinant: t("projective_three_views_determinant", {value0: signed(BigInt(scene.determinantNormalised))}),
        infinity, point,
        imageTitle: t("projective_three_views_title_image", {value0: typeName}),
        sourceTitle: t("projective_three_views_title_source"),
        clipped: clippedLines.length ? clippedLines.join(" ") : undefined, clippedLines,
    };
}

/** The sentences of {@link describeThreeViews} as catalog messages (same words), so a declaration holds data and the language renders it. */
export interface ThreeViewsMessages {
    readonly c: Message;
    readonly status: Message;
    readonly equation: Message;
    readonly discriminant: Message;
    readonly determinant: Message;
    readonly infinity: Message;
    readonly point?: Message;
    readonly clipped?: Message;
}

const pairMessage = (x: number, y: number): Message => message("projective_five_point_pair", {value0: messageNumber(x, 4), value1: messageNumber(y, 4)});

export function threeViewsMessages(scene: ThreeViewsScene): ThreeViewsMessages {
    const cValue = messageNumber(scene.cValue, 1);
    const typeName = message(TYPE_KEYS[scene.type]);
    const statusKey = scene.contact === "misses" ? "projective_three_views_status_misses"
        : scene.contact === "touches" ? "projective_three_views_status_touches" : "projective_three_views_status_cuts";
    const [first, second] = scene.ideal;
    const infinity = first === undefined ? message("projective_three_views_infinity_none")
        : second === undefined
            ? message("projective_three_views_infinity_touch", {value0: pairMessage(first.x, scene.cValue), value1: pairMessage(first.direction.x, first.direction.y)})
            : message("projective_three_views_infinity_two", {
                value0: pairMessage(first.x, scene.cValue), value1: pairMessage(second.x, scene.cValue),
                value2: pairMessage(first.direction.x, first.direction.y), value3: pairMessage(second.direction.x, second.direction.y),
            });
    let point: Message | undefined;
    if (scene.point) {
        const where = pairMessage(scene.point.x, scene.point.y);
        point = scene.point.image.kind === "finite"
            ? message("projective_three_views_point_finite", {value0: where, value1: pairMessage(scene.point.image.X, scene.point.image.Y)})
            : message("projective_three_views_point_infinity", {value0: where, value1: pairMessage(scene.point.image.direction.x, scene.point.image.direction.y)});
    }
    const clipped = scene.clipped.conic && scene.clipped.point
        ? message("projective_three_views_clipped_both", {value0: message("projective_three_views_clipped_conic"), value1: message("projective_three_views_clipped_point")})
        : scene.clipped.conic ? message("projective_three_views_clipped_conic")
            : scene.clipped.point ? message("projective_three_views_clipped_point") : undefined;
    return {
        c: message("projective_three_views_slider_value", {value0: cValue}),
        status: message(statusKey, {value0: cValue, value1: typeName}),
        equation: message("projective_three_views_equation", {value0: imageEquation(scene.conic)}),
        discriminant: message("projective_three_views_discriminant", {value0: signed(scene.discriminant)}),
        determinant: message("projective_three_views_determinant", {value0: signed(BigInt(scene.determinantNormalised))}),
        infinity, point, clipped,
    };
}
