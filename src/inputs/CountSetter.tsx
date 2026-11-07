import {currentLanguage, useT} from "../localization";
import React, {useId, useState} from "react";
import {formatNumber} from "../analysis/format";
import {NumberInput} from "./NumberInput";
import {joinIds} from "./describedBy";
import {UnavailableButton} from "./UnavailableButton";
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
    /** The change of Shift with an arrow, PageUp and PageDown in the field; defaults to ten. */
    bigStep?: number;
    min?: number | (() => number);
    max?: number | (() => number);
    /** A short explanation shown under the stepper and linked to its group by aria-describedby. */
    help?: string;
    /** Why minus is unavailable at the lower bound; defaults to "At least {min}.". */
    minReason?: string;
    /** Why plus is unavailable at the upper bound; defaults to "At most {max}.". */
    maxReason?: string;
}

/**
 * A controlled integer stepper in the order − / value / +. The value is editable only when the graph can set the count directly
 * (`onSet`); the buttons stay available at the bounds' neighbours and are unavailable (aria-disabled, focusable, with a reason shown on press) at the bounds.
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

    // The reason of a blocked press: a counter makes a repeated press announce again; any change of the count drops it.
    const [pressed, setPressed] = useState<{side: "min" | "max", count: number}>();
    const [seenN, setSeenN] = useState(n);
    if (seenN !== n) {
        setSeenN(n);
        setPressed(undefined);
    }
    const blocked = (side: "min" | "max") => setPressed(current => ({side, count: (current?.count ?? 0) + 1}));
    const minusReason = atMin ? props.minReason ?? t("count_at_minimum", {value0: formatNumber(min, language, 0)}) : undefined;
    const plusReason = atMax ? props.maxReason ?? t("count_at_maximum", {value0: formatNumber(max, language, 0)}) : undefined;
    const shownReason = pressed?.side === "min" ? minusReason : pressed?.side === "max" ? plusReason : undefined;

    return <div className="count-setter">
        {props.label && <div className="count-setter-label" id={id}>{props.label}</div>}
        <div className="count-setter-controls" role="group" aria-labelledby={props.label ? id : undefined}
             aria-describedby={joinIds(props.help && `${id}-help`)}>
            <UnavailableButton aria-label={t("decrease_count")} className="btn btn-primary count-setter-button" reason={minusReason}
                               onPress={() => { setPressed(undefined); props.onMinus(); }} onBlockedPress={() => blocked("min")}>−</UnavailableButton>
            {props.onSet
                ? <NumberInput label={props.label ?? t("current_count", {value0: formatNumber(n, language, 0)})} hideLabel compact
                               value={n} min={min} max={max} step={1} bigStep={props.bigStep} decimals={0} integer
                               onChange={value => props.onSet?.(value)}/>
                : <output className="count-setter-value" aria-label={t("current_count", {value0: formatNumber(n, language, 0)})}>
                    {formatNumber(n, language, 0)}</output>}
            <UnavailableButton aria-label={t("increase_count")} className="btn btn-primary count-setter-button" reason={plusReason}
                               onPress={() => { setPressed(undefined); props.onPlus(); }} onBlockedPress={() => blocked("max")}>+</UnavailableButton>
        </div>
        {props.help && <p id={`${id}-help`} className="count-setter-help">{props.help}</p>}
        <div role="status" aria-live="polite" data-count-status>
            {shownReason && <p key={pressed?.count} className="count-setter-help" data-count-reason>{shownReason}</p>}
        </div>
    </div>;
}
