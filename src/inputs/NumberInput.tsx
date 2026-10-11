import React, {useEffect, useId, useState} from "react";
import "./NumberInput.css";

interface NumberInputProps {
    label: React.ReactNode;
    /** Current model value; undefined shows an empty field (for example the slope of a vertical line). */
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    /** Digits kept when the value is shown (the stored value is not rounded). */
    decimals?: number;
}

const show = (value: number | undefined, decimals: number) =>
    value === undefined || !Number.isFinite(value) ? "" : String(Number(value.toFixed(decimals)));

/**
 * A native number field that keeps what the user is typing (for example "-" or "1.") until it parses to a finite number
 * inside [min, max], and follows the model value when it changes elsewhere (dragging, lesson scenes).
 */
export function NumberInput(props: NumberInputProps) {
    const {value, decimals = 2} = props;
    const id = useId();
    const [draft, setDraft] = useState(show(value, decimals));
    useEffect(() => {
        setDraft(current => {
            const parsed = current.trim() === "" ? NaN : Number(current);
            return Number.isFinite(parsed) && value !== undefined && Math.abs(parsed - value) < 10 ** -(decimals + 1) ? current : show(value, decimals);
        });
    }, [value, decimals]);
    return <div className="number-input">
        <label htmlFor={id}>{props.label}</label>
        <input id={id} type="number" inputMode="decimal" value={draft} disabled={props.disabled}
               min={props.min} max={props.max} step={props.step ?? "any"}
               onChange={event => {
                   setDraft(event.target.value);
                   const parsed = event.target.value.trim() === "" ? NaN : Number(event.target.value);
                   if (!Number.isFinite(parsed)) return;
                   if ((props.min !== undefined && parsed < props.min) || (props.max !== undefined && parsed > props.max)) return;
                   props.onChange(parsed);
               }}
               onBlur={() => setDraft(show(value, decimals))}/>
    </div>;
}
