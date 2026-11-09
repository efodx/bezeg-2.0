import React from "react";
import {formatDegrees, type NumberLanguage} from "../../analysis/format";
import {useLanguage, useT} from "../../localization";
import type {LawsonNote} from "../../compgeo/delaunay";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutList} from "../base/controls/ReadoutParts";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "../base/controls/useStatusReadout";

/** The named examples, in the order of the chooser. */
export type DelaunayExampleId = "quad" | "seven" | "square";

export interface DelaunayControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: DelaunayExampleId): void;
    /** Selects the triangle at `index` of the status list, or clears the selection (undefined). */
    selectTriangle(index: number | undefined): void;
}

/** The selected triangle: its corners and, across each interior edge, the neighbour's opposite vertex with the exact determinant (0-based indices). */
export interface DelaunaySelection {
    corners: readonly [number, number, number];
    neighbours: readonly {edge: readonly [number, number]; vertex: number; value: string; sign: -1 | 0 | 1}[];
    hullCount: number;
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
    /** The triangles of the shown triangulation (0-based corners) and the selected one, if any. */
    triangles: readonly (readonly [number, number, number])[];
    selectedIndex?: number;
    selection?: DelaunaySelection;
}

export interface DelaunayControlsProps {
    /** Undefined while the points allow no triangulation. */
    status: DelaunayStatus | undefined;
    playing: boolean;
    /** The example the points are now, or undefined for a custom set. */
    exampleId: DelaunayExampleId | undefined;
    actions: DelaunayControlActions;
}

type Translate = ReturnType<typeof useT>;

/** How many angles are listed in full: the six angles of a four-point quadrilateral. */
const FULL_ANGLES = 6;

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

function circleSignText(t: Translate, sign: -1 | 0 | 1): string {
    switch (sign) {
        case 1: return t("del_tri_sign_inside");
        case 0: return t("del_tri_sign_on");
        case -1: return t("del_tri_sign_outside");
    }
}

/** The corner numbers of a triangle in ascending order, so that its name does not depend on the stored rotation. */
const triple = (corners: readonly number[]) => {
    const [a, b, c] = [...corners].sort((x, y) => x - y);
    return {value0: a + 1, value1: b + 1, value2: c + 1};
};

function angleLine(t: Translate, language: NumberLanguage, angles: readonly number[], whole: "del_angles_now" | "del_angles_start"): string {
    const list = (items: readonly number[]) => items.map(angle => formatDegrees(angle, language)).join("; ");
    if (angles.length <= FULL_ANGLES) return t(whole, {value0: list(angles)});
    return t("del_angles_truncated", {value0: FULL_ANGLES, value1: angles.length, value2: list(angles.slice(0, FULL_ANGLES))});
}

/** Examples, Next step / Play / Pause / Reset and the readouts of the Lawson trace. Unavailable buttons stay focusable (`aria-disabled`). */
export function DelaunayControls(props: DelaunayControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {status, playing, exampleId, actions} = props;
    const traced = status !== undefined;
    const atEnd = traced && status.step >= status.length - 1;
    const stepText = traced ? stepCounterText(t, status.step, status.length) : undefined;
    const noteSentence = traced ? noteText(t, status.note) : undefined;
    const detail = status?.test
        ? t("del_detail_edge", {value0: status.test.edge[0] + 1, value1: status.test.edge[1] + 1, value2: status.test.apexes[0] + 1, value3: status.test.apexes[1] + 1})
        : undefined;
    const incircle = status?.test
        ? t("del_incircle_value", {value0: status.test.value, value1: signText(t, status.test.sign)})
        : undefined;
    const doneText = status?.done ? t("del_result_done") : undefined;
    const cocircularText = status?.done?.cocircular ? t("del_result_cocircular") : undefined;
    const selection = status?.selection;
    const selectedText = selection
        ? t("del_tri_selected", triple(selection.corners))
        : undefined;
    const neighbourTexts = selection?.neighbours.map(n => t("del_tri_neighbour", {
        value0: n.edge[0] + 1, value1: n.edge[1] + 1, value2: n.vertex + 1, value3: n.value, value4: circleSignText(t, n.sign),
    })) ?? [];
    const hullText = selection && selection.hullCount > 0 ? t("del_tri_hull", {value0: selection.hullCount}) : undefined;
    // Silent while Play runs (the region's mute); announces the status once on Pause or at the end.
    const liveReadout = useStatusReadout(status ? [stepText, noteSentence, detail, incircle, doneText, cocircularText, selectedText, ...neighbourTexts, hullText].filter(Boolean).join(". ") : "");
    return <>
        <div className="inspector-group">
            <ExampleSelect label={t("del_example_group")} current={exampleId} onChoose={actions.loadExample} options={[
                {id: "quad", text: t("del_example_quad")}, {id: "seven", text: t("del_example_seven")}, {id: "square", text: t("del_example_square")}]}/>
        </div>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("del_controls_label")} nextLabel={t("hulltrace_next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({ready: traced, atStart: traced && status.step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("del_playback_note")}</p>
        </div>
        {status && <div className="inspector-group" data-delaunay-status="">
            <StepCounter step={status.step} length={status.length} hooks={{"data-delaunay": "step"}}/>
            <p className="inspector-help" data-delaunay="note">{noteSentence}</p>
            {detail && <p className="inspector-help" data-delaunay="detail">{detail}</p>}
            {incircle && <p className="inspector-help" data-delaunay="incircle">{incircle}</p>}
            <ReadoutList label={t("del_readout_label")} hooks={{"data-delaunay": "readout"}} rows={[
                {id: "flips", value: t("del_flips", {value0: status.flips})},
                {id: "illegal", value: t("del_illegal_count", {value0: status.illegalCount})},
                {id: "min-now", value: t("del_min_now", {value0: formatDegrees(status.minNow, language)})},
                {id: "min-start", value: t("del_min_start", {value0: formatDegrees(status.minStart, language)})},
                {id: "angles-now", value: angleLine(t, language, status.anglesNow, "del_angles_now")},
                {id: "angles-start", value: angleLine(t, language, status.anglesStart, "del_angles_start")},
            ]}/>
            <div className="inspector-playback" role="group" aria-label={t("del_tri_list_label")} data-delaunay="triangles">
                {status.triangles.map((corners, index) => (
                    <button type="button" key={corners.join("-")} data-triangle={index} aria-pressed={status.selectedIndex === index}
                            onClick={() => actions.selectTriangle(status.selectedIndex === index ? undefined : index)}>
                        {t("del_tri_item", triple(corners))}</button>
                ))}
                <button type="button" data-action="clear-triangle" aria-disabled={selection === undefined}
                        onClick={() => { if (selection) actions.selectTriangle(undefined); }}>{t("del_tri_clear")}</button>
            </div>
            {selectedText && <p className="inspector-help" data-delaunay="selected-triangle">{selectedText}</p>}
            {neighbourTexts.length > 0 && <ul aria-label={t("del_tri_neighbours_label")} data-delaunay="neighbours">
                {neighbourTexts.map((text, index) => <li key={index} data-neighbour={index}>{text}</li>)}
            </ul>}            {hullText && <p className="inspector-help" data-delaunay="hull-edges">{hullText}</p>}
            {doneText && <p className="inspector-help" data-delaunay="done">{doneText}</p>}
            {cocircularText && <p className="inspector-help" data-delaunay="cocircular">{cocircularText}</p>}
            <LiveReadout readout={liveReadout} muted={playing} dataAttribute="delaunay-live"/>
        </div>}
    </>;
}
