import {t} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {FOOT_NAMES, SimsonAnalysis, SimsonStatus} from "../../compgeo/simsonLineModel";
import {exactText} from "./notablePointsText";
import {RationalPoint} from "../../compgeo/rational";

/**
 * The words of the Simson line graph, a pure function of the analysis shared by the inspector and the board text.
 * No React, JSXGraph or board state; `translate` is `t` (or the `useT()` value). Every number comes from the model,
 * which never returns a non-finite value.
 */
export type SimsonPlaceId = "p" | "d" | "e" | "f";
export const SIMSON_PLACE_IDS: readonly SimsonPlaceId[] = ["p", "d", "e", "f"];

export interface SimsonRow {
    readonly id: SimsonPlaceId;
    readonly text: string;
    /** True when the board does not currently show the point (outside the view, or too far to draw). */
    readonly outsideView: boolean;
}

export interface SimsonTexts {
    readonly state: "exact" | "glider";
    readonly chip: string;
    readonly status: string;
    readonly circle: string;
    readonly rows: readonly SimsonRow[];
    /** Exact mode: the power row and whether P' is on the circle in words. */
    readonly power: string | undefined;
    readonly onCircle: string | undefined;
    readonly area: string;
    readonly distinct: string | undefined;
    readonly tooFar: readonly string[];
    readonly vertices: readonly string[];
}

const NAMES = ["A", "B", "C"] as const;
const SUPERSCRIPT: Readonly<Record<string, string>> = {"-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};

function exactPointText(point: RationalPoint): string {
    return `(${exactText(point.x)}, ${exactText(point.y)})`;
}

/** A nonnegative number as "5,0·10⁻⁴" below 0.01 and as a plain rounded decimal above; zero is "0". */
export function areaRatioText(value: number, language: NumberLanguage): string {
    if (!(value > 0)) return "0";
    if (value >= 0.01) return formatNumber(value, language, 5);
    let exponent = Math.floor(Math.log10(value));
    let mantissa = Math.round(value / 10 ** exponent * 10) / 10;
    if (mantissa >= 10) { mantissa /= 10; exponent += 1; }
    const digits = mantissa.toFixed(1).replace(".", language === "sl" ? "," : ".");
    return `${digits}·10${String(exponent).split("").map(ch => SUPERSCRIPT[ch]).join("")}`;
}

/** Text of the vertex list, usable also when the analysis is degenerate. */
export function simsonVertexTexts(vertices: readonly {x: number; y: number}[], translate: typeof t): string[] {
    return vertices.map((p, i) => translate("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${p.x}, ${p.y})`.replace(/-/g, MINUS_SIGN)}));
}

export function simsonStatusText(status: SimsonStatus, translate: typeof t): string {
    switch (status) {
        case "collinear-exact": return translate("simson_status_exact");
        case "collinear-within": return translate("simson_status_within");
        case "coincident": return translate("simson_status_coincident");
        default: return translate("simson_status_not");
    }
}

/** The chip for any analysis: the state of the feet in words. */
export function simsonChip(analysis: SimsonAnalysis, translate: typeof t): string {
    if (analysis.kind === "triangle") return translate("simson_chip", {value0: simsonStatusText(analysis.status, translate)});
    return analysis.kind === "degenerate" ? translate("simson_chip_degenerate") : "";
}

/** `outside` lists the places not visible in the current board view; places without board coordinates count as outside. */
export function simsonTexts(analysis: Extract<SimsonAnalysis, {kind: "triangle"}>, translate: typeof t, language: NumberLanguage,
                            outside: ReadonlySet<SimsonPlaceId>): SimsonTexts {
    const exact = analysis.exact;
    const num = (value: number) => formatNumber(value, language, 3);
    const pName = exact ? "P′" : "P";
    const places: {id: SimsonPlaceId; name: string; x: number; y: number; point: RationalPoint | undefined; board: unknown}[] = [
        {id: "p", name: pName, x: analysis.p.x, y: analysis.p.y, point: analysis.p.exact, board: analysis.p.board},
        ...analysis.feet.map((f, i) => ({id: SIMSON_PLACE_IDS[i + 1], name: FOOT_NAMES[i], x: f.x, y: f.y, point: f.exact, board: f.board})),
    ];
    const rows: SimsonRow[] = [];
    const tooFar: string[] = [];
    for (const place of places) {
        const out = outside.has(place.id) || place.board === undefined;
        if (place.board === undefined) tooFar.push(translate("simson_too_far", {value0: place.name}));
        const text = place.point
            ? translate("simson_point_row", {value0: place.name, value1: exactPointText(place.point)})
            : translate("simson_point_row_approx", {value0: place.name, value1: `(${num(place.x)}, ${num(place.y)})`});
        rows.push({id: place.id, text: out ? `${text}; ${translate("notable_outside_view")}` : text, outsideView: out});
    }
    let area: string;
    if (exact) area = translate("simson_area_exact", {value0: exactText(exact.areaRatio)});
    else if (analysis.collinear) area = translate("simson_area_tolerance");
    else area = translate("simson_area_glider", {value0: areaRatioText(analysis.glider?.relative ?? 0, language)});
    return {
        state: exact ? "exact" : "glider",
        chip: simsonChip(analysis, translate),
        status: simsonStatusText(analysis.status, translate),
        circle: translate("simson_circle_row", {value0: exactPointText(analysis.centre), value1: exactText(analysis.r2)}),
        rows,
        power: exact ? translate("simson_power", {value0: exactText(exact.power)}) : undefined,
        onCircle: exact ? translate(exact.onCircle ? "simson_on_circle" : "simson_off_circle") : undefined,
        area,
        distinct: exact ? translate("simson_distinct", {value0: exact.distinctCount}) : undefined,
        tooFar,
        vertices: simsonVertexTexts(analysis.vertices, translate),
    };
}
