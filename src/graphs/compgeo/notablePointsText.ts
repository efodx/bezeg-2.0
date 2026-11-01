import {t} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {CENTRE_IDS, CentreId, NotableAnalysis} from "../../compgeo/notablePointsModel";
import {Rational} from "../../compgeo/rational";

/**
 * The words of the notable-points graph, as a pure function of the analysis, shared by the inspector and the board text.
 * No React, JSXGraph or board state; `translate` is `t` (or the `useT()` value). Nothing here prints NaN: every number
 * comes from the kernel model, which never returns a non-finite value.
 */
export const CENTRE_SYMBOL: Readonly<Record<CentreId, string>> = {centroid: "G", circumcentre: "O", incentre: "I", orthocentre: "H"};

export interface CentreRow {
    readonly id: CentreId;
    readonly text: string;
    /** True when the centre is not defined for a degenerate triangle. */
    readonly undefinedCentre: boolean;
    /** True when the board does not currently show the centre (outside the view, or too far to draw). */
    readonly outsideView: boolean;
}

export interface NotableTexts {
    readonly chip: string;
    readonly degenerateWhy: string | undefined;
    readonly area: string;
    readonly circumradius: string | undefined;
    readonly inradius: string | undefined;
    readonly rows: readonly CentreRow[];
    readonly vertices: readonly string[];
    /** Centres too far to be drawn at all (their coordinates are in `rows`). */
    readonly tooFar: readonly string[];
}

const NAMES = ["A", "B", "C"] as const;

/** Exact text with the true minus sign, "−5/2". */
export function exactText(value: Rational): string {
    return value.format().replace(/-/g, MINUS_SIGN);
}

function pointText(x: Rational, y: Rational): string {
    return `(${exactText(x)}, ${exactText(y)})`;
}

export function shapeWord(analysis: Extract<NotableAnalysis, {kind: "triangle"}>, translate: typeof t): string {
    const c = analysis.classification;
    if (c.kind === "degenerate") return translate("notable_shape_degenerate");
    return c.shape === "acute" ? translate("notable_shape_acute") : c.shape === "right" ? translate("notable_shape_right") : translate("notable_shape_obtuse");
}

/** `outside` lists the centres not visible in the current board view; centres without board coordinates count as outside. */
export function notableTexts(analysis: Extract<NotableAnalysis, {kind: "triangle"}>, translate: typeof t, language: NumberLanguage,
                             outside: ReadonlySet<CentreId>): NotableTexts {
    const num = (value: number) => formatNumber(value, language, 5);
    const exact = {centroid: analysis.centroid, circumcentre: analysis.circumcentre, orthocentre: analysis.orthocentre};
    const rows: CentreRow[] = [];
    const tooFar: string[] = [];
    for (const id of CENTRE_IDS) {
        const symbol = CENTRE_SYMBOL[id];
        if (id === "incentre") {
            const i = analysis.incentre;
            if (!i) {
                rows.push({id, text: translate("notable_centre_undefined", {value0: symbol}), undefinedCentre: true, outsideView: false});
                continue;
            }
            const out = outside.has(id);
            const text = translate("notable_centre_row_approx", {value0: symbol, value1: `(${num(i.x)}; ${num(i.y)})`, value2: translate("notable_position_inside")});
            rows.push({id, text: out ? `${text}; ${translate("notable_outside_view")}` : text, undefinedCentre: false, outsideView: out});
            continue;
        }
        const centre = exact[id];
        if (!centre) {
            rows.push({id, text: translate("notable_centre_undefined", {value0: symbol}), undefinedCentre: true, outsideView: false});
            continue;
        }
        const position = centre.position === "inside" ? translate("notable_position_inside")
            : centre.position === "on" ? translate("notable_position_on") : translate("notable_position_outside");
        const out = outside.has(id) || centre.board === undefined;
        if (centre.board === undefined) tooFar.push(translate("notable_too_far", {value0: symbol}));
        const text = translate("notable_centre_row", {value0: symbol, value1: pointText(centre.point.x, centre.point.y), value2: position});
        rows.push({id, text: out ? `${text}; ${translate("notable_outside_view")}` : text, undefinedCentre: false, outsideView: out});
    }
    return {
        chip: translate("notable_class_chip", {value0: shapeWord(analysis, translate)}),
        degenerateWhy: analysis.classification.kind === "degenerate" ? translate("notable_degenerate_why") : undefined,
        area: translate("notable_area", {value0: exactText(analysis.area)}),
        circumradius: analysis.circumradius === undefined ? undefined : translate("notable_circumradius", {value0: num(analysis.circumradius)}),
        inradius: analysis.inradius === undefined ? undefined : translate("notable_inradius", {value0: num(analysis.inradius)}),
        rows,
        vertices: analysis.vertices.map((p, i) => translate("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${p.x}, ${p.y})`.replace(/-/g, MINUS_SIGN)})),
        tooFar,
    };
}
