import React from "react";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {intervalLetter} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_INTERVALS} from "../../compgeo/sweep/limits";
import type {IntervalPair} from "../../compgeo/sweep/intervalSweep";
import type {IntervalEventInfo, IntervalRun, IntervalView} from "./intervalSweepRun";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";

export interface IntervalSweepControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface IntervalSweepControlsProps {
    run: IntervalRun;
    step: number;
    playing: boolean;
    /** 2^gridStepExponent: grid x values are shown as board values. */
    scale: number;
    actions: IntervalSweepControlActions;
    /**
     * Seam for the side lists (event queue and status, task 08 item 3): rendered inside the status group, below the readouts,
     * in a container with `data-interval-sweep-lists`. Absent until the lists exist.
     */
    children?: React.ReactNode;
}

type Translate = ReturnType<typeof useT>;

const pairText = (pair: IntervalPair) => intervalLetter(pair[0]) + intervalLetter(pair[1]);

function refusalText(t: Translate, run: IntervalRun): string | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    const letter = intervalLetter(refusal.index ?? 0);
    switch (refusal.reason) {
        case "too-many": return t("intervalsweep_refused_too_many", {value0: SWEEP_MAX_INTERVALS});
        case "inverted": return t("intervalsweep_refused_inverted", {value0: letter});
        case "not-grid":
        case "not-a-point": return t("intervalsweep_refused_not_grid", {value0: letter});
        case "out-of-range": return t("intervalsweep_refused_out_of_range", {value0: letter, value1: SWEEP_COORD_LIMIT});
    }
}

function noteText(t: Translate, event: IntervalEventInfo, view: IntervalView, num: (value: number) => string): string {
    const letter = event.interval === undefined ? "" : intervalLetter(event.interval);
    switch (event.note) {
        case "pop": return event.entering
            ? t("intervalsweep_note_pop_enter", {value0: num(event.x ?? 0), value1: letter})
            : t("intervalsweep_note_pop_leave", {value0: num(event.x ?? 0), value1: letter});
        case "enter": return t("intervalsweep_note_enter", {value0: letter, value1: view.open.length});
        case "leave": return t("intervalsweep_note_leave", {value0: letter, value1: view.open.length});
        case "report": {
            const pair = event.pair ? pairText(event.pair) : "";
            return event.touching ? t("intervalsweep_note_report_touch", {value0: pair}) : t("intervalsweep_note_report_overlap", {value0: pair});
        }
        case "done": return t("intervalsweep_note_done");
    }
}

/**
 * Next step / Play / Pause / Reset and the readouts of the interval sweep: step, note, open count, open counts so far, maximum
 * (with its range once done), reported pairs, the comparison with testing all pairs (once done) and the tie rule. A refused
 * input shows its message instead of the readouts. An unavailable button stays focusable (`aria-disabled`).
 */
