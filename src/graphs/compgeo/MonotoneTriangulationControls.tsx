import React from "react";
import {useT} from "../../localization";
import type {Chain} from "../../compgeo/sweep/monotoneTriangulation";
import {
    MonotonePartitionLists, noteText as partitionNoteText, reasonText, refusalText, type Translate, vertexTypeText,
} from "./MonotonePartitionControls";
import {vertexName} from "./monotonePartitionRun";
import type {TriangulationEventInfo, TriangulationRun} from "./monotoneTriangulationRun";
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

function testOutcomeText(t: Translate, outcome: "visible" | "blocked"): string {
    return outcome === "visible" ? t("monotonetri_test_inside") : t("monotonetri_test_outside");
}

function noteText(t: Translate, event: TriangulationEventInfo, run: TriangulationRun): string {
    switch (event.note) {
        case "pop": return t("monotonetri_note_pop", {value0: vertexName(event.vertex ?? 0), value1: chainText(t, event.chain ?? "left")});
        case "push": return t("monotonetri_note_push", {value0: vertexName(event.vertex ?? 0), value1: event.stackSize ?? 0});
        case "unstack": return t("monotonetri_note_unstack", {value0: vertexName(event.vertex ?? 0), value1: event.stackSize ?? 0});
        case "test": {
            const test = event.test;
            const a = vertexName(test?.a ?? 0);
            const b = vertexName(test?.b ?? 0);
            return test?.outcome === "blocked"
                ? t("monotonetri_note_blocked", {value0: a, value1: b})
                : t("monotonetri_note_visible", {value0: a, value1: b});
        }
        case "diagonal": {
            const [a, b] = event.diagonal ?? [0, 0];
            return t("monotonepartition_note_diagonal", {value0: vertexName(a), value1: vertexName(b)});
        }
        case "done": return t("monotonetri_note_done", {value0: run.triangles.length});
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
    const refusal = refusalText(t, run);
    const traced = refusal === undefined && run.length > 0;
    const atEnd = step >= run.length - 1;
    const piece = run.pieceAt(step);
    const tri = piece === null ? undefined : run.triangulationView(step);
    const triEvent = piece === null ? undefined : run.triangulationEvent(step);
    const partitionView = run.view(step);
    const partitionEvent = run.event(step);
    const stepText = stepCounterText(t, step, run.length);
    const phaseText = piece === null
        ? t("monotonetri_phase_partition")
        : t("monotonetri_phase_triangulation", {value0: piece + 1, value1: run.pieceCount});
    let noteLine: string | undefined;
    if (tri && triEvent) noteLine = noteText(t, triEvent, run);
    else if (partitionEvent) noteLine = partitionNoteText(t, partitionEvent, run, partitionView.type);
    const pastPartition = step >= run.boundary;
    const monotoneNote = run.alreadyMonotone && pastPartition ? t("monotonetri_already_monotone") : undefined;
    const diagonalList = (diagonals: readonly (readonly [number, number])[]) => diagonals.map(([a, b]) => `${vertexName(a)}–${vertexName(b)}`).join(", ");
    const partitionDiagonals = piece === null ? partitionView.diagonals : undefined;
    const triDiagonals = tri ? [...tri.earlierDiagonals, ...tri.diagonals] : undefined;
    const triangleLine = tri
        ? (tri.done
            ? t("monotonetri_triangles_total", {value0: run.triangles.length, value1: run.vertices.length})
            : t("monotonetri_triangles_so_far", {value0: tri.triangles.length}))
        : undefined;
    const counts = tri?.done ? run.counts : null;
    // Silent while Play runs (the region's mute); announces once on Pause or at the end.
    const liveReadout = useStatusReadout(traced ? [stepText, phaseText, noteLine, triangleLine].filter(Boolean).join(". ") : "", true);
    return <>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("monotonetri_controls_label")} nextLabel={t("next_step")} playing={playing}
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
            {refusal && <p className="inspector-help" role="alert" data-monotone-triangulation="refusal">{refusal}</p>}
            {traced && <>
                {run.reversed && <p className="inspector-help" data-monotone-triangulation="reversed">{t("monotonepartition_reversed_note")}</p>}
                <StepCounter step={step} length={run.length} hooks={{"data-monotone-triangulation": "step"}}/>
                <p className="inspector-help" data-monotone-triangulation="phase">{phaseText}</p>
                {noteLine && <p className="inspector-help" data-monotone-triangulation="note">{noteLine}</p>}
                {piece === null && partitionView.vertex !== null && partitionView.type !== null && <>
                    <p className="inspector-help" data-monotone-triangulation="vertex">
                        {t("monotonepartition_vertex", {value0: vertexName(partitionView.vertex), value1: vertexTypeText(t, partitionView.type)})}</p>
                    <p className="inspector-help" data-monotone-triangulation="reason">{reasonText(t, partitionView.type)}</p>
                </>}
                {partitionDiagonals && <p className="inspector-help" data-monotone-triangulation="diagonals">
                    {partitionDiagonals.length > 0
                        ? t("monotonepartition_diagonals", {value0: partitionDiagonals.length, value1: diagonalList(partitionDiagonals)})
                        : t("monotonepartition_diagonals_none")}</p>}
                {monotoneNote && <p className="inspector-help" data-monotone-triangulation="already-monotone">{monotoneNote}</p>}
                {tri && piece !== null && <>
                    <p className="inspector-help" data-monotone-triangulation="piece">
                        {t("monotonetri_piece_info", {value0: piece + 1, value1: run.pieceSize(piece), value2: run.pieceSize(piece) - 2})}</p>
                    {tri.vertex !== null && tri.chain !== null && <p className="inspector-help" data-monotone-triangulation="vertex">
                        {t("monotonetri_vertex_item", {value0: vertexName(tri.vertex), value1: chainText(t, tri.chain)})}</p>}
                    {tri.test && <p className="inspector-help" data-monotone-triangulation="test">
                        {t("monotonetri_test_readout", {value0: vertexName(tri.test.a), value1: vertexName(tri.test.b), value2: testOutcomeText(t, tri.test.outcome)})}</p>}
                    {triDiagonals && <p className="inspector-help" data-monotone-triangulation="diagonals">
                        {triDiagonals.length > 0
                            ? t("monotonepartition_diagonals", {value0: triDiagonals.length, value1: diagonalList(triDiagonals)})
                            : t("monotonepartition_diagonals_none")}</p>}
                    {triangleLine && <p className="inspector-help" data-monotone-triangulation="triangles">{triangleLine}</p>}
                </>}
                {counts && <div data-monotone-triangulation="comparison" role="group" aria-label={t("monotonetri_comparison_label")}>
                    <p className="inspector-help" data-monotone-triangulation="comparison-monotone">{t("monotonetri_comparison_monotone", {value0: counts.monotone})}</p>
                    <p className="inspector-help" data-monotone-triangulation="comparison-ear">{t("monotonetri_comparison_ear", {value0: counts.earClipping})}</p>
                    <p className="inspector-help" data-monotone-triangulation="comparison-growth">{t("monotonetri_comparison_growth")}</p>
                    <p className="inspector-help" data-monotone-triangulation="comparison-note">{t("monotonetri_comparison_note")}</p>
                </div>}
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
