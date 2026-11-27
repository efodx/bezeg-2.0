import React from "react";
import {renderMessage, useT} from "../../localization";
import type {Chain} from "../../compgeo/sweep/monotoneTriangulation";
import {MonotonePartitionLists, type Translate} from "./MonotonePartitionControls";
import {monotoneTriangulationNotes, type MonotoneTriangulationNoteId} from "./monotoneTriangulationNotes";
import {vertexName} from "./monotonePartitionRun";
import type {TriangulationRun} from "./monotoneTriangulationRun";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";

/** The named examples, in the order of the chooser. */
export type MonotoneTriangulationExampleId = "example-1" | "example-2" | "example-3";

export interface MonotoneTriangulationControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: MonotoneTriangulationExampleId): void;
}

export interface MonotoneTriangulationControlsProps {
    run: TriangulationRun;
    step: number;
    playing: boolean;
    /** The example the polygon is now, or undefined for a custom polygon. */
    exampleId: MonotoneTriangulationExampleId | undefined;
    actions: MonotoneTriangulationControlActions;
    /** The side lists: rendered inside the status group, below the readouts. */
    children?: React.ReactNode;
}

/** The text of a chain: "left chain", "right chain", "top vertex", "bottom vertex". */
export function chainText(t: Translate, chain: Chain): string {
    switch (chain) {
        case "top": return t("monotonetri_chain_top");
        case "left": return t("monotonetri_chain_left");
        case "right": return t("monotonetri_chain_right");
        case "bottom": return t("monotonetri_chain_bottom");
    }
}

/**
 * Next step / Play / Pause / Reset, the examples and the readouts of the monotone triangulation (spec C4, task 17): step
 * i of N and the phase, the event, then in the partition phase what task 16 shows, in the triangulation phase the piece,
 * the vertex with its chain, the current test with its outcome, the diagonals and the triangles so far, and, once done, the
 * n - 2 count and the comparison with ear clipping. Every number comes from the kernel result through the run.
 */
export function MonotoneTriangulationControls(props: MonotoneTriangulationControlsProps) {
    const t = useT();
    const {run, step, playing, exampleId, actions, children} = props;
    const notes = monotoneTriangulationNotes(run, step);
    const text = (id: MonotoneTriangulationNoteId) => {
        const note = notes.find(candidate => candidate.id === id);
        return note ? renderMessage(note.text) : undefined;
    };
    const refusal = text("refusal");
    const traced = refusal === undefined && run.length > 0;
    const atEnd = step >= run.length - 1;
    const stepText = stepCounterText(t, step, run.length);
    const phaseText = text("phase");
    const noteLine = text("note");
    const triangleLine = text("triangles");
    // Silent while Play runs (the region's mute); announces once on Pause or at the end.
    const liveReadout = useStatusReadout(traced ? [stepText, phaseText, noteLine, triangleLine].filter(Boolean).join(". ") : "", true);
    const sentence = (id: MonotoneTriangulationNoteId, hook: string = id) => {
        const line = text(id);
        return line === undefined ? null : <p data-readout-note className="inspector-help" data-monotone-triangulation={hook}>{line}</p>;
    };
    return <>
        <div className="inspector-group">
            <PlaybackButtons placement="graph" groupLabel={t("monotonetri_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({ready: traced, atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("monotonetri_playback_note")}</p>
            <p className="inspector-help" data-monotone-triangulation="order-rule">{t("monotonepartition_order_rule")}</p>
        </div>
        <div className="inspector-group">
            <ExampleSelect label={t("monotonepartition_example_group")} current={exampleId} onChoose={actions.loadExample} options={[
                {id: "example-1", text: t("monotonetri_example_1")}, {id: "example-2", text: t("monotonetri_example_2")},
                {id: "example-3", text: t("monotonetri_example_3")}]}/>
        </div>
        <div className="inspector-group" data-monotone-triangulation-status="">
            <div data-declared-panel="">
            {refusal && <p data-readout-note className="inspector-help" role="alert" data-monotone-triangulation="refusal">{refusal}</p>}
            {traced && <>
                {sentence("reversed")}
                <StepCounter step={step} length={run.length} hooks={{"data-monotone-triangulation": "step", "data-readout-note": ""}}/>
                {sentence("phase")}
                {sentence("note")}
                {sentence("vertex")}
                {sentence("reason")}
                {sentence("diagonals")}
                {sentence("already-monotone")}
                {sentence("piece")}
                {sentence("chain-vertex", "vertex")}
                {sentence("test")}
                {sentence("triangle-diagonals", "diagonals")}
                {sentence("triangles")}
                {text("comparison-monotone") && <div data-monotone-triangulation="comparison" role="group" aria-label={t("monotonetri_comparison_label")}>
                    {sentence("comparison-monotone")}
                    {sentence("comparison-ear")}
                    {sentence("comparison-growth")}
                    {sentence("comparison-note")}
                </div>}
            </>}
            </div>
            {traced && <>
                <LiveReadout readout={liveReadout} muted={playing} dataAttribute="monotone-triangulation-live"/>
                {children && <div data-monotone-triangulation-lists="">{children}</div>}
            </>}
        </div>
    </>;
}

export interface MonotoneTriangulationListsProps {
    run: TriangulationRun;
    step: number;
}

/**
 * The side lists. In the partition phase those of task 16 (event queue and status). In the triangulation phase the
 * piece's vertices from top to bottom with their chain (the current vertex marked, `aria-current="step"`) and the
 * stack from bottom to top (the current vertex and the vertex under test marked, `aria-current="true"`).
 */
export function MonotoneTriangulationLists(props: MonotoneTriangulationListsProps) {
    const t = useT();
    const {run, step} = props;
    const tri = run.pieceAt(step) === null ? undefined : run.triangulationView(step);
    if (!tri) return <MonotonePartitionLists run={run} step={step}/>;
    const vertices: SweepQueueEntry[] = tri.order.map((v, k) => ({
        key: String(v), id: vertexName(v), next: v === tri.vertex,
        label: t("monotonetri_vertex_item", {value0: vertexName(v), value1: chainText(t, tri.chains[k])}),
    }));
    const chainOf = new Map(tri.order.map((v, k) => [v, tri.chains[k]]));
    const marked = new Set<number>([...(tri.vertex === null ? [] : [tri.vertex]), ...(tri.test ? [tri.test.b] : [])]);
    const stack: SweepStatusEntry[] = tri.stack.map(v => ({
        key: String(v), id: vertexName(v), current: marked.has(v), hovered: false,
        label: t("monotonetri_vertex_item", {value0: vertexName(v), value1: chainText(t, chainOf.get(v) ?? "left")}),
    }));
    return <SweepSideLists prefix="monotone-triangulation" queue={vertices} status={stack} onHover={() => undefined} text={{
        queueLabel: t("monotonetri_vertices_label"), queueEmpty: t("monotonetri_vertices_empty"), queueNext: t("monotonetri_vertices_current"),
        statusLabel: t("monotonetri_stack_label"), statusEmpty: t("monotonetri_stack_empty"), statusCurrent: t("monotonetri_stack_current"),
    }}/>;
}
