import React from "react";
import {currentLanguage, useT} from "../../localization";
import type {LawsonNote} from "../../compgeo/delaunay";

export interface DelaunayControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(index: 0 | 1 | 2): void;
}

/** What the panel shows at one step; every number is already computed (exact incircle value as text). */
export interface DelaunayStatus {
    step: number;
    length: number;
    note: LawsonNote;
    flips: number;
    illegalCount: number;
    /** The edge under test and its two opposite points (0-based), with the exact incircle value and its sign; only at a `test` event. */
    test?: {edge: readonly [number, number]; apexes: readonly [number, number]; value: string; sign: -1 | 0 | 1};
    minNow: number;
    minStart: number;
    anglesNow: readonly number[];
    anglesStart: readonly number[];
    /** Present only once the trace is done. */
    done?: {cocircular: boolean};
}

export interface DelaunayControlsProps {
    /** Undefined while the points allow no triangulation. */
    status: DelaunayStatus | undefined;
    playing: boolean;
    actions: DelaunayControlActions;
}

type Translate = ReturnType<typeof useT>;

/** How many angles are listed in full: the six angles of a four-point quadrilateral. */
const FULL_ANGLES = 6;

/** Two decimals, with a decimal comma in Slovenian. Display only. */
function degrees(value: number): string {
    const text = value.toFixed(2);
    return currentLanguage() === "sl" ? text.replace(".", ",") : text;
}

function noteText(t: Translate, note: LawsonNote): string {
    switch (note) {
        case "phase-start": return t("del_note_phase_start");
        case "test-legal": return t("del_note_test_legal");
        case "test-illegal": return t("del_note_test_illegal");
        case "flip-edge": return t("del_note_flip");
        case "done-delaunay": return t("del_note_done");
    }
}

function signText(t: Translate, sign: -1 | 0 | 1): string {
    switch (sign) {
        case 1: return t("del_sign_inside");
        case 0: return t("del_sign_on");
        case -1: return t("del_sign_outside");
    }
}

function angleLine(t: Translate, angles: readonly number[], whole: "del_angles_now" | "del_angles_start"): string {
    const list = (items: readonly number[]) => items.map(degrees).join("; ");
    if (angles.length <= FULL_ANGLES) return t(whole, {value0: list(angles)});
    return t("del_angles_truncated", {value0: FULL_ANGLES, value1: angles.length, value2: list(angles.slice(0, FULL_ANGLES))});
}

/** Examples, Next step / Play / Pause / Reset and the readouts of the Lawson trace. Unavailable buttons stay focusable (`aria-disabled`). */
export function DelaunayControls(props: DelaunayControlsProps) {
    const t = useT();
    const {status, playing, actions} = props;
    const traced = status !== undefined;
    const atEnd = traced && status.step >= status.length - 1;
    const nextUnavailable = !traced || atEnd;
    const playUnavailable = !traced || (atEnd && !playing);
    const resetUnavailable = !traced || (status.step === 0 && !playing);
    const stepText = traced ? t("hulltrace_step_counter", {value0: status.step + 1, value1: status.length}) : undefined;
    const noteSentence = traced ? noteText(t, status.note) : undefined;
    const detail = status?.test
        ? t("del_detail_edge", {value0: status.test.edge[0] + 1, value1: status.test.edge[1] + 1, value2: status.test.apexes[0] + 1, value3: status.test.apexes[1] + 1})
        : undefined;
    const incircle = status?.test
        ? t("del_incircle_value", {value0: status.test.value, value1: signText(t, status.test.sign)})
        : undefined;
    const doneText = status?.done ? t("del_result_done") : undefined;
    const cocircularText = status?.done?.cocircular ? t("del_result_cocircular") : undefined;
    return <>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("del_example_group")}>
                <button type="button" data-action="example-quad" onClick={() => actions.loadExample(0)}>{t("del_example_quad")}</button>
                <button type="button" data-action="example-seven" onClick={() => actions.loadExample(1)}>{t("del_example_seven")}</button>
                <button type="button" data-action="example-square" onClick={() => actions.loadExample(2)}>{t("del_example_square")}</button>
            </div>
        </div>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("del_controls_label")}>
                <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                        onClick={() => { if (!nextUnavailable) actions.nextStep(); }}>{t("hulltrace_next_step")}</button>
                <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                        onClick={() => { if (!playUnavailable) actions.playPause(); }}>{playing ? t("pause") : t("play")}</button>
                <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                        onClick={() => { if (!resetUnavailable) actions.reset(); }}>{t("reset")}</button>
            </div>
            <p className="inspector-help">{t("del_playback_note")}</p>
        </div>
        {status && <div className="inspector-group" data-delaunay-status="">
            <p className="inspector-help" data-delaunay="step">{stepText}</p>
            <p className="inspector-help" data-delaunay="note">{noteSentence}</p>
            {detail && <p className="inspector-help" data-delaunay="detail">{detail}</p>}
            {incircle && <p className="inspector-help" data-delaunay="incircle">{incircle}</p>}
            <ul aria-label={t("del_controls_label")} data-delaunay="readout">
                <li data-readout="flips">{t("del_flips", {value0: status.flips})}</li>
                <li data-readout="illegal">{t("del_illegal_count", {value0: status.illegalCount})}</li>
                <li data-readout="min-now">{t("del_min_now", {value0: degrees(status.minNow)})}</li>
                <li data-readout="min-start">{t("del_min_start", {value0: degrees(status.minStart)})}</li>
                <li data-readout="angles-now">{angleLine(t, status.anglesNow, "del_angles_now")}</li>
                <li data-readout="angles-start">{angleLine(t, status.anglesStart, "del_angles_start")}</li>
            </ul>
            {doneText && <p className="inspector-help" data-delaunay="done">{doneText}</p>}
            {cocircularText && <p className="inspector-help" data-delaunay="cocircular">{cocircularText}</p>}
            {/* Silent while Play runs; announces the status once on Pause or at the end. */}
            <p className="visually-hidden" role="status" aria-live="polite" data-delaunay-live="">
                {playing ? "" : [stepText, noteSentence, detail, incircle, doneText, cocircularText].filter(Boolean).join(". ")}</p>
        </div>}
    </>;
}
