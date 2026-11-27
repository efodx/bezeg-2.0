import React from "react";
import {renderMessage, useLanguage, useT} from "../../localization";
import type {BentleyOttmannRun} from "./bentleyOttmannRun";
import {segmentName} from "./bentleyOttmannRun";
import {bentleyOttmannNotes, pointText, type BentleyOttmannNoteId} from "./bentleyOttmannNotes";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";

export {coordinateText, exponentScale, namesText, pointText} from "./bentleyOttmannNotes";

export interface BentleyOttmannControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface BentleyOttmannControlsProps {
    run: BentleyOttmannRun;
    step: number;
    playing: boolean;
    /** The grid step exponent: grid values are shown as board values, 2^exponent times the grid value, still exactly. */
    exponent: number;
    actions: BentleyOttmannControlActions;
    /**
     * The side lists (event queue and status): rendered inside the status group, below the readouts, in a container
     * with `data-bentley-ottmann-lists`.
     */
    children?: React.ReactNode;
}

/**
 * Next step / Play / Pause / Reset and the readouts of the Bentley-Ottmann sweep (spec C2): step, note, sweep line height, status
 * size, the intersection points so far with their segments and exact coordinates, the neighbour tests so far against all pairs
 * and, once done, the event count. A refused input shows its message instead of the readouts. An unavailable button stays
 * focusable (`aria-disabled`).
 */
export function BentleyOttmannControls(props: BentleyOttmannControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {run, step, playing, exponent, actions, children} = props;
    const notes = bentleyOttmannNotes(run, step, exponent, language);
    const text = (id: BentleyOttmannNoteId) => {
        const note = notes.find(candidate => candidate.id === id);
        return note ? renderMessage(note.text) : undefined;
    };
    const refusal = text("refusal");
    const atEnd = step >= run.length - 1;
    const n = run.segments.length;
    const stepText = stepCounterText(t, step, run.length);
    const noteLine = text("note");
    const summary = text("summary");
    const crossingNotes = notes.filter(note => note.id.startsWith("crossing-"));
    const announcement = refusal || n === 0 ? "" : [stepText, noteLine, summary].filter(Boolean).join(". ");
    const liveReadout = useStatusReadout(announcement, true);
    return <>
        <div className="inspector-group">
            <PlaybackButtons placement="graph" groupLabel={t("bentleyottmann_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("bentleyottmann_playback_note")}</p>
            <p className="inspector-help" data-bentley-ottmann="order-rule">{t("bentleyottmann_order_rule")}</p>
        </div>
        <div className="inspector-group" data-bentley-ottmann-status="">
            <div data-declared-panel="">
                {refusal && <p data-readout-note className="inspector-help" role="alert" data-bentley-ottmann="refusal">{refusal}</p>}
                {!refusal && n === 0 && <p data-readout-note className="inspector-help" data-bentley-ottmann="empty">{text("empty")}</p>}
                {!refusal && n > 0 && <>
                    <StepCounter step={step} length={run.length} hooks={{"data-bentley-ottmann": "step", "data-readout-note": ""}}/>
                    {noteLine && <p data-readout-note className="inspector-help" data-bentley-ottmann="note">{noteLine}</p>}
                    {text("position") && <p data-readout-note className="inspector-help" data-bentley-ottmann="position">{text("position")}</p>}
                    <p data-readout-note className="inspector-help" data-bentley-ottmann="status-count">{text("status-count")}</p>
                    <p data-readout-note className="inspector-help" data-bentley-ottmann="tests">{text("tests")}</p>
                    {summary && <p data-readout-note className="inspector-help" data-bentley-ottmann="summary">{summary}</p>}
                    <p data-readout-note className="inspector-help" data-bentley-ottmann="crossings">{text("crossings")}</p>
                    {crossingNotes.length > 0 && <ul className="sweep-side-list" aria-label={text("crossings")}>
                        {crossingNotes.map(note => <li data-readout-note key={note.id} data-bentley-ottmann="crossing">{renderMessage(note.text)}</li>)}
                    </ul>}
                </>}
            </div>
            {!refusal && n > 0 && children && <div data-bentley-ottmann-lists="">{children}</div>}
        </div>
        {/* Silent while Play runs (a tick every 400 ms would flood a screen reader); announces once on Pause or at the end. */}
        <LiveReadout readout={liveReadout} muted={playing} dataAttribute="bentley-ottmann-live"/>
    </>;
}

export interface BentleyOttmannListsProps {
    run: BentleyOttmannRun;
    step: number;
    exponent: number;
    /** The segment whose status entry is hovered or focused, if any (the graph highlights it on the board). */
    hovered: number | undefined;
    onHover(segment: number | undefined): void;
}

/**
 * The event queue (events still to be popped: kind and exact position) and the status (segments from left to right, by name)
 * of the segment sweep (task 09 item 3, C-7). The head of the queue is the next event; the status entries of the current
 * event's segments (all of them at a crossing) are marked as the board emphasises them. Hovering or focusing a status entry
 * highlights its segment on the board.
 */
export function BentleyOttmannLists(props: BentleyOttmannListsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {run, step, exponent, hovered, onHover} = props;
    const view = run.view(step);
    const involved = new Set([...view.current.starts, ...view.current.ends, ...view.current.passes]);
    const queue: SweepQueueEntry[] = view.queue.map((event, k) => {
        const where = pointText(event.position, exponent, language);
        const label = event.kind === "upper" ? t("bentleyottmann_queue_upper", {value0: where})
            : event.kind === "lower" ? t("bentleyottmann_queue_lower", {value0: where})
            : event.kind === "endpoint" ? t("bentleyottmann_queue_endpoint", {value0: where})
            : t("bentleyottmann_queue_crossing", {value0: where});
        return {key: String(event.id), id: event.kind, label, next: k === 0};
    });
    const status: SweepStatusEntry[] = view.status.map(k => ({
        key: String(k), id: segmentName(k), label: t("bentleyottmann_status_item", {value0: segmentName(k)}), content: segmentName(k),
        current: involved.has(k), hovered: hovered === k,
    }));
    const onEntryHover = (id: string | undefined) => onHover(id === undefined ? undefined : view.status.find(k => segmentName(k) === id));
    return <SweepSideLists prefix="bentley-ottmann" queue={queue} status={status} onHover={onEntryHover} text={{
        queueLabel: t("bentleyottmann_queue_label"), queueEmpty: t("bentleyottmann_queue_empty"), queueNext: t("bentleyottmann_queue_next"),
        statusLabel: t("bentleyottmann_status_label"), statusEmpty: t("bentleyottmann_status_empty"), statusCurrent: t("bentleyottmann_status_current"),
    }}/>;
}
