import {message, messageNumber, type Message, type MessageNumber} from "../../localization";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from "../../compgeo/sweep/limits";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {heightText, siteName, siteNames, type FortuneNote, type FortuneRun} from "./fortuneRun";
import type {FortuneView} from "./fortuneGeometry";

/** The sentences of the Fortune readout, in reading order. `alarm-k` is the k-th false alarm of the step. */
export type FortuneNoteId = "refusal" | "step" | "note" | `alarm-${number}` | "beach" | "vertices" | "current" | "queue" | "cancelled";

/** The refusal of the kernel as one actionable sentence. */
export function fortuneRefusalMessage(run: FortuneRun): Message | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    switch (refusal.reason) {
        case "fewer-than-two": return message("fortune_refused_few");
        case "too-many": return message("fortune_refused_too_many", {value0: SWEEP_MAX_SITES});
        case "duplicate-sites": {
            const [a, b] = refusal.indices ?? [0, 0];
            return message("fortune_refused_duplicate", {value0: siteName(a), value1: siteName(b)});
        }
        default: return message("fortune_refused_coordinate", {value0: siteName(refusal.index ?? 0), value1: SWEEP_COORD_LIMIT});
    }
}

/** The note lines of one step: what the event did, then a line per false alarm it caused. */
export function fortuneNoteMessages(note: FortuneNote | undefined): Message[] {
    if (!note) return [];
    switch (note.kind) {
        case "queued": return [message("fortune_note_queued")];
        case "done": return [message("fortune_note_done")];
        case "site": return [
            note.hit ? message("fortune_note_site_hit", {value0: siteName(note.site)}) : message("fortune_note_site", {value0: siteName(note.site)}),
            ...note.cancelled.map(sites => message("fortune_note_false_alarm", {value0: siteNames(sites)})),
        ];
        case "circle": return [
            message("fortune_note_circle", {value0: siteNames(note.sites)}),
            ...note.cancelled.map(sites => message("fortune_note_false_alarm", {value0: siteNames(sites)})),
        ];
    }
}

/** The event queue of a step in processing order (the first entry is the next event), as names. */
export function fortuneQueueMessages(run: FortuneRun, view: FortuneView): {live: Message[]; cancelled: Message[]} {
    const result = run.result;
    if (!result || view.done) return {live: [], cancelled: []};
    const describe = (id: number): Message => id < result.siteCount
        ? message("fortune_queue_site", {value0: siteName(id)})
        : message("fortune_queue_circle", {value0: siteNames(result.circles[id - result.siteCount].sites)});
    return {live: view.state.sweep.queue.map(entry => describe(entry.id)), cancelled: view.cancelled.map(circle => describe(circle.id))};
}

/** The event processed at this step (none at step 0 and at the end). */
export function fortuneCurrentMessage(view: FortuneView): Message | undefined {
    const now = view.current;
    if (!now) return undefined;
    return now.kind === "site"
        ? message("fortune_queue_site", {value0: siteName(now.site)})
        : message("fortune_queue_circle", {value0: siteNames(now.sites)});
}

/** The sweep height as one message with LaTeX in it (the Orodja panel typesets it). */
export function fortuneHeightMessage(view: FortuneView, language: NumberLanguage): Message {
    if (view.state.height === null) return message("fortune_height_none");
    const height = heightText(view.state.height);
    if (height.kind === "rational") return message("fortune_height_exact", {value0: height.latex});
    return message("fortune_height_surd", {value0: height.latex, value1: roundedText(height.value, language)});
}

const roundedText = (value: number, language: NumberLanguage): string => formatNumber(value, language, 3).replace("−", "-").replace(",", "{,}");

/** A list of messages as one message, joined by "; " (the catalog's join key nests pairwise). */
const joined = (items: readonly Message[]): Message => items.reduce((all, item) => message("fortune_list_join", {value0: all, value1: item}));

export interface FortuneNotesInput {
    run: FortuneRun;
    step: number;
}

/** What the readout says about the sweep height as a row (the formula is TeX), or undefined before the first event. */
export function fortuneHeightRow(view: FortuneView | undefined, language: NumberLanguage): {name: Message; symbol: string; value: MessageNumber; valueTex: string} | undefined {
    if (!view || view.state.height === null) return undefined;
    const height = heightText(view.state.height);
    const tex = height.kind === "rational" ? height.latex : `${height.latex}\\approx ${roundedText(height.value, language)}`;
    return {name: message("fortune_height_name"), symbol: "y", value: messageNumber(height.value, 3), valueTex: tex};
}

/**
 * The sentences the Fortune readout shows, in reading order, as catalog messages (the Orodja panel keeps the same text):
 * the refusal alone, or the step, the event with its false alarms, the beach line, the vertices found, the event just processed
 * and the queue. The sweep height is a row ({@link fortuneHeightRow}), not a note, because it is a formula.
 */
export function fortuneNotes(run: FortuneRun, step: number): {id: FortuneNoteId; text: Message}[] {
    const refusal = fortuneRefusalMessage(run);
    if (refusal) return [{id: "refusal", text: refusal}];
    const view = run.view(step);
    if (!view) return [];
    const notes: {id: FortuneNoteId; text: Message}[] = [{id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(run.length, 1)})}];
    fortuneNoteMessages(run.note(step)).forEach((text, k) => notes.push({id: k === 0 ? "note" : `alarm-${k - 1}`, text}));
    if (!view.done) {
        const beach = view.state.beach;
        notes.push({id: "beach", text: beach.length ? message("fortune_beach", {value0: siteNames(beach)}) : message("fortune_beach_empty")});
    }
    const expected = run.result ? run.result.diagram.vertices.length : 0;
    notes.push({id: "vertices", text: message("fortune_vertices", {value0: view.done ? expected : view.state.vertices.length, value1: expected})});
    const current = fortuneCurrentMessage(view);
    if (current) notes.push({id: "current", text: message("fortune_current_note", {value0: current})});
    if (!view.done) {
        const {live, cancelled} = fortuneQueueMessages(run, view);
        notes.push({id: "queue", text: live.length ? message("fortune_queue_note", {value0: joined(live)}) : message("fortune_queue_empty")});
        if (cancelled.length) notes.push({id: "cancelled", text: message("fortune_cancelled_note", {value0: joined(cancelled)})});
    }
    return notes;
}
