import React, {useEffect, useId, useRef, useState} from "react";
import {currentLanguage, useT} from "../localization";
import {formatNumber} from "../analysis/format";
import {cleanNumber, gridUnits} from "../analysis/numbers";
import {stepKeyDelta} from "./stepKeys";
import {joinIds} from "./describedBy";
import "./NumberInput.css";

interface NumberInputProps {
    label: React.ReactNode;
    /** Current model value; undefined shows an empty field (for example the slope of a vertical line). */
    value: number | undefined;
    /** Return false when the model rejected the value; the field then explains it instead of silently reverting. */
    onChange: (value: number) => void | boolean;
    min?: number;
    max?: number;
    /** What the arrow keys add or subtract; typed values are not restricted to multiples of it. */
    step?: number;
    disabled?: boolean;
    /** Digits kept when the value is shown (the stored value is not rounded). */
    decimals?: number;
    /** Only whole numbers are accepted; other typed values are explained with the range hint. */
    integer?: boolean;
    /** Keeps the label for assistive technology only (for example when a visible label sits next to the field). */
    hideLabel?: boolean;
    /** A narrow field for a value shown beside another label (a slider or stepper). */
    compact?: boolean;
    /** Why the model rejected a value (for example an ordering rule); replaces the generic rejection hint. */
    rejectedHint?: string;
    /** Id of an element that explains the field (for example why it is disabled); joined with the hint in aria-describedby. */
    describedBy?: string;
    /** A short explanation shown under the field and linked by aria-describedby. */
    help?: string;
    /** The change of Shift with an arrow, PageUp and PageDown; defaults to ten steps. */
    bigStep?: number;
    /**
     * The spacing of the values the model accepts. A typed value inside the range but off the grid is rounded to the nearest grid
     * value (ties away from zero), which is then range-checked and passed to `onChange`, and the field says which value it used. A value outside the range
     * is refused, never clamped. When `integer` is set, `grid` must be a whole number (a finer grid is not handled).
     */
    grid?: number;
    /**
     * Why the field cannot be edited now. The field then keeps focus but is read-only (aria-readonly, aria-disabled), ignores keys and
     * commits, and shows the reason as its hint (linked by aria-describedby). An open draft is dropped when the reason appears.
     */
    unavailableReason?: string;
}

type Language = ReturnType<typeof currentLanguage>;

/**
 * Parses a typed decimal in either convention: "1,5" and "1.5", with "-" or the Unicode minus "−" as sign.
 * Returns NaN for an empty, incomplete ("-", "1,", "1.") or otherwise invalid draft, so that the caller keeps the draft
 * and does not commit it.
 */
export function parseDecimal(text: string): number {
    const normalized = text.trim().replace(/−/g, "-");
    if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/.test(normalized)) return NaN;
    return Number(normalized.replace(",", "."));
}

const show = (value: number | undefined, decimals: number, language: Language) =>
    value === undefined || !Number.isFinite(value) ? "" : formatNumber(value, language, decimals);

/** The decimal places of a grid step (0.25 has 2, 0.001 has 3, 5 has 0), so a snapped value is shown exactly. */
const gridDecimals = (grid: number): number => {
    const [mantissa, exponent] = cleanNumber(grid).toExponential().split("e");
    const fraction = mantissa.split(".")[1]?.length ?? 0;
    return Math.max(0, fraction - Number(exponent));
};

type Hint = "range" | "rejected" | "invalid" | "snapped" | undefined;

/**
 * The decimal keypad of a phone may have no minus sign, so it is requested only for fields that cannot go negative (a lower bound of
 * zero or more); other fields get the plain text keyboard.
 *
 * A text field for a decimal number (decimal comma in Slovenian, decimal point in English; both are accepted when typed). It keeps
 * what the user is typing (for example "-" or "1,") until it parses to a finite number inside [min, max], and follows the model value
 * when it changes elsewhere (dragging, lesson scenes, language changes). A value outside the range, a non-integer for an integer
 * field, or one the model rejects is explained by a short hint under the field.
 */
