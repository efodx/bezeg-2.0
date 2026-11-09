import React, {useEffect, useRef} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {typesetMath} from "../../mathjax/loadMathJax";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from "../../compgeo/sweep/limits";
import {heightText, siteName, siteNames, type FortuneNote, type FortuneRun} from "./fortuneRun";
import type {FortuneView} from "./fortuneGeometry";
import "./SweepSideLists.css";
import {FORTUNE_EXAMPLE_IDS, type FortuneExampleId} from "./fortunePresetCollection";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ExampleSelect} from "./ExampleSelect";
import {useStatusReadout} from "./useStatusReadout";
import {stepCounterText} from "./stepCounter";

export interface FortuneControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: FortuneExampleId): void;
}

export interface FortuneControlsProps {
    run: FortuneRun;
    step: number;
    playing: boolean;
    /** The example the sites are now, or undefined for a custom set (a dragged, added or random set). */
    exampleId: FortuneExampleId | undefined;
    actions: FortuneControlActions;
}

type Translate = ReturnType<typeof useT>;

const EXAMPLE_LABEL = {
    "example-1": "fortune_example_1", "example-2": "fortune_example_2", collinear: "fortune_example_collinear",
    cocircular: "fortune_example_cocircular", random: "fortune_example_random",
} as const;

function refusalText(t: Translate, run: FortuneRun): string | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    switch (refusal.reason) {
        case "fewer-than-two": return t("fortune_refused_few");
        case "too-many": return t("fortune_refused_too_many", {value0: SWEEP_MAX_SITES});
        case "duplicate-sites": {
            const [a, b] = refusal.indices ?? [0, 0];
            return t("fortune_refused_duplicate", {value0: siteName(a), value1: siteName(b)});
        }
        default: return t("fortune_refused_coordinate", {value0: siteName(refusal.index ?? 0), value1: SWEEP_COORD_LIMIT});
    }
}

/** The note lines of one step: what the event did, then a line per false alarm it caused. */
export function noteLines(t: Translate, note: FortuneNote | undefined): string[] {
    if (!note) return [];
    switch (note.kind) {
        case "queued": return [t("fortune_note_queued")];
        case "done": return [t("fortune_note_done")];
        case "site": return [
            note.hit ? t("fortune_note_site_hit", {value0: siteName(note.site)}) : t("fortune_note_site", {value0: siteName(note.site)}),
            ...note.cancelled.map(sites => t("fortune_note_false_alarm", {value0: siteNames(sites)})),
        ];
        case "circle": return [
            t("fortune_note_circle", {value0: siteNames(note.sites)}),
            ...note.cancelled.map(sites => t("fortune_note_false_alarm", {value0: siteNames(sites)})),
        ];
    }
}

/** The sweep height as one message with LaTeX in it: a rational, or `q-\sqrt{r}` with its rounded value. */
export function heightMessage(t: Translate, view: FortuneView, language: NumberLanguage): string {
    if (view.state.height === null) return t("fortune_height_none");
    const height = heightText(view.state.height);
    if (height.kind === "rational") return t("fortune_height_exact", {value0: height.latex});
    const rounded = formatNumber(height.value, language, 3).replace("−", "-").replace(",", "{,}");
    return t("fortune_height_surd", {value0: height.latex, value1: rounded});
}

interface QueueItem {
    readonly key: string;
    readonly label: string;
    readonly cancelled: boolean;
    readonly next: boolean;
}

/**
 * The event queue of one step in processing order (the first entry is the next event), then the circle events cancelled so far
 * (false alarms). A queue id below the site count is a site, otherwise a circle event named by its three sites.
 */
export function queueItems(t: Translate, run: FortuneRun, view: FortuneView): QueueItem[] {
    const result = run.result;
    if (!result || view.done) return [];
    const describe = (id: number): string => id < result.siteCount
        ? t("fortune_queue_site", {value0: siteName(id)})
        : t("fortune_queue_circle", {value0: siteNames(result.circles[id - result.siteCount].sites)});
    const live = view.state.sweep.queue.map((entry, k) => ({key: `q${entry.id}`, label: describe(entry.id), cancelled: false, next: k === 0}));
    const dropped = view.cancelled.map(circle => ({key: `c${circle.id}`, label: describe(circle.id), cancelled: true, next: false}));
    return [...live, ...dropped];
}

/** The event processed at this step, marked in text and by a bar (spec C-7); none at step 0 and at the end. */
export function currentEventLabel(t: Translate, view: FortuneView): string | undefined {
    const now = view.current;
    if (!now) return undefined;
    return now.kind === "site"
        ? t("fortune_queue_site", {value0: siteName(now.site)})
        : t("fortune_queue_circle", {value0: siteNames(now.sites)});
}

function CurrentEvent({label}: {label: string}) {
    const t = useT();
    const labelId = React.useId();
    return <div data-fortune="current-event">
        <p className="inspector-help" id={labelId}>{t("fortune_current_label")}</p>
        <ol aria-labelledby={labelId} className="sweep-side-list">
            <li data-current="" aria-current="true"><span aria-hidden="true">● </span>{label}<span className="visually-hidden">{t("fortune_queue_current")}</span></li>
        </ol>
    </div>;
}

