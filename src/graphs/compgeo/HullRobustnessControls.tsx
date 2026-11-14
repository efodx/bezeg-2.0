import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import Slider from "../../inputs/Slider";
import type {GridPoint} from "../../compgeo/grid";
import {
    ChainOutputEntry, chainOutputReadout, DUPLICATE_RULES, DuplicateRule, KETTNER_PANELS, KETTNER_SIZE, KettnerCellReadout, KettnerPanel,
    formatDoubleValue, kettnerCounts, parseDuplicateRule, parseKettnerPanel, parsePopRule, parseRobustnessMode, POP_RULES, PopRule, ROBUSTNESS_MODES,
    RobustnessMode, signSymbol,
} from "./hullRobustnessReadout";

type Translate = ReturnType<typeof useT>;
type NumberLanguage = Parameters<typeof formatSignificant>[1];

export interface RobustnessChoiceActions {
    setMode(mode: RobustnessMode): void;
    setPopRule(pop: PopRule): void;
    setDuplicateRule(duplicates: DuplicateRule): void;
    setPanel(panel: KettnerPanel): void;
    setCell(i: number, j: number): void;
}

const modeText = (t: Translate, mode: RobustnessMode) => mode === "chain" ? t("hullrobust_mode_chain") : t("hullrobust_mode_kettner");
const popText = (t: Translate, pop: PopRule) => pop === "non-left" ? t("hullrobust_pop_non_left") : t("hullrobust_pop_right");
const duplicatesText = (t: Translate, duplicates: DuplicateRule) => duplicates === "merge" ? t("hullrobust_duplicates_merge") : t("hullrobust_duplicates_keep");
const panelText = (t: Translate, panel: KettnerPanel) => panel === "inexact" ? t("hullrobust_panel_inexact") : t("hullrobust_panel_exact");

/** The view choice (the chain or the Kettner map), shown above either mode's controls. */
export function RobustnessModeSelect(props: {mode: RobustnessMode; actions: RobustnessChoiceActions}) {
    const t = useT();
    return <div className="inspector-group" data-hull-robustness="mode">
        <ChoiceSelect label={t("hullrobust_mode_label")} value={props.mode}
                      options={ROBUSTNESS_MODES.map(id => ({value: id, text: modeText(t, id)}))}
                      onChange={value => { const next = parseRobustnessMode(value); if (next) props.actions.setMode(next); }}/>
    </div>;
}

export interface ChainChoicesProps {
    pop: PopRule;
    duplicates: DuplicateRule;
    actions: RobustnessChoiceActions;
}

/** The two rule choices of the chain mode. The active rule is named in the readout below the playback controls. */
export function ChainChoices(props: ChainChoicesProps) {
    const t = useT();
    return <div className="inspector-group" data-hull-robustness="rules">
        <ChoiceSelect label={t("hullrobust_pop_label")} value={props.pop}
                      options={POP_RULES.map(id => ({value: id, text: popText(t, id)}))}
                      onChange={value => { const next = parsePopRule(value); if (next) props.actions.setPopRule(next); }}/>
        <ChoiceSelect label={t("hullrobust_duplicates_label")} value={props.duplicates}
                      options={DUPLICATE_RULES.map(id => ({value: id, text: duplicatesText(t, id)}))}
                      onChange={value => { const next = parseDuplicateRule(value); if (next) props.actions.setDuplicateRule(next); }}/>
        <p className="inspector-help">{t("hullrobust_change_note")}</p>
    </div>;
}

export interface ChainReadoutProps {
    pop: PopRule;
    duplicates: DuplicateRule;
    /** The output hull (input indices) once the trace is done; null before. */
    hull: readonly number[] | null;
    points: readonly GridPoint[];
    gridStepExponent: number;
}

