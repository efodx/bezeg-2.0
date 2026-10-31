import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {GridPoint} from "../../compgeo/grid";
import {HULL_ALGORITHMS, HullAlgorithm, HullEventInfo, HullNote, parseHullAlgorithm} from "./hullTraceRun";

export interface HullTraceControlActions {
    setAlgorithm(algorithm: HullAlgorithm): void;
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface HullTraceControlsProps {
    algorithm: HullAlgorithm;
    step: number;
    length: number;
    playing: boolean;
    event: HullEventInfo | undefined;
    points: readonly GridPoint[];
    gridStepExponent: number;
    /** Total orientation tests of every algorithm on the current points; present only after `done`. */
    totals: Readonly<Record<HullAlgorithm, number>> | undefined;
    actions: HullTraceControlActions;
}

type Translate = ReturnType<typeof useT>;

/** The status-line sentence of a trace note. Exhaustive over the three algorithms' note keys. */
function noteText(t: Translate, note: HullNote): string {
    switch (note) {
        case "phase-lower": return t("hulltrace_note_phase_lower");
        case "phase-upper": return t("hulltrace_note_phase_upper");
        case "test-turn-left": return t("hulltrace_note_test_turn_left");
        case "test-turn-right": return t("hulltrace_note_test_turn_right");
        case "test-collinear": return t("hulltrace_note_test_collinear");
        case "accept-push": return t("hulltrace_note_accept_push");
        case "reject-pop": return t("hulltrace_note_reject_pop");
        case "output-hull": return t("hulltrace_note_output_hull");
        case "done-hull": return t("hulltrace_note_done_hull");
        case "done-collinear": return t("hulltrace_note_done_collinear");
        case "done-fewer-than-three": return t("hulltrace_note_done_fewer_than_three");
        case "accept-edge": return t("hulltrace_note_accept_edge");
        case "reject-edge": return t("hulltrace_note_reject_edge");
        case "test-replace-clockwise": return t("hulltrace_note_test_replace_clockwise");
        case "test-replace-farther": return t("hulltrace_note_test_replace_farther");
        case "test-keep-counterclockwise": return t("hulltrace_note_test_keep_counterclockwise");
        case "test-keep-nearer": return t("hulltrace_note_test_keep_nearer");
        case "accept-wrap": return t("hulltrace_note_accept_wrap");
    }
}

function algorithmName(t: Translate, algorithm: HullAlgorithm): string {
    switch (algorithm) {
        case "monotone-chain": return t("hulltrace_algorithm_monotone_chain");
        case "slow-edge-test": return t("hulltrace_algorithm_slow_edge_test");
        case "gift-wrapping": return t("hulltrace_algorithm_gift_wrapping");
    }
}

/**
 * Algorithm choice, Next step / Play / Pause / Reset and the status of the hull trace. An unavailable button stays focusable
 * (`aria-disabled`) so keyboard focus is not lost when playback reaches its end.
 */
export function HullTraceControls(props: HullTraceControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {algorithm, step, length, playing, event, points, gridStepExponent, totals, actions} = props;
    const atEnd = step >= length - 1;
    const nextUnavailable = atEnd;
    const playUnavailable = atEnd && !playing;
    const resetUnavailable = step === 0 && !playing;
    const scale = 2 ** gridStepExponent;
    const num = (value: number) => formatNumber(value, language, 4);
    const at = (index: number) => {
        const p = points[index];
        return p ? {x: num(p.x * scale), y: num(p.y * scale)} : {x: "?", y: "?"};
    };
    let detail: string | undefined;
    if (event?.test) {
        const [, , p] = event.test.points;
        const where = at(p);
        detail = t("hulltrace_test_detail", {value0: num(event.test.value * scale * scale), value1: p + 1, value2: where.x, value3: where.y});
    } else if (event?.pair) {
        const from = at(event.pair.from);
        const to = at(event.pair.to);
        detail = t("hulltrace_pair_detail", {
            value0: event.pair.from + 1, value1: from.x, value2: from.y, value3: event.pair.to + 1, value4: to.x, value5: to.y,
        });
    }
    return <>
        <div className="inspector-group">
            <ChoiceSelect label={t("hulltrace_algorithm_label")} value={algorithm}
                          options={HULL_ALGORITHMS.map(id => ({value: id, text: algorithmName(t, id)}))}
                          onChange={value => { const next = parseHullAlgorithm(value); if (next) actions.setAlgorithm(next); }}
                          help={algorithm === "slow-edge-test" ? t("hulltrace_slow_note") : undefined}/>
        </div>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("hulltrace_controls_label")}>
                <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                        onClick={() => { if (!nextUnavailable) actions.nextStep(); }}>{t("hulltrace_next_step")}</button>
                <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                        onClick={() => { if (!playUnavailable) actions.playPause(); }}>{playing ? t("pause") : t("play")}</button>
                <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                        onClick={() => { if (!resetUnavailable) actions.reset(); }}>{t("reset")}</button>
            </div>
            <p className="inspector-help">{t("hulltrace_playback_note")}</p>
        </div>
        <div className="inspector-group" role="status" aria-live="polite" data-hull-trace-status="">
            <p className="inspector-help" data-hull-trace="step">{t("hulltrace_step_counter", {value0: step + 1, value1: length})}</p>
            {event && <p className="inspector-help" data-hull-trace="note">{noteText(t, event.note)}</p>}
            {detail && <p className="inspector-help" data-hull-trace="detail">{detail}</p>}
            {event && <p className="inspector-help" data-hull-trace="count">{t("hulltrace_predicate_count", {value0: event.predicateCount})}</p>}
            {totals && <>
                <h3 className="inspector-help">{t("hulltrace_counts_title")}</h3>
                <ul data-hull-trace="totals">
                    {HULL_ALGORITHMS.map(id => <li key={id} data-algorithm={id}>
                        {t("hulltrace_count_row", {value0: algorithmName(t, id), value1: totals[id]})}</li>)}
                </ul>
            </>}
        </div>
    </>;
}
