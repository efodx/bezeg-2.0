import {currentLanguage, useT} from "../localization";
import {Button} from "react-bootstrap";
import React, {useId} from "react";
import {formatNumber} from "../analysis/format";
import {NumberInput} from "./NumberInput";
import "./CountSetter.css";

interface CountSetterProps {
    /** Visible name of the count (for example "Stopnja polinomov"); it names the group for assistive technology. */
    label?: string;
    /** The displayed integer count. The caller changes it in response to `onPlus`, `onMinus` and `onSet`. */
    n: number;
    onPlus: () => void;
    onMinus: () => void;
    /** When given, the middle is an editable integer field that calls `onSet` with the typed whole number; otherwise it shows `n` read-only. */
    onSet?: (value: number) => void;
    min?: number | (() => number);
    max?: number | (() => number);
}

/**
 * A controlled integer stepper in the order − / value / +. The value is editable only when the graph can set the count directly
 * (`onSet`); the buttons stay available at the bounds' neighbours and are disabled at the bounds.
 */
export function CountSetter(props: CountSetterProps) {
    const t = useT();
    const id = useId();
    const language = currentLanguage();
    const {n} = props;
    const min = typeof props.min === "function" ? props.min() : props.min;
    const max = typeof props.max === "function" ? props.max() : props.max;
    const atMin = min !== undefined && n <= min;
    const atMax = max !== undefined && n >= max;

    const onPlus = () => {
        if (!atMax) props.onPlus();
    };
    const onMinus = () => {
        if (!atMin) props.onMinus();
    };

    return <div className="count-setter">
        {props.label && <div className="count-setter-label" id={id}>{props.label}</div>}
        <div className="count-setter-controls" role="group" aria-labelledby={props.label ? id : undefined}>
            <Button aria-label={t("decrease_count")} className="count-setter-button" onClick={onMinus} disabled={atMin}>−</Button>
            {props.onSet
                ? <NumberInput label={props.label ?? t("current_count", {value0: formatNumber(n, language, 0)})} hideLabel compact
                               value={n} min={min} max={max} step={1} decimals={0} integer applyOn="confirm"
                               onChange={value => props.onSet?.(value)}/>
                : <output className="count-setter-value" aria-label={t("current_count", {value0: formatNumber(n, language, 0)})}>
                    {formatNumber(n, language, 0)}</output>}
            <Button aria-label={t("increase_count")} className="count-setter-button" onClick={onPlus} disabled={atMax}>+</Button>
        </div>
    </div>;
}
