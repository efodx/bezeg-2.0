import {currentLanguage, useT} from "../localization";
import React, {useContext, useId, useLayoutEffect, useRef, useState} from "react";
import {onDisplayTab, removeParam, upsertParam, usePucked} from "../uxPicks/a1/paramRegistry";
import {ReplacementRevision} from "./replacementRevision";
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
    onSet?: (value: number) => void | boolean;
    /** A count that is not whole (for example a rational weight): digits shown, which makes the typed field accept decimals. `n` is then formatted with these digits. */
    decimals?: number;
    /** What an arrow key adds in the typed field; defaults to one. Only with `decimals`. */
    step?: number;
    /** Why `onSet` returned false; replaces the generic rejection hint of the typed field. */
    rejectedHint?: string;
    /** Names of the buttons when "Decrease the number" and "Increase the number" do not fit the quantity. */
    minusLabel?: string;
    plusLabel?: string;
    /** The change of Shift with an arrow, PageUp and PageDown in the field; defaults to ten. */
    bigStep?: number;
    min?: number | (() => number);
    max?: number | (() => number);
    /** The typed field's lower bound when it differs from the − limit: a rational weight steps down to 0.25 but any positive weight may be typed. Only with `decimals`. */
    typedMin?: number;
    /** A short explanation shown under the stepper and linked to its group by aria-describedby. */
    help?: string;
    /** UX picks: the stable key a graph's `GraphUx.pucks` names this control by (also its param-registry key and element id); default is a generated id. */
    paramKey?: string;
    /** Id of an element that also explains the count (for example a panel's shared help paragraph); joined with the help already linked. */
    describedBy?: string;
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
    const generatedId = useId();
    const id = props.paramKey ?? generatedId;
    const language = currentLanguage();
    const {n} = props;
    const min = typeof props.min === "function" ? props.min() : props.min;
    const max = typeof props.max === "function" ? props.max() : props.max;
    const digits = props.decimals ?? 0;
    const atMin = min !== undefined && n <= min;
    const atMax = max !== undefined && n >= max;

    // The reason of a blocked press: a counter makes a repeated press announce again; any change of the count drops it.
    const [pressed, setPressed] = useState<{side: "min" | "max", count: number}>();
    const [seenN, setSeenN] = useState(n);
    // A scene replacement (Reset, Preset load, lesson restore) also drops the reason, as NumberInput drops its hint.
    const revision = useContext(ReplacementRevision);
    const [seenRevision, setSeenRevision] = useState(revision);
    if (seenN !== n || seenRevision !== revision) {
        setSeenN(n);
        setSeenRevision(revision);
        setPressed(undefined);
    }
    const blocked = (side: "min" | "max") => setPressed(current => ({side, count: (current?.count ?? 0) + 1}));
    const minusReason = atMin ? props.minReason ?? t("count_at_minimum", {value0: formatNumber(min, language, 0)}) : undefined;
    const plusReason = atMax ? props.maxReason ?? t("count_at_maximum", {value0: formatNumber(max, language, 0)}) : undefined;
    const shownReason = pressed?.side === "min" ? minusReason : pressed?.side === "max" ? plusReason : undefined;

    // ux-picks a1: publish this count so the board pucks can show and drive it through the setter's own − and +.
    const latest = useRef({props, atMin, atMax});
    latest.current = {props, atMin, atMax};
    const rootRef = useRef<HTMLDivElement>(null);
    const pucked = usePucked(id);
    useLayoutEffect(() => {
        upsertParam({
            kind: 'count', key: id, label: props.label ?? props.plusLabel ?? t("current_count", {value0: formatNumber(n, language, digits)}),
            min, max, value: n, inert: false, display: onDisplayTab(rootRef.current),
            format: value => formatNumber(value, language, digits),
            minus: () => { if (latest.current.atMin) return false; latest.current.props.onMinus(); return true; },
            plus: () => { if (latest.current.atMax) return false; latest.current.props.onPlus(); return true; },
        });
    });
    useLayoutEffect(() => () => removeParam(id), [id]);

    return <div ref={rootRef} className="count-setter" data-param={id} data-ux-pucked={pucked ? '' : undefined}>
        {props.label && <div className="count-setter-label" id={id}>{props.label}</div>}
        <div className="count-setter-controls" role="group" aria-labelledby={props.label ? id : undefined}
             aria-describedby={joinIds(props.help && `${id}-help`, props.describedBy)}>
            <UnavailableButton aria-label={props.minusLabel ?? t("decrease_count")} className="btn btn-primary count-setter-button" reason={minusReason}
                               onPress={() => { setPressed(undefined); props.onMinus(); }} onBlockedPress={() => blocked("min")}>−</UnavailableButton>
            {props.onSet
                ? <NumberInput label={props.label ?? t("current_count", {value0: formatNumber(n, language, digits)})} hideLabel compact
                               value={n} min={props.decimals !== undefined && props.typedMin !== undefined ? props.typedMin : min} max={max} step={props.step ?? 1} bigStep={props.bigStep} decimals={digits}
                               integer={props.decimals === undefined} rejectedHint={props.rejectedHint} describedBy={props.describedBy}
                               onChange={value => props.onSet?.(value)}/>
                : <output className="count-setter-value" aria-label={t("current_count", {value0: formatNumber(n, language, digits)})}>
                    {formatNumber(n, language, digits)}</output>}
            <UnavailableButton aria-label={props.plusLabel ?? t("increase_count")} className="btn btn-primary count-setter-button" reason={plusReason}
                               onPress={() => { setPressed(undefined); props.onPlus(); }} onBlockedPress={() => blocked("max")}>+</UnavailableButton>
        </div>
        {props.help && <p id={`${id}-help`} className="count-setter-help">{props.help}</p>}
        <div role="status" aria-live="polite" data-count-status>
            {shownReason && <p key={pressed?.count} className="count-setter-help" data-count-reason>{shownReason}</p>}
        </div>
    </div>;
}
