import {t} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {ExactImage} from "../../compgeo/inversionModel";
import {Rational, RationalPoint} from "../../compgeo/rational";
import {exactText} from "./notablePointsText";
import {InversionPlaceId, InversionView} from "./inversionView";

/**
 * The words of the inversion graph, a pure function of the derived figure shared by the inspector and the board chip.
 * No React, JSXGraph or board state; `translate` is `t` (or the `useT()` value). Every number comes from the model, which never
 * returns a non-finite value.
 */
export interface InversionRow {
    readonly id: string;
    readonly text: string;
    /** True when the board does not currently show the object this row describes (outside the view, or beyond the draw cap). */
    readonly outsideView: boolean;
}

export interface InversionTexts {
    /** `no-centre`, `invalid`, or the focus with its case (`point`, `centre`, `circle-to-line`, `secant`, `right-angle`, ...). */
    readonly state: string;
    readonly chip: string;
    readonly rows: readonly InversionRow[];
}

const pointText = (p: RationalPoint) => `(${exactText(p.x)}, ${exactText(p.y)})`;

/** The coefficient and the variable, "x", "−y", "3x". */
function term(coefficient: Rational, variable: string): string {
    const text = exactText(coefficient.sign() < 0 ? coefficient.neg() : coefficient);
    return `${text === "1" ? "" : text}${variable}`;
}

/** The line `a x + b y = c` of the model as text, "x = 2", "x − y = 0", "2x + 3y = 6". */
export function lineText(image: Extract<ExactImage, {kind: "line"}>): string {
    const parts: string[] = [];
    const pieces: [Rational, string][] = [[image.a, "x"], [image.b, "y"]];
    for (const [coefficient, variable] of pieces) {
        if (coefficient.isZero()) continue;
        const body = term(coefficient, variable);
        if (parts.length === 0) parts.push(coefficient.sign() < 0 ? `${MINUS_SIGN}${body}` : body);
        else parts.push(coefficient.sign() < 0 ? `${MINUS_SIGN} ${body}` : `+ ${body}`);
    }
    return `${parts.join(" ")} = ${exactText(image.c)}`;
}

function withOutside(text: string, outside: boolean, translate: typeof t): string {
    return outside ? `${text}; ${translate("notable_outside_view")}` : text;
}

export function inversionTexts(view: InversionView, translate: typeof t, language: NumberLanguage, outside: ReadonlySet<InversionPlaceId>,
                               radius: number): InversionTexts {
    const num = (value: number) => formatNumber(value, language, 3);
    const row = (id: string, text: string, isOutside = false): InversionRow => ({id, text: withOutside(text, isOutside, translate), outsideView: isOutside});
    if (view.kind === "no-centre") {
        const text = translate("inversion_no_centre");
        return {state: "no-centre", chip: text, rows: [row("no-centre", text)]};
    }
    const invalid = (): InversionTexts => {
        const text = translate("inversion_invalid");
        return {state: "invalid", chip: text, rows: [row("invalid", text)]};
    };
    if (view.focus === "point") {
        const point = view.point;
        if (!point || point.kind === "invalid") return invalid();
        if (point.kind === "centre") {
            const text = translate("inversion_centre_no_image");
            return {state: "centre", chip: text, rows: [row("centre", text)]};
        }
        const isOutside = outside.has("image") || point.board === undefined;
        const image = translate("inversion_point_image", {value0: pointText(point.exact)});
        const position = translate(point.position === "inside" ? "inversion_pos_inside" : point.position === "on" ? "inversion_pos_on" : "inversion_pos_outside", {value0: "X"});
        return {
            state: "point",
            chip: withOutside(image, isOutside, translate),
            rows: [row("image", image, isOutside), row("position", position), row("product", translate("inversion_point_product", {value0: radius * radius}))],
        };
    }
    if (view.focus === "source") {
        const source = view.source;
        if (!source || source.kind === "invalid") return invalid();
        const isCircle = view.sourceKind === "circle";
        const kind = isCircle
            ? translate(source.throughCentre ? "inversion_kind_circle_to_line" : "inversion_kind_circle_to_circle")
            : translate(source.throughCentre ? "inversion_kind_line_to_self" : "inversion_kind_line_to_circle");
        const state = isCircle ? (source.throughCentre ? "circle-to-line" : "circle-to-circle") : (source.throughCentre ? "line-to-self" : "line-to-circle");
        const isOutside = outside.has("source-image") || (source.shape === "circle" && source.board === undefined);
        const exact = source.exact;
        const image = exact.kind === "line"
            ? translate("inversion_image_line", {value0: lineText(exact)})
            : translate("inversion_image_circle", {value0: pointText(exact.centre), value1: exactText(exact.r2)});
        return {state, chip: kind, rows: [row("kind", kind), row("image", image, isOutside)]};
    }
    if (view.focus === "power") {
        const power = view.power;
        if (!power || power.kind === "invalid") return invalid();
        const rows: InversionRow[] = [
            row("power", translate("inversion_power_value", {value0: exactText(power.power)})),
            row("position", translate(power.position === "inside" ? "inversion_power_inside" : power.position === "on" ? "inversion_power_on" : "inversion_power_outside")),
        ];
        const secant = power.secant;
        if (secant.kind === "two") {
            const rad = (power.thetaDeg * Math.PI) / 180;
            const dx = Math.cos(rad);
            const dy = Math.sin(rad);
            const along = (p: {x: number; y: number}) => (p.x - view.centre.x) * dx + (p.y - view.centre.y) * dy;
            rows.push(row("secant", translate("inversion_secant_two", {value0: num(along(secant.A)), value1: num(along(secant.B)), value2: num(secant.product)})));
        } else {
            rows.push(row("secant", translate(secant.kind === "miss" ? "inversion_secant_miss" : "inversion_secant_tangent")));
        }
        rows.push(row("tangent", power.tangent
            ? translate("inversion_tangent_length", {value0: num(power.tangent.length)})
            : translate("inversion_tangent_none")));
        return {state: "secant", chip: translate("inversion_chip_power", {value0: exactText(power.power)}), rows};
    }
    const angle = view.angle;
    if (!angle || angle.kind === "invalid") return invalid();
    if (angle.kind !== "angle") {
        const key = angle.kind === "no-intersection" ? "inversion_angle_none" : angle.kind === "tangent" ? "inversion_angle_tangent"
            : angle.kind === "coincident" ? "inversion_angle_coincident" : "inversion_angle_centre";
        const text = translate(key);
        return {state: angle.kind, chip: text, rows: [row("angle-case", text)]};
    }
    const isOutside = outside.has("q-image") || angle.imageBoard === undefined;
    const right = Math.abs(angle.before.unsigned - 90) < 1e-9 && Math.abs(angle.after.unsigned - 90) < 1e-9;
    const rows: InversionRow[] = right
        ? [row("angle-right", translate("inversion_angle_right", {value0: 90}), isOutside)]
        : [
            row("angle-before", translate("inversion_angle_before", {value0: num(angle.before.unsigned), value1: num(angle.before.signed)})),
            row("angle-after", translate("inversion_angle_after", {value0: num(angle.after.unsigned), value1: num(angle.after.signed)}), isOutside),
            row("angle-flip", translate("inversion_angle_flip")),
        ];
    return {
        state: right ? "right-angle" : "angle",
        chip: translate("inversion_chip_angle", {value0: num(angle.before.unsigned), value1: num(angle.after.unsigned)}),
        rows,
    };
}
