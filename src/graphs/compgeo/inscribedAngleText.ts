import {message, messageNumber, t, type Message} from "../../localization";
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

/** The ids of the sentences the inspector shows (the declaration's notes, in the panel's order). */
export type InscribedNoteId = "chip" | "acb" | "apb" | "central" | "relation" | "diameter" | "undefined" | "vertex-1" | "vertex-2" | "vertex-3";

export interface InscribedNote {readonly id: InscribedNoteId; readonly text: Message}

/**
 * The same sentences as {@link inscribedTexts} as catalog messages, for the declaration: pure data from the scene state, in the
 * panel's order. The state sentence (missing, degenerate, too far or the angle chip) comes first.
 */
export function inscribedNotes(analysis: InscribedAnalysis, language: NumberLanguage): readonly InscribedNote[] {
    if (analysis.kind === "missing") return [{id: "chip", text: message("inscribed_missing", {value0: 3 - analysis.have})}];
    if (analysis.kind === "degenerate") return [{id: "chip", text: message("inscribed_degenerate")}];
    const num = (value: number) => formatNumber(value, language, 1);
    const glider = analysis.glider;
    const notes: InscribedNote[] = [{
        id: "chip",
        text: !analysis.board || !glider ? message("inscribed_too_far")
            : message("inscribed_chip", {value0: messageNumber(glider.angleApb, 1), value1: messageNumber(analysis.angleAcb, 1), value2: messageNumber(analysis.centralAngle, 1)}),
    }];
    notes.push({id: "acb", text: message("inscribed_acb", {value0: messageNumber(analysis.angleAcb, 1)})});
    if (analysis.board && glider) notes.push({id: "apb", text: message("inscribed_apb", {value0: messageNumber(glider.angleApb, 1)})});
    notes.push({id: "central", text: message("inscribed_central", {value0: messageNumber(analysis.centralAngle, 1)})});
    if (analysis.board && glider) {
        notes.push({id: "relation", text: message(glider.relation === "sameArc" ? "inscribed_relation_same" : "inscribed_relation_other",
            {value0: messageNumber(glider.angleApb, 1), value1: messageNumber(glider.expectedApb, 1)})});
    }
    if (analysis.diameter) notes.push({id: "diameter", text: message("inscribed_diameter")});
    if (analysis.board && glider) notes.push({id: "undefined", text: message("inscribed_undefined_note", {value0: messageNumber(GLIDER_EXCLUSION_DEG, 1)})});
    analysis.vertices.forEach((v, i) => notes.push({
        id: `vertex-${i + 1}` as InscribedNoteId,
        text: message("notable_vertex_row", {value0: NAMES[i], value1: i + 1, value2: `(${num(v.x)}, ${num(v.y)})`}),
    }));
    return notes;
}
