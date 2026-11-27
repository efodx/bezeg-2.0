import {message, type Message} from "../../localization";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {Rational, type RationalPoint} from "../../compgeo/rational";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from "../../compgeo/sweep/limits";
import {
    type BentleyOttmannEventInfo, type BentleyOttmannRun, type BentleyOttmannView, rationalText, segmentName,
} from "./bentleyOttmannRun";

/** The ids of the sentences of the Bentley-Ottmann readout, in reading order; `crossing-k` is the k-th reported point. */
export type BentleyOttmannNoteId =
    "refusal" | "empty" | "step" | "note" | "position" | "status-count" | "tests" | "summary" | "crossings" | `crossing-${number}`;

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

/** The refusal of the kernel as one actionable sentence. */
export function bentleyOttmannRefusalMessage(run: BentleyOttmannRun): Message | undefined {
    const refusal = run.refusal;
    if (!refusal) return undefined;
    switch (refusal.reason) {
        case "too-many-segments": return message("bentleyottmann_refused_too_many", {value0: SWEEP_MAX_SEGMENTS});
        case "not-grid":
        case "not-a-point": return message("bentleyottmann_refused_not_grid", {value0: segmentName(refusal.segment)});
        case "out-of-range": return message("bentleyottmann_refused_out_of_range", {value0: segmentName(refusal.segment), value1: SWEEP_COORD_LIMIT});
        case "overlap": return message("bentleyottmann_refused_overlap", {value0: segmentName(refusal.pair[0]), value1: segmentName(refusal.pair[1])});
    }
}

/** What the event of this step did; `point` writes an exact point. */
export function bentleyOttmannEventMessage(event: BentleyOttmannEventInfo, view: BentleyOttmannView, point: (p: RationalPoint) => string): Message {
    const here = event.position ? point(event.position) : "";
    switch (event.note) {
        case "start": return message("bentleyottmann_note_start");
        case "pop": switch (view.kind) {
            case "upper": return message("bentleyottmann_note_pop_upper", {value0: here});
            case "lower": return message("bentleyottmann_note_pop_lower", {value0: here});
            case "endpoint": return message("bentleyottmann_note_pop_endpoint", {value0: here});
            default: return message("bentleyottmann_note_pop_crossing", {value0: here});
        }
        case "enter": return message("bentleyottmann_note_enter", {value0: segmentName(event.segment ?? 0), value1: view.status.length});
        case "leave": return message("bentleyottmann_note_leave", {value0: segmentName(event.segment ?? 0), value1: view.status.length});
        case "swap": {
            const [first, last] = event.block ?? [0, 0];
            return message("bentleyottmann_note_swap", {value0: namesText(view.status.slice(first, last + 1).reverse())});
        }
        case "test": {
            const [a, b] = event.pair ?? [0, 0];
            const names = {value0: segmentName(a), value1: segmentName(b)};
            switch (event.outcome) {
                case "schedule": return message("bentleyottmann_note_test_schedule", names);
                case "queued": return message("bentleyottmann_note_test_queued", names);
                case "passed": return message("bentleyottmann_note_test_passed", names);
                default: return message("bentleyottmann_note_test_none", names);
            }
        }
        case "schedule": return message("bentleyottmann_note_schedule", {value0: event.point ? point(event.point) : ""});
        case "report": return message("bentleyottmann_note_report", {value0: event.point ? point(event.point) : "", value1: namesText(event.through ?? [])});
        case "done": return message("bentleyottmann_note_done");
    }
}

/**
 * The sentences the Bentley-Ottmann readout shows, in reading order, as catalog messages: the one source of the Orodja panel's
 * text and of the declaration's notes (task 08). A refused set has only its refusal, an empty one only its hint. Coordinates are
 * exact text in `language` (the panel and the declaration render it again on a language switch).
 */
export function bentleyOttmannNotes(run: BentleyOttmannRun, step: number, exponent: number, language: NumberLanguage): {id: BentleyOttmannNoteId; text: Message}[] {
    const refusal = bentleyOttmannRefusalMessage(run);
    if (refusal) return [{id: "refusal", text: refusal}];
    if (run.segments.length === 0) return [{id: "empty", text: message("bentleyottmann_no_segments")}];
    const point = (p: RationalPoint) => pointText(p, exponent, language);
    const event = run.event(step);
    const view = run.view(step);
    const notes: {id: BentleyOttmannNoteId; text: Message}[] = [{id: "step", text: message("step_counter", {value0: step + 1, value1: Math.max(run.length, 1)})}];
    if (event) notes.push({id: "note", text: bentleyOttmannEventMessage(event, view, point)});
    if (view.position) notes.push({id: "position", text: message("bentleyottmann_position", {value0: coordinateText(view.position.y, exponent, language)})});
    notes.push({id: "status-count", text: message("bentleyottmann_status_count", {value0: view.status.length})});
    notes.push({id: "tests", text: message("bentleyottmann_tests", {value0: view.neighbourTests, value1: run.pairTotal})});
    if (view.done) {
        notes.push({id: "summary", text: message("bentleyottmann_summary", {value0: run.eventCount, value1: view.reports.length, value2: view.neighbourTests, value3: run.pairTotal})});
    }
    notes.push({id: "crossings", text: view.reports.length
        ? message("bentleyottmann_crossings", {value0: view.reports.length})
        : message("bentleyottmann_crossings_none")});
    view.reports.forEach((report, k) => notes.push({
        id: `crossing-${k}`,
        text: message("bentleyottmann_crossing_item", {value0: point(report.point), value1: namesText(report.segments)}),
    }));
    return notes;
}
