import React from "react";
import {useT} from "../../localization";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_POLYGON_VERTICES} from "../../compgeo/sweep/limits";
import type {VertexType} from "../../compgeo/sweep/monotonePartition";
import {edgeName, type PartitionEventInfo, type PartitionRun, vertexName} from "./monotonePartitionRun";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";

export interface MonotonePartitionControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(index: 1 | 2): void;
}

export interface MonotonePartitionControlsProps {
    run: PartitionRun;
    step: number;
    playing: boolean;
    actions: MonotonePartitionControlActions;
    /** The side lists (event queue and status): rendered inside the status group, below the readouts. */
    children?: React.ReactNode;
}

type Translate = ReturnType<typeof useT>;

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
function reasonText(t: Translate, type: VertexType): string {
    switch (type) {
        case "start": return t("monotonepartition_reason_start");
        case "end": return t("monotonepartition_reason_end");
        case "split": return t("monotonepartition_reason_split");
        case "merge": return t("monotonepartition_reason_merge");
        case "regular": return t("monotonepartition_reason_regular");
    }
}

function refusalText(t: Translate, run: PartitionRun): string | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    const vertex = refusal.index === undefined ? "" : vertexName(refusal.index);
    switch (refusal.reason) {
        case "fewer-than-three": return t("monotonepartition_refused_fewer_than_three");
        case "too-many": return t("monotonepartition_refused_too_many", {value0: SWEEP_MAX_POLYGON_VERTICES});
        case "not-grid":
        case "not-a-point": return t("monotonepartition_refused_not_grid", {value0: vertex});
        case "out-of-range": return t("monotonepartition_refused_out_of_range", {value0: vertex, value1: SWEEP_COORD_LIMIT});
        case "not-simple": {
            const [a, b] = refusal.edges ?? [0, 0];
            return t("monotonepartition_refused_not_simple", {value0: edgeName(a), value1: edgeName(b)});
        }
        case "collinear-vertices": return t("monotonepartition_refused_collinear", {value0: vertex});
    }
}

function noteText(t: Translate, event: PartitionEventInfo, run: PartitionRun, type: VertexType | null): string {
    switch (event.note) {
        case "phase": return t("monotonepartition_note_phase");
        case "pop": return t("monotonepartition_note_pop", {value0: vertexName(event.vertex ?? 0), value1: type ? vertexTypeText(t, type) : ""});
        case "insert": return t("monotonepartition_note_insert", {value0: edgeName(event.edge ?? 0), value1: event.statusSize ?? 0});
        case "remove": return t("monotonepartition_note_remove", {value0: edgeName(event.edge ?? 0), value1: event.statusSize ?? 0});
        case "diagonal": {
            const [a, b] = event.diagonal ?? [0, 0];
            return t("monotonepartition_note_diagonal", {value0: vertexName(a), value1: vertexName(b)});
        }
        case "done": return t("monotonepartition_note_done", {value0: run.pieces.length});
    }
}

/**
 * Next step / Play / Pause / Reset, the examples and the readouts of the monotone partition sweep (spec C3): step i of N,
 * the note of the event, the current vertex with its type and the reason, the diagonals so far and, once done, the piece
 * count with the type counts. Every number comes from the kernel result through the run. A refused polygon shows its
 * message instead of the readouts. An unavailable button stays focusable (`aria-disabled`).
 */
export function MonotonePartitionControls(props: MonotonePartitionControlsProps) {
    const t = useT();
    const {run, step, playing, actions, children} = props;
    const refusal = refusalText(t, run);
    const traced = refusal === undefined && run.length > 0;
    const atEnd = step >= run.length - 1;
    const nextUnavailable = !traced || atEnd;
    const playUnavailable = !traced || (atEnd && !playing);
    const resetUnavailable = step === 0 && !playing;
    const view = run.view(step);
    const event = run.event(step);
    const stepText = t("monotonepartition_step_counter", {value0: step, value1: Math.max(run.length - 1, 0)});
    const noteLine = event ? noteText(t, event, run, view.type) : undefined;
    const diagonalNames = view.diagonals.map(([a, b]) => `${vertexName(a)}–${vertexName(b)}`).join(", ");
    const counts = run.typeCounts;
    const summary = view.done ? t("monotonepartition_summary", {value0: run.pieces.length, value1: run.diagonals.length}) : undefined;
    const typeCounts = view.done ? t("monotonepartition_type_counts", {
        value0: counts.start, value1: counts.end, value2: counts.split, value3: counts.merge, value4: counts.regular,
    }) : undefined;
    const balance = view.done ? t("monotonepartition_balance", {
        value0: counts.start, value1: counts.split, value2: counts.start + counts.split,
        value3: counts.end, value4: counts.merge, value5: counts.end + counts.merge,
    }) : undefined;
    return <>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("monotonepartition_controls_label")}>
                <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                        onClick={() => { if (!nextUnavailable) actions.nextStep(); }}>{t("monotonepartition_next_step")}</button>
                <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                        onClick={() => { if (!playUnavailable) actions.playPause(); }}>{playing ? t("pause") : t("play")}</button>
                <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                        onClick={() => { if (!resetUnavailable) actions.reset(); }}>{t("reset")}</button>
            </div>
            <p className="inspector-help">{t("monotonepartition_playback_note")}</p>
            <p className="inspector-help" data-monotone-partition="order-rule">{t("monotonepartition_order_rule")}</p>
        </div>
        <div className="inspector-group" role="group" aria-label={t("monotonepartition_example_group")}>
            <div className="inspector-playback">
                <button type="button" data-action="example-1" onClick={() => actions.loadExample(1)}>{t("monotonepartition_example_1")}</button>
                <button type="button" data-action="example-2" onClick={() => actions.loadExample(2)}>{t("monotonepartition_example_2")}</button>
            </div>
        </div>
        <div className="inspector-group" data-monotone-partition-status="">
            {refusal && <p className="inspector-help" role="alert" data-monotone-partition="refusal">{refusal}</p>}
            {traced && <>
                {run.reversed && <p className="inspector-help" data-monotone-partition="reversed">{t("monotonepartition_reversed_note")}</p>}
                <p className="inspector-help" data-monotone-partition="step">{stepText}</p>
                {noteLine && <p className="inspector-help" data-monotone-partition="note">{noteLine}</p>}
                {view.vertex !== null && view.type !== null && <>
                    <p className="inspector-help" data-monotone-partition="vertex">
                        {t("monotonepartition_vertex", {value0: vertexName(view.vertex), value1: vertexTypeText(t, view.type)})}</p>
                    <p className="inspector-help" data-monotone-partition="reason">{reasonText(t, view.type)}</p>
                </>}
                <p className="inspector-help" data-monotone-partition="diagonals">
                    {view.diagonals.length > 0
                        ? t("monotonepartition_diagonals", {value0: view.diagonals.length, value1: diagonalNames})
                        : t("monotonepartition_diagonals_none")}</p>
                {summary && <p className="inspector-help" data-monotone-partition="summary">{summary}</p>}
                {typeCounts && <p className="inspector-help" data-monotone-partition="type-counts">{typeCounts}</p>}
                {balance && <p className="inspector-help" data-monotone-partition="balance">{balance}</p>}
                {/* Silent while Play runs (a tick every 500 ms would flood a screen reader); announces once on Pause or at the end. */}
                <p className="visually-hidden" role="status" aria-live="polite" data-monotone-partition-live="">
                    {playing ? "" : [stepText, noteLine, summary].filter(Boolean).join(". ")}</p>
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
