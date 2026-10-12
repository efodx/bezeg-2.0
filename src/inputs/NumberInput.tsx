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
    const id = useId();
    const [draft, setDraft] = useState(show(value, decimals));
    const [hint, setHint] = useState<Hint>(undefined);
    useEffect(() => {
        setDraft(current => {
            const parsed = current.trim() === "" ? NaN : Number(current);
            return Number.isFinite(parsed) && value !== undefined && Math.abs(parsed - value) < 10 ** -(decimals + 1) ? current : show(value, decimals);
        });
    }, [value, decimals]);

    const commit = (parsed: number) => {
        if ((min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
            setHint("range");
            return;
        }
        setHint(props.onChange(parsed) === false ? "rejected" : undefined);
    };
    const hintText = hint === "range" && min !== undefined && max !== undefined
        ? t("number_range_hint", {value0: formatNumber(min, currentLanguage()), value1: formatNumber(max, currentLanguage())})
        : hint ? t("number_rejected_hint") : undefined;
    return <div className="number-input">
        <label htmlFor={id}>{props.label}</label>
        <input id={id} type="number" inputMode="decimal" value={draft} disabled={props.disabled}
               min={min} max={max} step="any" aria-invalid={hintText ? true : undefined}
               aria-describedby={hintText ? `${id}-hint` : undefined}
               onChange={event => {
                   setDraft(event.target.value);
                   const parsed = event.target.value.trim() === "" ? NaN : Number(event.target.value);
                   if (!Number.isFinite(parsed)) {
                       setHint(undefined);
                       return;
                   }
                   commit(parsed);
               }}
               onKeyDown={event => {
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
                   setDraft(show(value, decimals));
                   setHint(undefined);
               }}/>
        {hintText && <p id={`${id}-hint`} className="number-input-hint" role="status">{hintText}</p>}
    </div>;
}
