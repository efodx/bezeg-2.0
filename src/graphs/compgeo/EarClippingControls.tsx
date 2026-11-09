import React from "react";
import {useT} from "../../localization";
import {EarEventInfo, EarRefusal, EarSummary} from "./earClippingRun";
import type {EarClippingNote} from "../../compgeo/earClipping";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "../base/controls/useStatusReadout";

/** The named examples, in the order of the chooser. */
export type EarClippingExampleId = "example-1" | "example-2";

export interface EarClippingControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: EarClippingExampleId): void;
}

export interface EarClippingControlsProps {
    refusal: EarRefusal | undefined;
    reversed: boolean;
    step: number;
    length: number;
    playing: boolean;
    event: EarEventInfo | undefined;
    trianglesSoFar: number;
    /** Present only once the trace is done. */
    summary: EarSummary | undefined;
    /** The example the polygon is now, or undefined for a custom polygon. */
    exampleId: EarClippingExampleId | undefined;
    actions: EarClippingControlActions;
}

type Translate = ReturnType<typeof useT>;

function noteText(t: Translate, note: EarClippingNote): string {
    switch (note) {
        case "phase-start": return t("earclip_note_phase_start");
        case "test-reflex": return t("earclip_note_test_reflex");
        case "test-blocked": return t("earclip_note_test_blocked");
        case "test-ear": return t("earclip_note_test_ear");
        case "accept-ear": return t("earclip_note_accept_ear");
        case "output-ear": return t("earclip_note_output_ear");
        case "output-last-triangle": return t("earclip_note_output_last_triangle");
        case "done-triangulated": return t("earclip_note_done_triangulated");
    }
}

function refusalText(t: Translate, refusal: EarRefusal): string {
    switch (refusal) {
        case "fewer-than-three": return t("earclip_refusal_fewer_than_three");
        case "not-simple": return t("earclip_refusal_not_simple");
        case "collinear-vertices": return t("earclip_refusal_collinear");
        case "unsupported": return t("earclip_refusal_unsupported");
    }
}

/** Next step / Play / Pause / Reset, the examples and the status of the ear clipping trace. Unavailable buttons stay focusable (`aria-disabled`). */
export function EarClippingControls(props: EarClippingControlsProps) {
    const t = useT();
    const {refusal, reversed, step, length, playing, event, trianglesSoFar, summary, exampleId, actions} = props;
    const traced = refusal === undefined && length > 0;
    const atEnd = step >= length - 1;
    let detail: string | undefined;
    if (event && event.points.length === 3 && event.kind === "test") {
        const [previous, apex, next] = event.points;
        detail = t("earclip_detail_triangle", {value0: previous + 1, value1: apex + 1, value2: next + 1});
        if (typeof event.rejected === "number") detail += ` ${t("earclip_detail_blocker", {value0: event.rejected + 1})}`;
    }
    const stepText = traced ? t("hulltrace_step_counter", {value0: step + 1, value1: length}) : undefined;
    const countText = traced && event ? t("hulltrace_predicate_count", {value0: event.predicateCount}) : undefined;
    const resultText = summary ? [
        t("earclip_result_title"),
        t("earclip_result_triangles", {value0: summary.triangles, value1: summary.triangles + 2}),
        t("earclip_result_diagonals", {value0: summary.diagonals}),
        t("earclip_result_guards", {value0: summary.guardCount, value1: summary.guardVertices.map(v => `P${v + 1}`).join(", ")}),
    ].join(". ") : undefined;
    const trianglesText = traced ? t("earclip_triangles_so_far", {value0: trianglesSoFar}) : undefined;
    const noteSentence = traced && event ? noteText(t, event.note) : undefined;
    // Silent while Play runs (the region's mute); announces the status once on Pause or at the end.
    const liveReadout = useStatusReadout(!traced ? "" : [stepText, noteSentence, detail, trianglesText, countText, resultText].filter(Boolean).join(". "));
    return <>
        <div className="inspector-group">
            <ExampleSelect label={t("earclip_example_group")} current={exampleId} onChoose={actions.loadExample}
                           options={[{id: "example-1", text: t("earclip_example_1")}, {id: "example-2", text: t("earclip_example_2")}]}/>
        </div>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("earclip_controls_label")} nextLabel={t("hulltrace_next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({ready: traced, atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("earclip_playback_note")}</p>
        </div>
        <div className="inspector-group" data-ear-clipping-status="">
            {refusal && <p className="inspector-help" role="alert" data-ear-clipping="refusal">{refusalText(t, refusal)}</p>}
            {traced && reversed && <p className="inspector-help" role="status" data-ear-clipping="reversed">{t("earclip_reversed_note")}</p>}
            {stepText && <p className="inspector-help" data-ear-clipping="step">{stepText}</p>}
            {noteSentence && <p className="inspector-help" data-ear-clipping="note">{noteSentence}</p>}
            {detail && <p className="inspector-help" data-ear-clipping="detail">{detail}</p>}
            {trianglesText && <p className="inspector-help" data-ear-clipping="triangles">{trianglesText}</p>}
            {countText && <p className="inspector-help" data-ear-clipping="count">{countText}</p>}
            <LiveReadout readout={liveReadout} muted={playing} dataAttribute="ear-clipping-live"/>
            {summary && <>
                <h3 className="inspector-help">{t("earclip_result_title")}</h3>
                <ul data-ear-clipping="result">
                    <li data-result="triangles">{t("earclip_result_triangles", {value0: summary.triangles, value1: summary.triangles + 2})}</li>
                    <li data-result="diagonals">{t("earclip_result_diagonals", {value0: summary.diagonals})}</li>
                    <li data-result="classes">{t("earclip_result_classes", {
                        value0: summary.classSizes[0], value1: summary.classSizes[1], value2: summary.classSizes[2]})}</li>
                    <li data-result="guards">{t("earclip_result_guards", {
                        value0: summary.guardCount, value1: summary.guardVertices.map(v => `P${v + 1}`).join(", ")})}</li>
                </ul>
            </>}
        </div>
    </>;
}
