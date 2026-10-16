import React, {useEffect, useId, useState} from "react";
import {currentLanguage, useT} from "../localization";
import {formatNumber} from "../analysis/format";
import "./NumberInput.css";

interface NumberInputProps {
    label: React.ReactNode;
    /** Current model value; undefined shows an empty field (for example the slope of a vertical line). */
    value: number | undefined;
    /** Return false when the model rejected the value; the field then explains it instead of silently reverting. */
    onChange: (value: number) => void | boolean;
    min?: number;
    max?: number;
    /** What the arrow keys add or subtract; typed values are not restricted to multiples of it (the field never reports a step mismatch). */
    step?: number;
    disabled?: boolean;
    /** Digits kept when the value is shown (the stored value is not rounded). */
    decimals?: number;
    /** Why the model rejected a value (for example an ordering rule); replaces the generic rejection hint. */
    rejectedHint?: string;
    /** Id of an element that explains the field (for example why it is disabled); joined with the hint in aria-describedby. */
    describedBy?: string;
    /**
     * When the typed value is applied: on every change (default) or only on Enter and when the field loses focus ("confirm"), for a
     * value the model rewrites as soon as it is applied (for example a polar input snapped to a grid), which would otherwise replace
     * the text under the user's hands. The arrow keys and the native spinner (a change that is not typing) apply at once in both modes.
     * After Enter the field shows the model value again, so a value the model snapped back to the unchanged prop does not leave the
     * typed text behind.
     */
    applyOn?: "input" | "confirm";
}

const show = (value: number | undefined, decimals: number) =>
    value === undefined || !Number.isFinite(value) ? "" : String(Number(value.toFixed(decimals)));

type Hint = "range" | "rejected" | undefined;

/**
 * A native number field that keeps what the user is typing (for example "-" or "1.") until it parses to a finite number
 * inside [min, max], and follows the model value when it changes elsewhere (dragging, lesson scenes). A finite value outside
 * the range, or one the model rejects, is explained by a short hint under the field.
 */
export function NumberInput(props: NumberInputProps) {
    const t = useT();
    const {value, decimals = 2, min, max, step} = props;
    const confirm = props.applyOn === "confirm";
    const id = useId();
    const [draft, setDraft] = useState(show(value, decimals));
    const [hint, setHint] = useState<Hint>(undefined);
    useEffect(() => {
        setDraft(current => {
            const parsed = current.trim() === "" ? NaN : Number(current);
            return Number.isFinite(parsed) && value !== undefined && Math.abs(parsed - value) < 10 ** -(decimals + 1) ? current : show(value, decimals);
        });
    }, [value, decimals]);

    /** Applies a parsed value; returns whether it was in range and accepted by the model. */
    const commit = (parsed: number): boolean => {
        if ((min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
            setHint("range");
            return false;
        }
        const accepted = props.onChange(parsed) !== false;
        setHint(accepted ? undefined : "rejected");
        return accepted;
    };
    const hintText = hint === "range" && min !== undefined && max !== undefined
        ? t("number_range_hint", {value0: formatNumber(min, currentLanguage()), value1: formatNumber(max, currentLanguage())})
        : hint ? props.rejectedHint ?? t("number_rejected_hint") : undefined;
    return <div className="number-input">
        <label htmlFor={id}>{props.label}</label>
        <input id={id} type="number" inputMode="decimal" value={draft} disabled={props.disabled}
               min={min} max={max} step="any" aria-invalid={hintText ? true : undefined}
               aria-describedby={[hintText ? `${id}-hint` : undefined, props.describedBy].filter(Boolean).join(" ") || undefined}
               onChange={event => {
                   setDraft(event.target.value);
                   // Typing, pasting and undo carry an inputType; the spinner and a step from the keyboard-less UI do not, and apply at once.
                   const inputType = (event.nativeEvent as InputEvent).inputType;
                   const typing = typeof inputType === "string" && /^(insert|delete|history)/.test(inputType);
                   if (confirm && typing) {
                       setHint(undefined);
                       return;
                   }
                   const parsed = event.target.value.trim() === "" ? NaN : Number(event.target.value);
                   if (!Number.isFinite(parsed)) {
                       setHint(undefined);
                       return;
                   }
                   commit(parsed);
               }}
               onKeyDown={event => {
                   if (confirm && event.key === "Enter") {
                       event.preventDefault();
                       const typed = draft.trim() === "" ? NaN : Number(draft);
                       // An accepted value the model snapped back to the unchanged prop would leave the typed text behind: show the model value.
                       if (Number.isFinite(typed) && commit(typed)) setDraft(show(value, decimals));
                       return;
                   }
                   if ((event.key !== "ArrowUp" && event.key !== "ArrowDown") || !step || props.disabled) return;
                   event.preventDefault();
                   const typed = draft.trim() === "" ? NaN : Number(draft);
                   const current = Number.isFinite(typed) ? typed : value ?? 0;
                   let next = Math.round((current + (event.key === "ArrowUp" ? step : -step)) * 1e9) / 1e9 + 0;
                   if (min !== undefined) next = Math.max(min, next);
                   if (max !== undefined) next = Math.min(max, next);
                   setDraft(show(next, Math.max(decimals, 6)));
                   commit(next);
               }}
               onBlur={() => {
                   if (confirm) {
                       const typed = draft.trim() === "" ? NaN : Number(draft);
                       const changed = Number.isFinite(typed) && (value === undefined || Math.abs(typed - value) >= 10 ** -(decimals + 1));
                       // A refusal stays explained after the field reverts to the model value.
                       if (changed) commit(typed);
                       else setHint(undefined);
                       setDraft(show(value, decimals));
                       return;
                   }
                   setDraft(show(value, decimals));
                   setHint(undefined);
               }}/>
        {hintText && <p id={`${id}-hint`} className="number-input-hint" role="status">{hintText}</p>}
    </div>;
}
