import {currentLanguage, useT} from "../localization";
import React, {useContext, useEffect, useId, useRef, useState} from "react";
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
    /** Id of an element that also explains the count (for example a panel's shared help paragraph); joined with the help already linked. */
    describedBy?: string;
    /** Why minus is unavailable at the lower bound; defaults to "At least {min}.". */
    minReason?: string;
    /** Why plus is unavailable at the upper bound; defaults to "At most {max}.". */
    maxReason?: string;
    /** Mouse hover over − or + reports the count a press would give, and `null` when the pointer leaves or no press is possible. */
    onHoverValue?: (value: number | null) => void;
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
    // The side the mouse rests on; after a press the neighbour of the new count is reported, and the report ends with the hover or the component.
    const [hint, setHint] = useState<string | undefined>();
    const hoverSide = useRef<-1 | 1 | 0>(0);
    const hoverValue = props.onHoverValue;
    const reportHover = (side: -1 | 1 | 0) => {
        hoverSide.current = side;
        const target = n + side;
        const next = side === 0 || (side < 0 ? atMin : atMax) ? null : target;
        setHint(next === null ? undefined : t("puck_preview_value", {value0: formatNumber(next, language, digits)}));
        hoverValue?.(next);
    };
    useEffect(() => { if (hoverSide.current !== 0) reportHover(hoverSide.current); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => { if (hoverSide.current !== 0) hoverValue?.(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const hoverHandlers = (side: -1 | 1) => hoverValue === undefined ? {} : {
        onPointerEnter: (event: React.PointerEvent) => { if (event.pointerType === "mouse") reportHover(side); },
        onPointerLeave: () => reportHover(0),
    };
    const blocked = (side: "min" | "max") => setPressed(current => ({side, count: (current?.count ?? 0) + 1}));
    const minusReason = atMin ? props.minReason ?? t("count_at_minimum", {value0: formatNumber(min, language, 0)}) : undefined;
    const plusReason = atMax ? props.maxReason ?? t("count_at_maximum", {value0: formatNumber(max, language, 0)}) : undefined;
    const shownReason = pressed?.side === "min" ? minusReason : pressed?.side === "max" ? plusReason : undefined;

    return <div className="count-setter">
        {props.label && <div className="count-setter-label" id={id}>{props.label}</div>}
        <div className="count-setter-controls" role="group" aria-labelledby={props.label ? id : undefined}
             aria-describedby={joinIds(props.help && `${id}-help`, props.describedBy)}>
            <UnavailableButton aria-label={props.minusLabel ?? t("decrease_count")} className="btn btn-primary count-setter-button" reason={minusReason} {...hoverHandlers(-1)}
                               onPress={() => { setPressed(undefined); props.onMinus(); }} onBlockedPress={() => blocked("min")}>−</UnavailableButton>
            {props.onSet
                ? <NumberInput label={props.label ?? t("current_count", {value0: formatNumber(n, language, digits)})} hideLabel compact
                               value={n} min={props.decimals !== undefined && props.typedMin !== undefined ? props.typedMin : min} max={max} step={props.step ?? 1} bigStep={props.bigStep} decimals={digits}
                               integer={props.decimals === undefined} rejectedHint={props.rejectedHint} describedBy={props.describedBy}
                               onChange={value => props.onSet?.(value)}/>
                : <output className="count-setter-value" aria-label={t("current_count", {value0: formatNumber(n, language, digits)})}>
                    {formatNumber(n, language, digits)}</output>}
            <UnavailableButton aria-label={props.plusLabel ?? t("increase_count")} className="btn btn-primary count-setter-button" reason={plusReason} {...hoverHandlers(1)}
                               onPress={() => { setPressed(undefined); props.onPlus(); }} onBlockedPress={() => blocked("max")}>+</UnavailableButton>
            {hint && <span className="hover-hint" aria-hidden="true">{hint}</span>}
        </div>
        {props.help && <p id={`${id}-help`} className="count-setter-help">{props.help}</p>}
        <div role="status" aria-live="polite" data-count-status>
            {shownReason && <p key={pressed?.count} className="count-setter-help" data-count-reason>{shownReason}</p>}
        </div>
    </div>;
}
