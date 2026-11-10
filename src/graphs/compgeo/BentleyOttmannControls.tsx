import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {Rational, type RationalPoint} from "../../compgeo/rational";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from "../../compgeo/sweep/limits";
import {
    type BentleyOttmannEventInfo, type BentleyOttmannRun, type BentleyOttmannView, rationalText, segmentName,
} from "./bentleyOttmannRun";
import {SweepSideLists, type SweepQueueEntry, type SweepStatusEntry} from "./SweepSideLists";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";

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

type Translate = ReturnType<typeof useT>;

/** 2^exponent as an exact rational. */
export function exponentScale(exponent: number): Rational {
    return exponent >= 0 ? Rational.of(2 ** exponent) : Rational.of(1, 2 ** -exponent);
}

/** One coordinate as exact text: `3`, or `21/16 = 1,3125` (`≈` when the decimal is rounded). */
export function coordinateText(value: Rational, exponent: number, language: NumberLanguage): string {
    const text = rationalText(value.mul(exponentScale(exponent)), (v, decimals) => formatNumber(v, language, decimals));
    return text.integer ? text.fraction : `${text.fraction} ${text.exact ? "=" : "≈"} ${text.decimal}`;
}

/** A point as `(x; y)` with exact coordinates; the semicolon keeps a Slovenian decimal comma readable. */
export function pointText(point: RationalPoint, exponent: number, language: NumberLanguage): string {
    return `(${coordinateText(point.x, exponent, language)}; ${coordinateText(point.y, exponent, language)})`;
}

export const namesText = (indices: readonly number[]): string => indices.map(segmentName).join(", ");

function refusalText(t: Translate, run: BentleyOttmannRun): string | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    switch (refusal.reason) {
        case "too-many-segments": return t("bentleyottmann_refused_too_many", {value0: SWEEP_MAX_SEGMENTS});
        case "not-grid":
        case "not-a-point": return t("bentleyottmann_refused_not_grid", {value0: segmentName(refusal.segment)});
        case "out-of-range": return t("bentleyottmann_refused_out_of_range", {value0: segmentName(refusal.segment), value1: SWEEP_COORD_LIMIT});
        case "overlap": return t("bentleyottmann_refused_overlap", {value0: segmentName(refusal.pair[0]), value1: segmentName(refusal.pair[1])});
    }
}

function noteText(t: Translate, event: BentleyOttmannEventInfo, view: BentleyOttmannView, point: (p: RationalPoint) => string): string {
    const here = event.position ? point(event.position) : "";
    switch (event.note) {
        case "start": return t("bentleyottmann_note_start");
        case "pop": switch (view.kind) {
            case "upper": return t("bentleyottmann_note_pop_upper", {value0: here});
            case "lower": return t("bentleyottmann_note_pop_lower", {value0: here});
            case "endpoint": return t("bentleyottmann_note_pop_endpoint", {value0: here});
            default: return t("bentleyottmann_note_pop_crossing", {value0: here});
        }
        case "enter": return t("bentleyottmann_note_enter", {value0: segmentName(event.segment ?? 0), value1: view.status.length});
        case "leave": return t("bentleyottmann_note_leave", {value0: segmentName(event.segment ?? 0), value1: view.status.length});
        case "swap": {
            const [first, last] = event.block ?? [0, 0];
            return t("bentleyottmann_note_swap", {value0: namesText(view.status.slice(first, last + 1).reverse())});
        }
        case "test": {
            const [a, b] = event.pair ?? [0, 0];
            const names = {value0: segmentName(a), value1: segmentName(b)};
            switch (event.outcome) {
                case "schedule": return t("bentleyottmann_note_test_schedule", names);
                case "queued": return t("bentleyottmann_note_test_queued", names);
                case "passed": return t("bentleyottmann_note_test_passed", names);
                default: return t("bentleyottmann_note_test_none", names);
            }
        }
        case "schedule": return t("bentleyottmann_note_schedule", {value0: event.point ? point(event.point) : ""});
        case "report": return t("bentleyottmann_note_report", {value0: event.point ? point(event.point) : "", value1: namesText(event.through ?? [])});
        case "done": return t("bentleyottmann_note_done");
    }
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
    const refusal = refusalText(t, run);
    const atEnd = step >= run.length - 1;
    const point = (p: RationalPoint) => pointText(p, exponent, language);
    const event = run.event(step);
    const view = run.view(step);
    const n = run.segments.length;
    const stepText = stepCounterText(t, step, run.length);
    const noteLine = event ? noteText(t, event, view, point) : undefined;
    const testsText = t("bentleyottmann_tests", {value0: view.neighbourTests, value1: run.pairTotal});
    const summary = view.done
        ? t("bentleyottmann_summary", {value0: run.eventCount, value1: view.reports.length, value2: view.neighbourTests, value3: run.pairTotal})
        : undefined;
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
            {refusal && <p className="inspector-help" role="alert" data-bentley-ottmann="refusal">{refusal}</p>}
            {!refusal && n === 0 && <p className="inspector-help" data-bentley-ottmann="empty">{t("bentleyottmann_no_segments")}</p>}
            {!refusal && n > 0 && <>
                <StepCounter step={step} length={run.length} hooks={{"data-bentley-ottmann": "step"}}/>
                {noteLine && <p className="inspector-help" data-bentley-ottmann="note">{noteLine}</p>}
                {view.position && <p className="inspector-help" data-bentley-ottmann="position">
                    {t("bentleyottmann_position", {value0: coordinateText(view.position.y, exponent, language)})}</p>}
                <p className="inspector-help" data-bentley-ottmann="status-count">{t("bentleyottmann_status_count", {value0: view.status.length})}</p>
                <p className="inspector-help" data-bentley-ottmann="tests">{testsText}</p>
                {summary && <p className="inspector-help" data-bentley-ottmann="summary">{summary}</p>}
                <p className="inspector-help" data-bentley-ottmann="crossings">
                    {view.reports.length ? t("bentleyottmann_crossings", {value0: view.reports.length}) : t("bentleyottmann_crossings_none")}</p>
                {view.reports.length > 0 && <ul className="sweep-side-list" aria-label={t("bentleyottmann_crossings", {value0: view.reports.length})}>
                    {view.reports.map(report => <li key={`${report.point.x.format()},${report.point.y.format()}`} data-bentley-ottmann="crossing">
                        {t("bentleyottmann_crossing_item", {value0: point(report.point), value1: namesText(report.segments)})}</li>)}
                </ul>}
                {children && <div data-bentley-ottmann-lists="">{children}</div>}
            </>}
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