/** What the chain run shows: the active rule and, at the end, the output list with any location it lists more than once. */
export function ChainReadout(props: ChainReadoutProps) {
    const t = useT();
    const {language} = useLanguage();
    const scale = 2 ** props.gridStepExponent;
    const num = (value: number) => formatNumber(value * scale, language, 4);
    const entryText = (entry: ChainOutputEntry) => t("hullrobust_hull_entry", {value0: entry.number, value1: num(entry.x), value2: num(entry.y)});
    const rule = t("hullrobust_rule_active", {value0: popText(t, props.pop), value1: duplicatesText(t, props.duplicates)});
    const output = props.hull ? chainOutputReadout(props.hull, props.points) : undefined;
    return <div className="inspector-group" data-hull-robustness="chain-readout">
        <p className="inspector-help" data-hull-robustness="rule">{rule}</p>
        {output
            ? <>
                <p className="inspector-help" data-hull-robustness="output">
                    {t("hullrobust_hull_output", {value0: output.entries.length, value1: output.entries.map(entryText).join(", ")})}</p>
                {output.repeated.length > 0 && <p className="inspector-help" data-hull-robustness="repeated">
                    {t("hullrobust_hull_repeated", {value0: output.repeated.map(entryText).join(", ")})}</p>}
            </>
            : <p className="inspector-help" data-hull-robustness="output-pending">{t("hullrobust_hull_pending")}</p>}
    </div>;
}

export interface KettnerControlsProps {
    panel: KettnerPanel;
    cell: KettnerCellReadout;
    actions: RobustnessChoiceActions;
}

export interface KettnerCellLines {
    title: string;
    exact: string;
    naiveSign: string;
    naiveValue: string;
    verdict: string;
}

/**
 * The sentences about the selected cell. Every one that names the double result carries the word inexact. Only `title` (cell and
 * both signs, one sentence) is announced as a live status; the other lines are the non-live detail below it.
 */
export function kettnerCellLines(t: Translate, language: NumberLanguage, cell: KettnerCellReadout): KettnerCellLines {
    const verdict = cell.kind === "agree" ? t("hullrobust_cell_agree") : cell.kind === "wrong-sign" ? t("hullrobust_cell_wrong_sign") : t("hullrobust_cell_false_zero");
    return {
        title: t("hullrobust_cell_title", {value0: cell.i, value1: cell.j, value2: signSymbol(cell.exact), value3: signSymbol(cell.naive)}),
        exact: t("hullrobust_cell_exact", {value0: signSymbol(cell.exact)}),
        naiveSign: t("hullrobust_cell_naive_sign", {value0: signSymbol(cell.naive)}),
        naiveValue: t("hullrobust_cell_naive_value", {value0: formatDoubleValue(cell.naiveValue, language)}),
        verdict,
    };
}

/** The Kettner map's controls and readout: panel choice, the cell fields, the selected cell, the counts, the legend. */
export function KettnerControls(props: KettnerControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {cell, panel, actions} = props;
    const counts = kettnerCounts();
    const lines = kettnerCellLines(t, language, cell);
    const last = KETTNER_SIZE - 1;
    return <>
        <div className="inspector-group" data-hull-robustness="panel">
            <ChoiceSelect label={t("hullrobust_panel_label")} value={panel}
                          options={KETTNER_PANELS.map(id => ({value: id, text: panelText(t, id)}))}
                          onChange={value => { const next = parseKettnerPanel(value); if (next) actions.setPanel(next); }}/>
            <p className="inspector-help">{t("hullrobust_legend")}</p>
        </div>
        <div className="inspector-group" data-hull-robustness="cell-fields">
            <Slider customText={t("hullrobust_cell_i")} value={cell.i} min={0} max={last} step={1}
                    onChange={value => { actions.setCell(value, cell.j); }}/>
            <Slider customText={t("hullrobust_cell_j")} value={cell.j} min={0} max={last} step={1}
                    onChange={value => { actions.setCell(cell.i, value); }}/>
            <p className="inspector-help">{t("hullrobust_keyboard_note")}</p>
        </div>
        <div className="inspector-group" data-hull-robustness="cell">
            <p className="inspector-help" role="status" data-hull-robustness="cell-title">{lines.title}</p>
            <p className="inspector-help" data-hull-robustness="cell-exact">{lines.exact}</p>
            <p className="inspector-help" data-hull-robustness="cell-naive-sign">{lines.naiveSign}</p>
            <p className="inspector-help" data-hull-robustness="cell-naive-value">{lines.naiveValue}</p>
            <p className="inspector-help" data-hull-robustness="cell-verdict">{lines.verdict}</p>
        </div>
        <div className="inspector-group" data-hull-robustness="counts">
            <p className="inspector-help" data-hull-robustness="counts-text">
                {t("hullrobust_counts", {value0: counts.total, value1: counts.wrongSign, value2: counts.falseZero})}</p>
            <p className="inspector-help">{t("hullrobust_counts_scope")}</p>
            <p className="inspector-help" data-hull-robustness="setup">{t("hullrobust_setup")}</p>
        </div>
    </>;
}