export function IntervalSweepControls(props: IntervalSweepControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {run, step, playing, scale, actions, children} = props;
    const refusal = refusalText(t, run);
    const atEnd = step >= run.length - 1;
    const num = (value: number) => formatNumber(value * scale, language, 4);
    const event = run.event(step);
    const view = run.view(step);
    const n = run.intervals.length;
    const stepText = stepCounterText(t, step, run.length);
    const noteLine = event ? noteText(t, event, view, num) : undefined;
    const maxText = view.done
        ? t("intervalsweep_max_final", {value0: run.maxOpen, value1: run.maxStart === null ? "?" : num(run.maxStart), value2: run.maxEnd === null ? "?" : num(run.maxEnd)})
        : t("intervalsweep_max_so_far", {value0: view.maxSoFar});
    const pairsText = view.pairs.length
        ? t("intervalsweep_pairs", {value0: view.pairs.length, value1: view.pairs.map(pairText).join(", ")})
        : t("intervalsweep_pairs_none");
    const comparison = view.done ? t("intervalsweep_comparison", {value0: view.pairs.length, value1: (n * (n - 1)) / 2}) : undefined;
    const announcement = refusal || n === 0 ? "" : [stepText, noteLine, comparison].filter(Boolean).join(". ");
    const liveReadout = useStatusReadout(announcement);
    return <>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("intervalsweep_controls_label")} nextLabel={t("intervalsweep_next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("intervalsweep_playback_note")}</p>
            <p className="inspector-help" data-interval-sweep="tie-rule">{t("intervalsweep_tie_rule")}</p>
        </div>
        <div className="inspector-group" data-interval-sweep-status="">
            {refusal && <p className="inspector-help" role="alert" data-interval-sweep="refusal">{refusal}</p>}
            {!refusal && n === 0 && <p className="inspector-help" data-interval-sweep="empty">{t("intervalsweep_no_intervals")}</p>}
            {!refusal && n > 0 && <>
                <StepCounter step={step} length={run.length} hooks={{"data-interval-sweep": "step"}}/>
                {noteLine && <p className="inspector-help" data-interval-sweep="note">{noteLine}</p>}
                <p className="inspector-help" data-interval-sweep="open">{t("intervalsweep_open_count", {value0: view.open.length})}</p>
                <p className="inspector-help" data-interval-sweep="counts">{t("intervalsweep_counts", {value0: view.counts.join(", ")})}</p>
                <p className="inspector-help" data-interval-sweep="max">{maxText}</p>
                <p className="inspector-help" data-interval-sweep="pairs">{pairsText}</p>
                {comparison && <p className="inspector-help" data-interval-sweep="comparison">{comparison}</p>}
                {children && <div data-interval-sweep-lists="">{children}</div>}
            </>}
        </div>
        {/* Silent while Play runs (a tick every 400 ms would flood a screen reader); announces once on Pause or at the end. */}
        <LiveReadout readout={liveReadout} muted={playing} dataAttribute="interval-sweep-live"/>
    </>;
}

export interface IntervalSweepListsProps {
    run: IntervalRun;
    step: number;
    scale: number;
    /** The interval whose status entry is hovered or focused, if any (the graph highlights it on the board). */
    hovered: number | undefined;
    onHover(interval: number | undefined): void;
}

/**
 * The event queue (events still to be popped, written x with the interval letter and a + for entering, a - for leaving) and
 * the status (open intervals, in the kernel's letter order) of the sweep (task 08 item 3, C-7). The status entry of the current
 * event's interval is marked as the board marks it: thickest, here bold with a tint, a bar and a marker, `aria-current` and a
 * hidden text; the head of the queue (the next event) is marked the same way, so the mark is not colour alone. Hovering or focusing a status entry highlights its interval on the board.
 */
export function IntervalSweepLists(props: IntervalSweepListsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {run, step, scale, hovered, onHover} = props;
    const view = run.view(step);
    const num = (value: number) => formatNumber(value * scale, language, 4);
    const queue: SweepQueueEntry[] = view.queue.map((event, k) => {
        const letter = intervalLetter(event.interval);
        const label = event.entering
            ? t("intervalsweep_queue_enter", {value0: letter, value1: num(event.x)})
            : t("intervalsweep_queue_leave", {value0: letter, value1: num(event.x)});
        return {
            key: `${event.interval}-${event.entering}`, id: `${letter}${event.entering ? "+" : "-"}`, label,
            content: <span aria-hidden="true"><var>x</var><sub>{letter}</sub><sup>{event.entering ? "+" : "−"}</sup></span>,
            // The head of the queue is the next event to be popped (the queue lists only the remaining events).
            next: k === 0,
        };
    });
    const status: SweepStatusEntry[] = view.open.map(k => {
        const letter = intervalLetter(k);
        const {lo, hi} = run.intervals[k];
        return {
            key: String(k), id: letter, label: t("intervalsweep_status_item", {value0: letter, value1: num(lo), value2: num(hi)}),
            content: `${letter} [${num(lo)}, ${num(hi)}]`, current: k === view.current, hovered: hovered === k,
        };
    });
    const onEntryHover = (id: string | undefined) => {
        const k = id === undefined ? undefined : view.open.find(open => intervalLetter(open) === id);
        onHover(k);
    };
    return <SweepSideLists prefix="interval-sweep" queue={queue} status={status} onHover={onEntryHover} text={{
        queueLabel: t("intervalsweep_queue_label"), queueEmpty: t("intervalsweep_queue_empty"), queueNext: t("intervalsweep_queue_next"),
        statusLabel: t("intervalsweep_status_label"), statusEmpty: t("intervalsweep_status_empty"), statusCurrent: t("intervalsweep_status_current"),
    }}/>;
}
