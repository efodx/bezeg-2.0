import React from "react";
import {useT} from "../../localization";
import type {CurvePairState} from "../../compgeo/curvePairSubdivision";
import {BezierHullsLine, bezierHullsReadout} from "./bezierHullsReadout";

export interface BezierHullsControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface BezierHullsControlsProps {
    /** What the shown step knows (the graph's `pairState`). */
    state: CurvePairState;
    step: number;
    length: number;
    playing: boolean;
    actions: BezierHullsControlActions;
}

type Translate = ReturnType<typeof useT>;

/** The sentence of one readout line. Exhaustive over the adapter's line kinds. */
function lineText(t: Translate, line: BezierHullsLine): string {
    switch (line.kind) {
        case "depth": return t("bezierhulls_depth", {value0: line.depth, value1: line.maxDepth});
        case "candidates": return t("bezierhulls_candidates", {value0: line.candidates});
        case "kept": return t("bezierhulls_kept", {value0: line.kept, value1: line.of});
        case "tests": return t("bezierhulls_tests", {value0: line.tested, value1: line.discarded});
        case "empty": return t("bezierhulls_empty");
        case "remaining": return t("bezierhulls_remaining");
    }
}

/**
 * Next step / Play / Pause / Reset and the readout of the Bezier hulls graph. An unavailable button stays focusable
 * (`aria-disabled`) so keyboard focus is not lost when playback reaches its end. The readout is one line per item and
 * is announced as a status once on a pause or at the end, never on every tick of Play.
 */
export function BezierHullsControls(props: BezierHullsControlsProps) {
    const t = useT();
    const {state, step, length, playing, actions} = props;
    const atEnd = step >= length - 1;
    const playUnavailable = atEnd && !playing;
    const resetUnavailable = step === 0 && !playing;
    const lines = bezierHullsReadout(state).lines;
    const stepText = t("hulltrace_step_counter", {value0: step + 1, value1: Math.max(length, 1)});
    return <>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("bezierhulls_controls_label")}>
                <button type="button" data-action="next-step" aria-disabled={atEnd}
                        onClick={() => { if (!atEnd) actions.nextStep(); }}>{t("hulltrace_next_step")}</button>
                <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                        onClick={() => { if (!playUnavailable) actions.playPause(); }}>{playing ? t("pause") : t("play")}</button>
                <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                        onClick={() => { if (!resetUnavailable) actions.reset(); }}>{t("reset")}</button>
            </div>
            <p className="inspector-help">{t("bezierhulls_playback_note")}</p>
        </div>
        <div className="inspector-group" data-bezier-hulls="readout">
            <p className="inspector-help" data-bezier-hulls="step">{stepText}</p>
            {lines.map(line => <p key={line.kind} className="inspector-help" data-bezier-hulls={line.kind}>{lineText(t, line)}</p>)}
        </div>
        {/* Silent while Play runs (a tick each interval would flood a screen reader); announces the readout once on Pause or at the end. */}
        <p className="visually-hidden" role="status" aria-live="polite" data-bezier-hulls-live="">
            {playing ? "" : [stepText, ...lines.map(line => lineText(t, line))].map(text => /[.!?]$/.test(text) ? text : `${text}.`).join(" ")}</p>
    </>;
}
