import {message, type Message} from "../../localization";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import type {GridPoint} from "../../compgeo/grid";
import {
    chainOutputReadout, formatDoubleValue, kettnerCounts, signSymbol, type ChainOutputEntry, type DuplicateRule, type KettnerCellReadout, type PopRule,
} from "./hullRobustnessReadout";

/** The ids of the robustness graph's own sentences: the chain view's rule and output, the Kettner view's cell and counts. */
export type RobustnessNoteId =
    | "rule" | "output" | "repeated" | "output-pending"
    | "cell-title" | "cell-exact" | "cell-naive-sign" | "cell-naive-value" | "cell-verdict" | "counts-text";

export const popMessage = (pop: PopRule): Message => pop === "non-left" ? message("hullrobust_pop_non_left") : message("hullrobust_pop_right");
export const duplicatesMessage = (duplicates: DuplicateRule): Message => duplicates === "merge" ? message("hullrobust_duplicates_merge") : message("hullrobust_duplicates_keep");

/** A list of messages joined by ", " (pairwise nesting through the catalog's join key). */
const joined = (items: readonly Message[]): Message => items.reduce((all, item) => message("hullrobust_list_join", {value0: all, value1: item}));

export interface ChainReadoutInput {
    pop: PopRule;
    duplicates: DuplicateRule;
    /** The output hull (input indices) once the trace is done; null before. */
    hull: readonly number[] | null;
    points: readonly GridPoint[];
    gridStepExponent: number;
    language: NumberLanguage;
}

/** What the chain run says beyond the trace: the active rules and, at the end, the output list with any location it lists more than once. */
export function chainReadoutNotes(input: ChainReadoutInput): {id: RobustnessNoteId; text: Message}[] {
    const {pop, duplicates, hull, points, gridStepExponent, language} = input;
    const scale = 2 ** gridStepExponent;
    const num = (value: number) => formatNumber(value * scale, language, 4);
    const entry = (item: ChainOutputEntry): Message => message("hullrobust_hull_entry", {value0: item.number, value1: num(item.x), value2: num(item.y)});
    const notes: {id: RobustnessNoteId; text: Message}[] = [
        {id: "rule", text: message("hullrobust_rule_active", {value0: popMessage(pop), value1: duplicatesMessage(duplicates)})},
    ];
    const output = hull ? chainOutputReadout(hull, points) : undefined;
    if (!output) return [...notes, {id: "output-pending", text: message("hullrobust_hull_pending")}];
    notes.push({id: "output", text: message("hullrobust_hull_output", {value0: output.entries.length, value1: output.entries.length ? joined(output.entries.map(entry)) : ""})});
    if (output.repeated.length > 0) notes.push({id: "repeated", text: message("hullrobust_hull_repeated", {value0: joined(output.repeated.map(entry))})});
    return notes;
}

/** The sentences about the selected Kettner cell and the counts of the map, in the order the panel shows them. */
export function kettnerNotes(cell: KettnerCellReadout, language: NumberLanguage): {id: RobustnessNoteId; text: Message}[] {
    const counts = kettnerCounts();
    const verdict = cell.kind === "agree" ? message("hullrobust_cell_agree") : cell.kind === "wrong-sign" ? message("hullrobust_cell_wrong_sign") : message("hullrobust_cell_false_zero");
    return [
        {id: "cell-title", text: message("hullrobust_cell_title", {value0: cell.i, value1: cell.j, value2: signSymbol(cell.exact), value3: signSymbol(cell.naive)})},
        {id: "cell-exact", text: message("hullrobust_cell_exact", {value0: signSymbol(cell.exact)})},
        {id: "cell-naive-sign", text: message("hullrobust_cell_naive_sign", {value0: signSymbol(cell.naive)})},
        {id: "cell-naive-value", text: message("hullrobust_cell_naive_value", {value0: formatDoubleValue(cell.naiveValue, language)})},
        {id: "cell-verdict", text: verdict},
        {id: "counts-text", text: message("hullrobust_counts", {value0: counts.total, value1: counts.wrongSign, value2: counts.falseZero})},
    ];
}
