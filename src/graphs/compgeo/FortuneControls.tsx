import React, {useEffect, useRef, useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {typesetMath} from "../../mathjax/loadMathJax";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from "../../compgeo/sweep/limits";
import {heightText, siteName, siteNames, type FortuneNote, type FortuneRun} from "./fortuneRun";
import type {FortuneView} from "./fortuneGeometry";
import "./SweepSideLists.css";
import {FORTUNE_EXAMPLE_IDS, type FortuneExampleId} from "./fortunePresetCollection";

export interface FortuneControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
    loadExample(id: FortuneExampleId): void;
    resetView(): void;
}

export interface FortuneControlsProps {
    run: FortuneRun;
    step: number;
    playing: boolean;
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
    const {run, step, playing, actions} = props;
    const refusal = refusalText(t, run);
    const atEnd = step >= run.length - 1;
    const view = run.view(step);
    const lines = noteLines(t, run.note(step));
    const beach = view ? view.state.beach : [];
    const result = run.result;
    const found = view ? view.state.vertices.length : 0;
    const expected = result ? result.diagram.vertices.length : 0;
    const currentLabel = view ? currentEventLabel(t, view) : undefined;
    const stepText = t("fortune_step_counter", {value0: step + 1, value1: run.length});
    const beachText = beach.length ? t("fortune_beach", {value0: siteNames(beach)}) : t("fortune_beach_empty");
    const verticesText = t("fortune_vertices", {value0: view?.done ? expected : found, value1: expected});
    // The announcement follows the step, Play/Pause, a refusal and the Reset / example buttons, never a drag frame: a drag
    // recomputes the run at the same step, and a screen reader must not hear every move.
    const [nonce, setNonce] = useState(0);
    const announcement = playing || !view || refusal ? "" : [stepText, ...lines, view.done ? "" : beachText].filter(Boolean).join(". ");
    const announceKey = `${step}|${playing}|${view ? "view" : "none"}|${refusal ? "refused" : "ok"}|${nonce}|${language}`;
    const [announced, setAnnounced] = useState({key: announceKey, text: announcement});
    let heard = announced;
    if (announced.key !== announceKey) { heard = {key: announceKey, text: announcement}; setAnnounced(heard); }
    return <>
        <div className="inspector-group">
            <div className="inspector-playback" role="group" aria-label={t("fortune_controls_label")}>
                <button type="button" data-action="next-step" aria-disabled={atEnd || !result}
                        onClick={() => { if (!atEnd && result) actions.nextStep(); }}>{t("fortune_next_step")}</button>
                <button type="button" data-action="play-pause" aria-disabled={(atEnd && !playing) || !result}
                        onClick={() => { if (!((atEnd && !playing) || !result)) actions.playPause(); }}>{playing ? t("pause") : t("play")}</button>
                <button type="button" data-action="reset" aria-disabled={(step === 0 && !playing) || !result}
                        onClick={() => { if (!((step === 0 && !playing) || !result)) { setNonce(n => n + 1); actions.reset(); } }}>{t("reset")}</button>
                <button type="button" data-action="reset-view" onClick={actions.resetView}>{t("fortune_view_reset")}</button>
            </div>
            <p className="inspector-help">{t("fortune_playback_note")}</p>
        </div>
        <div className="inspector-group" role="group" aria-label={t("fortune_examples_group")} data-fortune="examples">
            <div className="inspector-playback">
                {FORTUNE_EXAMPLE_IDS.map(id => <button type="button" key={id} data-example={id}
                                                       onClick={() => { setNonce(n => n + 1); actions.loadExample(id); }}>{t(EXAMPLE_LABEL[id])}</button>)}
            </div>
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
            {/* Always rendered so assistive technology registers the region before its first announcement. Silent while Play runs
                (a tick every 400 ms would flood a screen reader); announces once on Pause or at the end. */}
            <p className="visually-hidden" role="status" aria-live="polite" data-fortune-live="">{heard.text}</p>
        </div>
    </>;
}