function QueueList({items}: {items: readonly QueueItem[]}) {
    const t = useT();
    const labelId = React.useId();
    if (items.length === 0) return <div data-fortune="queue"><p className="inspector-help" data-fortune-queue-empty="">{t("fortune_queue_empty")}</p></div>;
    return <div data-fortune="queue">
        <p className="inspector-help" id={labelId}>{t("fortune_queue_label")}</p>
        <ol aria-labelledby={labelId} className="sweep-side-list">
            {items.map(item => <li key={item.key} data-queue-entry={item.key} data-next={item.next ? "" : undefined}
                                   data-cancelled={item.cancelled ? "" : undefined} aria-current={item.next ? "step" : undefined}>
                {item.next && <span aria-hidden="true">▸ </span>}
                {item.cancelled ? <><s>{item.label}</s>{" "}<span data-fortune-cancelled="">({t("fortune_queue_cancelled")})</span></> : item.label}
                {item.next && <span className="visually-hidden">{t("fortune_queue_next")}</span>}
            </li>)}
        </ol>
    </div>;
}

/** A paragraph whose text holds `\(...\)` math: typeset after each change; the key remounts it because MathJax replaces its nodes. */
function MathParagraph({text, name}: {text: string; name: string}) {
    return <MathParagraphInner key={text} text={text} name={name}/>;
}

function MathParagraphInner({text, name}: {text: string; name: string}) {
    const ref = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        let active = true;
        void typesetMath(element, () => active).catch(() => undefined);
        return () => { active = false; };
    }, []);
    return <p className="inspector-help fortune-readout" data-fortune={name} ref={ref}>{text}</p>;
}

/**
 * Next step / Play / Pause / Reset, the example sites and the minimal readouts of the Fortune sweep (spec C5, task 23a):
 * step, event note (with the false alarms it caused), exact sweep height, the beach line as site names and the vertices found
 * against those expected, the event queue (cancelled circle events struck through and named as such in text) and a live region
 * that announces the step, the event and the beach line. A refused input shows the
 * kernel's reason with an actionable message instead of the readouts. An unavailable button stays focusable (`aria-disabled`).
 */
export function FortuneControls(props: FortuneControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {run, step, playing, exampleId, actions} = props;
    const refusal = refusalText(t, run);
    const atEnd = step >= run.length - 1;
    const view = run.view(step);
    const lines = noteLines(t, run.note(step));
    const beach = view ? view.state.beach : [];
    const result = run.result;
    const found = view ? view.state.vertices.length : 0;
    const expected = result ? result.diagram.vertices.length : 0;
    const currentLabel = view ? currentEventLabel(t, view) : undefined;
    const stepText = stepCounterText(t, step, run.length);
    const beachText = beach.length ? t("fortune_beach", {value0: siteNames(beach)}) : t("fortune_beach_empty");
    const verticesText = t("fortune_vertices", {value0: view?.done ? expected : found, value1: expected});
    // The announcement follows the step, Play/Pause and a refusal, never a drag frame: a drag recomputes the run at the same
    // step, and a screen reader must not hear every move. Silent while Play runs (the region's mute).
    const announcement = !view || refusal ? "" : [stepText, ...lines, view.done ? "" : beachText].filter(Boolean).map(part => /[.!?:]$/.test(part) ? part : `${part}.`).join(" ");
    const liveReadout = useStatusReadout(announcement, true);
    return <>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("fortune_controls_label")} nextLabel={t("fortune_next_step")} playing={playing}
                             {...playbackBlocks({ready: Boolean(result), atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}
                             onNext={actions.nextStep} onPlayPause={actions.playPause}
                             onReset={() => actions.reset()}/>
            <p className="inspector-help">{t("fortune_playback_note")}</p>
        </div>
        <div className="inspector-group" data-fortune="examples">
            <ExampleSelect label={t("fortune_examples_group")} current={exampleId} onChoose={actions.loadExample}
                           options={FORTUNE_EXAMPLE_IDS.map(id => ({id, text: t(EXAMPLE_LABEL[id])}))}/>
        </div>
        <div className="inspector-group" data-fortune-status="">
            {refusal && <p className="inspector-help" role="alert" data-fortune="refusal">{refusal}</p>}
            {!refusal && view && <>
                <p className="inspector-help" data-fortune="step">{stepText}</p>
                {lines.map((line, k) => <p className="inspector-help" key={k} data-fortune="note">{line}</p>)}
                <MathParagraph text={heightMessage(t, view, language)} name="height"/>
                {!view.done && <p className="inspector-help" data-fortune="beach">{beachText}</p>}
                <p className="inspector-help" data-fortune="vertices">{verticesText}</p>
                {currentLabel !== undefined && <CurrentEvent label={currentLabel}/>}
                {!view.done && <QueueList items={queueItems(t, run, view)}/>}
            </>}
            <LiveReadout readout={liveReadout} muted={playing} dataAttribute="fortune-live"/>
        </div>
    </>;
}
