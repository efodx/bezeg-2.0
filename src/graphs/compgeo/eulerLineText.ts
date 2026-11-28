import {message, messageNumber, t, type Message} from "../../localization";
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

/** The ids of the sentences the inspector shows (the declaration's notes, in the panel's order). */
export type EulerNoteId =
    | "missing" | "chip" | "degenerate-why" | "equilateral" | EulerPlaceId | "r2-quarter" | "hg" | "go" | "ho" | "half-r" | "relation" | "distinct"
    | "too-far-h" | "too-far-g" | "too-far-o" | "too-far-n" | "vertex-1" | "vertex-2" | "vertex-3";

export interface EulerNote {readonly id: EulerNoteId; readonly text: Message}

function vertexNotes(vertices: readonly {x: number; y: number}[]): EulerNote[] {
    return vertices.map((p, i) => ({
        id: `vertex-${i + 1}` as EulerNoteId,
        text: message("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${p.x}, ${p.y})`.replace(/-/g, MINUS_SIGN)}),
    }));
}

/**
 * The same sentences as {@link eulerTexts} as catalog messages, for the declaration: pure data from the scene state. A point merely
 * outside the current view is not marked (that needs the board's view); a point too far to draw is.
 */
export function eulerNotes(analysis: EulerAnalysis): readonly EulerNote[] {
    if (analysis.kind === "missing") return [{id: "missing", text: message("notable_missing", {value0: 3 - analysis.have})}];
    if (analysis.kind === "degenerate") {
        return [{id: "chip", text: message("euler_chip_degenerate")}, {id: "degenerate-why", text: message("euler_degenerate_why")}, ...vertexNotes(analysis.vertices)];
    }
    const notes: EulerNote[] = [{id: "chip", text: message(analysis.line === undefined ? "euler_chip_equilateral" : "euler_chip_line")}];
    if (analysis.line === undefined) notes.push({id: "equilateral", text: message("euler_equilateral_note")});
    const tooFar: EulerNote[] = [];
    for (const id of EULER_PLACE_IDS) {
        const place = analysis[id];
        const symbol = EULER_PLACE_SYMBOL[id];
        if (place.board === undefined) tooFar.push({id: `too-far-${id}` as EulerNoteId, text: message("euler_too_far", {value0: symbol})});
        notes.push({id, text: message("euler_point_row", {value0: symbol, value1: pointText(place.point)})});
    }
    notes.push(
        {id: "r2-quarter", text: message("euler_r2_quarter", {value0: exactText(analysis.r2Quarter)})},
        {id: "hg", text: message("euler_hg", {value0: messageNumber(analysis.hg, 5)})},
        {id: "go", text: message("euler_go", {value0: messageNumber(analysis.go, 5)})},
        {id: "ho", text: message("euler_ho", {value0: messageNumber(analysis.ho, 5)})},
        {id: "half-r", text: message("euler_half_r", {value0: messageNumber(analysis.halfCircumradius, 5)})},
        {id: "relation", text: message(analysis.collinear && analysis.ratioHolds ? "euler_relation_holds" : "euler_relation_fails")},
        {id: "distinct", text: message("euler_distinct", {value0: analysis.nine.distinctCount})},
        ...tooFar, ...vertexNotes(analysis.vertices),
    );
    return notes;
}
