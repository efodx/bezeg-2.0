import React, {useEffect, useId, useRef, useState} from "react";
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
    /**
     * When the typed value is applied: on every change (default) or only on Enter and when the field loses focus ("confirm"), for a
     * value the model rewrites as soon as it is applied (for example a polar input snapped to a grid), which would otherwise replace
     * the text under the user's hands. The arrow keys and any change that is not typing apply at once in both modes.
     * After Enter the field shows the model value again, so a value the model snapped back to the unchanged prop does not leave the
     * typed text behind.
     */
    applyOn?: "input" | "confirm";
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

type Hint = "range" | "rejected" | undefined;

/**
 * A text field for a decimal number (decimal comma in Slovenian, decimal point in English; both are accepted when typed). It keeps
 * what the user is typing (for example "-" or "1,") until it parses to a finite number inside [min, max], and follows the model value
 * when it changes elsewhere (dragging, lesson scenes, language changes). A value outside the range, a non-integer for an integer
 * field, or one the model rejects is explained by a short hint under the field.
 */
export function NumberInput(props: NumberInputProps) {
    const t = useT();
    const language = currentLanguage();
    const {value, decimals = 2, min, max, step, integer} = props;
    const confirm = props.applyOn === "confirm";
    const id = useId();
    const hintId = `${id}-hint`;
    const [draft, setDraft] = useState(show(value, decimals, language));
    const [hint, setHint] = useState<Hint>(undefined);
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

    /** Applies a parsed value; returns whether it was in range and accepted by the model. */
    const commit = (parsed: number): boolean => {
        if ((integer && !Number.isInteger(parsed)) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
            setHint("range");
            return false;
        }
        const accepted = props.onChange(parsed) !== false;
        setHint(accepted ? undefined : "rejected");
        return accepted;
    };
    const hintText = hint === "range" && min !== undefined && max !== undefined
        ? t("number_range_hint", {value0: formatNumber(min, language), value1: formatNumber(max, language)})
        : hint ? props.rejectedHint ?? t("number_rejected_hint") : undefined;
    return <div className={props.compact ? "number-input number-input-compact" : "number-input"}>
        <label htmlFor={id} className={props.hideLabel ? "visually-hidden" : undefined}>{props.label}</label>
        <input id={id} type="text" inputMode="decimal" autoComplete="off" role="spinbutton" value={draft} disabled={props.disabled}
               aria-valuemin={min} aria-valuemax={max}
               aria-valuenow={value !== undefined && Number.isFinite(value) ? value : undefined}
               aria-invalid={hintText ? true : undefined}
               aria-describedby={[hintText ? hintId : undefined, props.describedBy].filter(Boolean).join(" ") || undefined}
               onChange={event => {
                   setDraft(event.target.value);
                   // Typing, pasting and undo carry an inputType; any other change applies at once.
                   const inputType = (event.nativeEvent as InputEvent).inputType;
                   const typing = typeof inputType === "string" && /^(insert|delete|history)/.test(inputType);
                   if (confirm && typing) {
                       edited.current = true;
                       setHint(undefined);
                       return;
                   }
                   const parsed = parseDecimal(event.target.value);
                   if (!Number.isFinite(parsed)) {
                       setHint(undefined);
                       return;
                   }
                   commit(parsed);
               }}
               onKeyDown={event => {
                   // A lone text field inside a form (the slider's) would otherwise submit it and reload the page.
                   if (event.key === "Enter" && !confirm) {
                       event.preventDefault();
                       return;
                   }
                   if (confirm && event.key === "Enter") {
                       event.preventDefault();
                       if (!edited.current) return;
                       const typed = parseDecimal(draft);
                       // An accepted value the model snapped back to the unchanged prop would leave the typed text behind: show the model value.
                       if (Number.isFinite(typed) && commit(typed)) {
                           edited.current = false;
                           setDraft(show(value, decimals, language));
                       }
                       return;
                   }
                   if ((event.key !== "ArrowUp" && event.key !== "ArrowDown") || !step || props.disabled) return;
                   event.preventDefault();
                   const typed = parseDecimal(draft);
                   const current = Number.isFinite(typed) ? typed : value ?? 0;
                   let next = Math.round((current + (event.key === "ArrowUp" ? step : -step)) * 1e9) / 1e9 + 0;
                   if (min !== undefined) next = Math.max(min, next);
                   if (max !== undefined) next = Math.min(max, next);
                   setDraft(show(next, Math.max(decimals, 6), language));
                   commit(next);
               }}
               onBlur={() => {
                   if (confirm) {
                       const typed = parseDecimal(draft);
                       const changed = edited.current && Number.isFinite(typed) && (value === undefined || Math.abs(typed - value) >= 10 ** -(decimals + 1));
                       edited.current = false;
                       // A refusal stays explained after the field reverts to the model value.
                       if (changed) commit(typed);
                       else setHint(undefined);
                       setDraft(show(value, decimals, language));
                       return;
                   }
                   setDraft(show(value, decimals, language));
                   setHint(undefined);
               }}/>
        {hintText && <p id={hintId} className="number-input-hint" role="status">{hintText}</p>}
    </div>;
}
