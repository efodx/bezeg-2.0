import {t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {GLIDER_EXCLUSION_DEG, InscribedAnalysis} from "../../compgeo/inscribedAngleModel";

/**
 * The words of the inscribed-angle graph, a pure function of the analysis shared by the inspector and the board text.
 * No React, JSXGraph or board state; `translate` is `t` (or the `useT()` value). Angles are doubles shown to 0.1 degree;
 * only the diameter statement is exact. Nothing here prints NaN: the model never returns a non-finite value.
 */
export interface InscribedTexts {
    readonly state: "circle" | "degenerate" | "missing" | "too-far";
    /** One line for the board and the status region. */
    readonly chip: string;
    /** The explanation of a state without a circle or glider. */
    readonly stateNote: string | undefined;
    readonly acb: string | undefined;
    readonly apb: string | undefined;
    readonly central: string | undefined;
    readonly relation: string | undefined;
    readonly diameter: string | undefined;
    readonly undefinedNote: string | undefined;
    readonly vertices: readonly string[];
}

const NAMES = ["A", "B", "C"] as const;

export function inscribedTexts(analysis: InscribedAnalysis, translate: typeof t, language: NumberLanguage): InscribedTexts {
    const none = {acb: undefined, apb: undefined, central: undefined, relation: undefined, diameter: undefined, undefinedNote: undefined, vertices: []};
    if (analysis.kind === "missing") {
        const note = translate("inscribed_missing", {value0: 3 - analysis.have});
        return {...none, state: "missing", chip: note, stateNote: note};
    }
    if (analysis.kind === "degenerate") {
        const note = translate("inscribed_degenerate");
        return {...none, state: "degenerate", chip: note, stateNote: note};
    }
    const num = (value: number) => formatNumber(value, language, 1);
    const vertices = analysis.vertices.map((v, i) => translate("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${num(v.x)}, ${num(v.y)})`}));
    const acb = translate("inscribed_acb", {value0: num(analysis.angleAcb)});
    const central = translate("inscribed_central", {value0: num(analysis.centralAngle)});
    const diameter = analysis.diameter ? translate("inscribed_diameter") : undefined;
    const glider = analysis.glider;
    if (!analysis.board || !glider) {
        const note = translate("inscribed_too_far");
        return {state: "too-far", chip: note, stateNote: note, acb, apb: undefined, central, relation: undefined, diameter, undefinedNote: undefined, vertices};
    }
    const apb = translate("inscribed_apb", {value0: num(glider.angleApb)});
    const relation = glider.relation === "sameArc"
        ? translate("inscribed_relation_same", {value0: num(glider.angleApb), value1: num(glider.expectedApb)})
        : translate("inscribed_relation_other", {value0: num(glider.angleApb), value1: num(glider.expectedApb)});
    const chip = translate("inscribed_chip", {value0: num(glider.angleApb), value1: num(analysis.angleAcb), value2: num(analysis.centralAngle)});
    return {
        state: "circle", chip, stateNote: undefined, acb, apb, central, relation, diameter, vertices,
        undefinedNote: translate("inscribed_undefined_note", {value0: num(GLIDER_EXCLUSION_DEG)}),
    };
}
