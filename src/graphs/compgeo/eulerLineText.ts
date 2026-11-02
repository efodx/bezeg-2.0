import {t} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {EulerAnalysis} from "../../compgeo/eulerLineModel";
import {exactText} from "./notablePointsText";
import {RationalPoint} from "../../compgeo/rational";

/**
 * The words of the Euler line graph, a pure function of the analysis shared by the inspector and the board text.
 * No React, JSXGraph or board state; `translate` is `t` (or the `useT()` value). Every number comes from the model,
 * which never returns a non-finite value.
 */
export type EulerPlaceId = "h" | "g" | "o" | "n";
export const EULER_PLACE_IDS: readonly EulerPlaceId[] = ["h", "g", "o", "n"];
export const EULER_PLACE_SYMBOL: Readonly<Record<EulerPlaceId, string>> = {h: "H", g: "G", o: "O", n: "N"};

export interface EulerRow {
    readonly id: EulerPlaceId;
    readonly text: string;
    /** True when the board does not currently show the point (outside the view, or too far to draw). */
    readonly outsideView: boolean;
}

export interface EulerTexts {
    readonly chip: string;
    readonly rows: readonly EulerRow[];
    readonly r2Quarter: string;
    readonly distances: readonly string[];
    readonly relation: string;
    readonly distinct: string;
    /** Set exactly when H = O (equilateral): the Euler line is not defined. */
    readonly equilateralNote: string | undefined;
    readonly tooFar: readonly string[];
    readonly vertices: readonly string[];
}

const NAMES = ["A", "B", "C"] as const;

function pointText(point: RationalPoint): string {
    return `(${exactText(point.x)}, ${exactText(point.y)})`;
}

/** Text of the vertex list, usable also when the analysis is degenerate. */
export function eulerVertexTexts(vertices: readonly {x: number; y: number}[], translate: typeof t): string[] {
    return vertices.map((p, i) => translate("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${p.x}, ${p.y})`.replace(/-/g, MINUS_SIGN)}));
}

/** The chip for any analysis: the Euler line state in words. */
export function eulerChip(analysis: EulerAnalysis, translate: typeof t): string {
    if (analysis.kind !== "triangle") return analysis.kind === "degenerate" ? translate("euler_chip_degenerate") : "";
    return analysis.line === undefined ? translate("euler_chip_equilateral") : translate("euler_chip_line");
}

/** `outside` lists the points not visible in the current board view; points without board coordinates count as outside. */
export function eulerTexts(analysis: Extract<EulerAnalysis, {kind: "triangle"}>, translate: typeof t, language: NumberLanguage,
                           outside: ReadonlySet<EulerPlaceId>): EulerTexts {
    const num = (value: number) => formatNumber(value, language, 5);
    const rows: EulerRow[] = [];
    const tooFar: string[] = [];
    for (const id of EULER_PLACE_IDS) {
        const place = analysis[id];
        const symbol = EULER_PLACE_SYMBOL[id];
        const out = outside.has(id) || place.board === undefined;
        if (place.board === undefined) tooFar.push(translate("euler_too_far", {value0: symbol}));
        const text = translate("euler_point_row", {value0: symbol, value1: pointText(place.point)});
        rows.push({id, text: out ? `${text}; ${translate("notable_outside_view")}` : text, outsideView: out});
    }
    return {
        chip: eulerChip(analysis, translate),
        rows,
        r2Quarter: translate("euler_r2_quarter", {value0: exactText(analysis.r2Quarter)}),
        distances: [
            translate("euler_hg", {value0: num(analysis.hg)}), translate("euler_go", {value0: num(analysis.go)}),
            translate("euler_ho", {value0: num(analysis.ho)}), translate("euler_half_r", {value0: num(analysis.halfCircumradius)}),
        ],
        relation: analysis.collinear && analysis.ratioHolds ? translate("euler_relation_holds") : translate("euler_relation_fails"),
        distinct: translate("euler_distinct", {value0: analysis.nine.distinctCount}),
        equilateralNote: analysis.line === undefined ? translate("euler_equilateral_note") : undefined,
        tooFar,
        vertices: eulerVertexTexts(analysis.vertices, translate),
    };
}
