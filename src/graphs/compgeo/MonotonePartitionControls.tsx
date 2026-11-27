import React from "react";
import {renderMessage, useT} from "../../localization";
import type {VertexType} from "../../compgeo/sweep/monotonePartition";
import {edgeName, type PartitionEventInfo, type PartitionRun, vertexName} from "./monotonePartitionRun";
import {monotonePartitionNotes, partitionEventMessage, partitionRefusalMessage, type MonotonePartitionNoteId} from "./monotonePartitionNotes";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";

/** The named examples, in the order of the chooser. */
export type MonotonePartitionExampleId = "example-1" | "example-2";

export interface MonotonePartitionControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: MonotonePartitionExampleId): void;
}

export interface MonotonePartitionControlsProps {
    run: PartitionRun;
    step: number;
    playing: boolean;
    /** The example the polygon is now, or undefined for a custom polygon. */
    exampleId: MonotonePartitionExampleId | undefined;
    actions: MonotonePartitionControlActions;
    /** The side lists (event queue and status): rendered inside the status group, below the readouts. */
    children?: React.ReactNode;
}

export type Translate = ReturnType<typeof useT>;

/** The adjective of a vertex type ("razcepno", for "oglišče"). */
export function vertexTypeText(t: Translate, type: VertexType): string {
    switch (type) {
        case "start": return t("monotonepartition_type_start");
        case "end": return t("monotonepartition_type_end");
        case "split": return t("monotonepartition_type_split");
        case "merge": return t("monotonepartition_type_merge");
        case "regular": return t("monotonepartition_type_regular");
    }
}

/** The reason of a type: where the two neighbours lie and how large the interior angle is. */
export function reasonText(t: Translate, type: VertexType): string {
    switch (type) {
        case "start": return t("monotonepartition_reason_start");
        case "end": return t("monotonepartition_reason_end");
        case "split": return t("monotonepartition_reason_split");
        case "merge": return t("monotonepartition_reason_merge");
        case "regular": return t("monotonepartition_reason_regular");
    }
}

/** The refusal of the polygon as text; `t` is kept for the signature the triangulation panel calls (the text is the catalog message). */
export function refusalText(_t: Translate, run: PartitionRun): string | undefined {
    const refusal = partitionRefusalMessage(run);
    return refusal ? renderMessage(refusal) : undefined;
}

export function noteText(_t: Translate, event: PartitionEventInfo, run: PartitionRun, type: VertexType | null): string {
    return renderMessage(partitionEventMessage(event, run, type));
}

/**
 * Next step / Play / Pause / Reset, the examples and the readouts of the monotone partition sweep (spec C3): step i of N,
 * the note of the event, the current vertex with its type and the reason, the diagonals so far and, once done, the piece
 * count with the type counts. Every number comes from the kernel result through the run. A refused polygon shows its
 * message instead of the readouts. An unavailable button stays focusable (`aria-disabled`).
 */
export function MonotonePartitionControls(props: MonotonePartitionControlsProps) {
    const t = useT();
    const {run, step, playing, exampleId, actions, children} = props;
    const notes = monotonePartitionNotes(run, step);
    const text = (id: MonotonePartitionNoteId) => {
        const note = notes.find(candidate => candidate.id === id);
        return note ? renderMessage(note.text) : undefined;
    };
    const refusal = text("refusal");
    const traced = refusal === undefined && run.length > 0;
    const atEnd = step >= run.length - 1;
    const stepText = stepCounterText(t, step, run.length);
    const noteLine = text("note");
    const summary = text("summary");
    // Silent while Play runs (the region's mute); announces once on Pause or at the end.
    const liveReadout = useStatusReadout(traced ? [stepText, noteLine, summary].filter(Boolean).join(". ") : "", true);
    return <>
        <div className="inspector-group">
            <PlaybackButtons placement="graph" groupLabel={t("monotonepartition_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({ready: traced, atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("monotonepartition_playback_note")}</p>
            <p className="inspector-help" data-monotone-partition="order-rule">{t("monotonepartition_order_rule")}</p>
        </div>
        <div className="inspector-group">
            <ExampleSelect label={t("monotonepartition_example_group")} current={exampleId} onChoose={actions.loadExample}
                           options={[{id: "example-1", text: t("monotonepartition_example_1")}, {id: "example-2", text: t("monotonepartition_example_2")}]}/>
        </div>
        <div className="inspector-group" data-monotone-partition-status="">
            <div data-declared-panel="">
            {refusal && <p data-readout-note className="inspector-help" role="alert" data-monotone-partition="refusal">{refusal}</p>}
            {traced && <>
                {run.reversed && <p data-readout-note className="inspector-help" data-monotone-partition="reversed">{text("reversed")}</p>}
                <StepCounter step={step} length={run.length} hooks={{"data-monotone-partition": "step", "data-readout-note": ""}}/>
                {noteLine && <p data-readout-note className="inspector-help" data-monotone-partition="note">{noteLine}</p>}
                {text("vertex") && <>
                    <p data-readout-note className="inspector-help" data-monotone-partition="vertex">{text("vertex")}</p>
                    <p data-readout-note className="inspector-help" data-monotone-partition="reason">{text("reason")}</p>
                </>}
                <p data-readout-note className="inspector-help" data-monotone-partition="diagonals">{text("diagonals")}</p>
                {summary && <p data-readout-note className="inspector-help" data-monotone-partition="summary">{summary}</p>}
                {text("type-counts") && <p data-readout-note className="inspector-help" data-monotone-partition="type-counts">{text("type-counts")}</p>}
                {text("balance") && <p data-readout-note className="inspector-help" data-monotone-partition="balance">{text("balance")}</p>}
            </>}
            </div>
            {traced && <>
                <LiveReadout readout={liveReadout} muted={playing} dataAttribute="monotone-partition-live"/>
                {children && <div data-monotone-partition-lists="">{children}</div>}
            </>}
        </div>
    </>;
}

export interface MonotonePartitionListsProps {
    run: PartitionRun;
    step: number;
}

/**
 * The event queue (vertices still to be processed, in processing order) and the status (the edges crossing the sweep
 * line from left to right, each with its helper) of the sweep (item 3, C-7). The head of the queue is the next vertex;
 * the status edges of the current vertex are marked as the board emphasises them.
 */
export function MonotonePartitionLists(props: MonotonePartitionListsProps) {
    const t = useT();
    const {run, step} = props;
    const view = run.view(step);
    const queue: SweepQueueEntry[] = view.queue.map((v, k) => ({
        key: String(v), id: vertexName(v), label: t("monotonepartition_queue_item", {value0: vertexName(v)}), content: vertexName(v), next: k === 0,
    }));
    const status: SweepStatusEntry[] = view.status.map(edge => {
        const helper = view.helpers.get(edge);
        const label = helper === undefined ? edgeName(edge) : t("monotonepartition_status_item", {value0: edgeName(edge), value1: vertexName(helper)});
        return {key: String(edge), id: edgeName(edge), label, current: view.current.has(edge), hovered: false};
    });
    return <SweepSideLists prefix="monotone-partition" queue={queue} status={status} onHover={() => undefined} text={{
        queueLabel: t("monotonepartition_queue_label"), queueEmpty: t("monotonepartition_queue_empty"), queueNext: t("monotonepartition_queue_next"),
        statusLabel: t("monotonepartition_status_label"), statusEmpty: t("monotonepartition_status_empty"), statusCurrent: t("monotonepartition_status_current"),
    }}/>;
}
