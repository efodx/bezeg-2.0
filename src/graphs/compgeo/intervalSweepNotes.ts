import {message, messageNumber, type Message} from "../../localization";
import {intervalLetter} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_INTERVALS} from "../../compgeo/sweep/limits";
import type {IntervalPair} from "../../compgeo/sweep/intervalSweep";
import type {IntervalEventInfo, IntervalRun, IntervalView} from "./intervalSweepRun";

/** The ids of the sentences of the interval sweep readout, in reading order. */
export type IntervalSweepNoteId = "refusal" | "empty" | "step" | "note" | "open" | "counts" | "max" | "pairs" | "comparison";

const pairText = (pair: IntervalPair) => intervalLetter(pair[0]) + intervalLetter(pair[1]);

/** The refusal of the kernel as one actionable sentence. */
export function intervalSweepRefusalMessage(run: IntervalRun): Message | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    const letter = intervalLetter(refusal.index ?? 0);
    switch (refusal.reason) {
        case "too-many": return message("intervalsweep_refused_too_many", {value0: SWEEP_MAX_INTERVALS});
        case "inverted": return message("intervalsweep_refused_inverted", {value0: letter});
        case "not-grid":
        case "not-a-point": return message("intervalsweep_refused_not_grid", {value0: letter});
        case "out-of-range": return message("intervalsweep_refused_out_of_range", {value0: letter, value1: SWEEP_COORD_LIMIT});
    }
}

/** What the event of this step did; `scale` turns grid x values into board values. */
export function intervalSweepEventMessage(event: IntervalEventInfo, view: IntervalView, scale: number): Message {
    const letter = event.interval === undefined ? "" : intervalLetter(event.interval);
    const x = messageNumber((event.x ?? 0) * scale, 4);
    switch (event.note) {
        case "pop": return event.entering
            ? message("intervalsweep_note_pop_enter", {value0: x, value1: letter})
            : message("intervalsweep_note_pop_leave", {value0: x, value1: letter});
        case "enter": return message("intervalsweep_note_enter", {value0: letter, value1: view.open.length});
        case "leave": return message("intervalsweep_note_leave", {value0: letter, value1: view.open.length});
        case "report": {
            const pair = event.pair ? pairText(event.pair) : "";
            return event.touching ? message("intervalsweep_note_report_touch", {value0: pair}) : message("intervalsweep_note_report_overlap", {value0: pair});
        }
        case "done": return message("intervalsweep_note_done");
    }
}

/**
 * The sentences the interval sweep readout shows, in reading order, as catalog messages: the one source of the Orodja panel's text
 * (kept for the parity test) and of the declaration's notes (task 08). A refused set has only its refusal; an empty set only its hint.
 */
export function intervalSweepNotes(run: IntervalRun, step: number, scale: number): {id: IntervalSweepNoteId; text: Message}[] {
    const refusal = intervalSweepRefusalMessage(run);
    if (refusal) return [{id: "refusal", text: refusal}];
    const n = run.intervals.length;
    if (n === 0) return [{id: "empty", text: message("intervalsweep_no_intervals")}];
    const view = run.view(step);
    const event = run.event(step);
    const notes: {id: IntervalSweepNoteId; text: Message}[] = [{id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(run.length, 1)})}];
    if (event) notes.push({id: "note", text: intervalSweepEventMessage(event, view, scale)});
    notes.push({id: "open", text: message("intervalsweep_open_count", {value0: view.open.length})});
    notes.push({id: "counts", text: message("intervalsweep_counts", {value0: view.counts.join(", ")})});
    notes.push({id: "max", text: view.done
        ? message("intervalsweep_max_final", {
            value0: run.maxOpen,
            value1: run.maxStart === null ? "?" : messageNumber(run.maxStart * scale, 4),
            value2: run.maxEnd === null ? "?" : messageNumber(run.maxEnd * scale, 4),
        })
        : message("intervalsweep_max_so_far", {value0: view.maxSoFar})});
    notes.push({id: "pairs", text: view.pairs.length
        ? message("intervalsweep_pairs", {value0: view.pairs.length, value1: view.pairs.map(pairText).join(", ")})
        : message("intervalsweep_pairs_none")});
    if (view.done) notes.push({id: "comparison", text: message("intervalsweep_comparison", {value0: view.pairs.length, value1: (n * (n - 1)) / 2})});
    return notes;
}