export function NumberInput(props: NumberInputProps) {
    const t = useT();
    const language = currentLanguage();
    const {value, decimals = 2, min, max, step, integer} = props;
    const id = useId();
    const hintId = `${id}-hint`;
    const {unavailableReason, grid} = props;
    const helpId = `${id}-help`;
    const [draft, setDraft] = useState(show(value, decimals, language));
    const [hint, setHint] = useState<Hint>(undefined);
    const [snappedTo, setSnappedTo] = useState<number>();
    const lastLanguage = useRef<Language>(language);
    // Whether the draft holds text the user typed; the shown text is rounded, so committing it unedited would round the model.
    const edited = useRef(false);
    useEffect(() => {
        const languageChanged = lastLanguage.current !== language;
        lastLanguage.current = language;
        setDraft(current => {
            const parsed = parseDecimal(current);
            const keep = !languageChanged && Number.isFinite(parsed) && value !== undefined && Math.abs(parsed - value) < 10 ** -(decimals + 1);
            return keep ? current : show(value, decimals, language);
        });
    }, [value, decimals, language]);

    // An open draft is dropped when the field becomes unavailable (a commit would be refused); the reason is then the hint. The state is
    // adjusted while rendering, as React advises for state derived from a prop. A draft still open when the field unmounts is dropped silently.
    const [seenReason, setSeenReason] = useState(unavailableReason);
    if (seenReason !== unavailableReason) {
        setSeenReason(unavailableReason);
        if (unavailableReason !== undefined) {
            setDraft(show(value, decimals, language));
            setHint(undefined);
        }
    }

    const outOfRange = (candidate: number) => (min !== undefined && candidate < min) || (max !== undefined && candidate > max);
    /** Applies a parsed value; returns whether it was in range and accepted by the model. */
    const commit = (parsed: number): boolean => {
        if (unavailableReason !== undefined) return false;
        if ((integer && !Number.isInteger(parsed)) || outOfRange(parsed)) {
            setHint("range");
            return false;
        }
        let used = parsed;
        if (grid !== undefined && grid > 0 && gridUnits(parsed, grid) === undefined) {
            used = cleanNumber(Math.sign(parsed) * Math.floor(Math.abs(parsed) / grid + 0.5 + 1e-9) * grid);
            if ((integer && !Number.isInteger(used)) || outOfRange(used)) {
                setHint("range");
                return false;
            }
        }
        const accepted = props.onChange(used) !== false;
        setSnappedTo(used !== parsed ? used : undefined);
        setHint(!accepted ? "rejected" : used !== parsed ? "snapped" : undefined);
        return accepted;
    };
    /**
     * The one commit for Enter and blur. An untouched field, or a draft equal to the shown model text, writes nothing (the shown text is
     * rounded, so committing it would round the model); any other valid edited draft is committed. Returns whether a commit was accepted.
     */
    const confirmDraft = (): boolean => {
        if (!edited.current || draft.trim() === show(value, decimals, language)) {
            edited.current = false;
            setHint(undefined);
            return false;
        }
        const typed = parseDecimal(draft);
        if (!Number.isFinite(typed)) {
            setHint("invalid");
            return false;
        }
        // A refused value stays an open edit, so that blur explains it again.
        const accepted = commit(typed);
        if (accepted) edited.current = false;
        return accepted;
    };
    const hintText = unavailableReason !== undefined ? unavailableReason
        : hint === "snapped" && snappedTo !== undefined ? t("number_snapped_hint", {value0: formatNumber(snappedTo, language, Math.max(decimals, grid !== undefined && grid > 0 ? gridDecimals(grid) : 0))})
        : (hint === "range" || hint === "invalid") && min !== undefined && max !== undefined
        ? t("number_range_hint", {value0: formatNumber(min, language), value1: formatNumber(max, language)})
        : hint === "invalid" ? t("number_rejected_hint")
        : hint ? props.rejectedHint ?? t("number_rejected_hint") : undefined;
    return <div className={props.compact ? "number-input number-input-compact" : "number-input"}>
        <label htmlFor={id} className={props.hideLabel ? "visually-hidden" : undefined}>{props.label}</label>
        <input id={id} type="text" inputMode={min !== undefined && min >= 0 ? "decimal" : "text"} autoComplete="off" role="spinbutton" value={draft} disabled={props.disabled}
               readOnly={unavailableReason !== undefined} aria-disabled={unavailableReason !== undefined ? true : undefined}
               title={unavailableReason}
               aria-valuemin={min} aria-valuemax={max}
               aria-valuenow={value !== undefined && Number.isFinite(value) ? value : undefined}
               aria-invalid={hintText && hint !== "snapped" && unavailableReason === undefined ? true : undefined}
               aria-describedby={joinIds(hintText && hintId, props.help && helpId, props.describedBy)}
               onChange={event => {
                   if (unavailableReason !== undefined) return;
                   // Every change only edits the draft; Enter or blur commits it.
                   setDraft(event.target.value);
                   edited.current = true;
                   setHint(undefined);
               }}
               onKeyDown={event => {
                   // A lone text field inside a form (the slider's) would otherwise submit it and reload the page.
                   if (event.key === "Enter") {
                       event.preventDefault();
                       if (unavailableReason !== undefined) return;
                       // An accepted value the model snapped back to the unchanged prop would leave the typed text behind: show the model value.
                       if (confirmDraft()) setDraft(show(value, decimals, language));
                       return;
                   }
                   if (unavailableReason !== undefined) return;
                   if (event.key === "Escape") {
                       edited.current = false;
                       setHint(undefined);
                       setDraft(show(value, decimals, language));
                       return;
                   }
                   const delta = step ? stepKeyDelta(event, step, props.bigStep) : undefined;
                   if (delta === undefined || props.disabled) return;
                   event.preventDefault();
                   const typed = parseDecimal(draft);
                   const current = Number.isFinite(typed) ? typed : value ?? 0;
                   let next = Math.round((current + delta) * 1e9) / 1e9 + 0;
                   if (min !== undefined) next = Math.max(min, next);
                   if (max !== undefined) next = Math.min(max, next);
                   edited.current = false;
                   setDraft(show(next, Math.max(decimals, 6), language));
                   commit(next);
               }}
               onBlur={() => {
                   // A refusal stays explained after the field reverts to the model value.
                   confirmDraft();
                   edited.current = false;
                   setDraft(show(value, decimals, language));
               }}/>
        {props.help && <p id={helpId} className="number-input-help">{props.help}</p>}
        {/* Always mounted so that a hint inserted after a refusal is announced; empty (no box) until something is refused. */}
        <div className="number-input-hint-region" aria-live="polite">
            {hintText && <p id={hintId} className="number-input-hint">{hintText}</p>}
        </div>
    </div>;
}
