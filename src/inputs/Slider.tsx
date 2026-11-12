import {currentLanguage, useT} from "../localization";
import {useId} from "react";
import Form from 'react-bootstrap/Form';
import {formatNumber} from "../analysis/format";
import {NumberInput} from "./NumberInput";
import {stepKeyDelta} from "./stepKeys";
import {joinIds} from "./describedBy";
import "./Slider.css";

interface SliderProps {
    min: number;
    max: number;
    step?: number;
    /** The change of Shift with an arrow, PageUp and PageDown; defaults to ten steps. */
    bigStep?: number;
    /** The shown value. The slider is controlled: the caller updates it in response to `onChange`. */
    value: number;
    onChange: ((arg: number) => any);
    /** When set, typed text in the exact field calls this instead of `onChange`, so a caller can treat typed values differently from drags; the field's step keys still call `onChange`. */
    onTypedChange?: ((arg: number) => any);
    /** The specific name of the parameter (for example "α" or "Število točk"); shown above the slider and used as its accessible name. */
    customText: string;
    help?: string
    /** Digits shown for the value and the bounds. Defaults to 0 for a positive integer step, otherwise to the step's own decimals (at least 2). */
    decimals?: number;
    /** Formats the shown value and the min/max labels (for example as multiples of π) as read-only text; a precise number field is then not offered. */
    formatValue?: (value: number) => string
    /** Disables the slider and its number field; the caller says why (for example in `help`). */
    disabled?: boolean
    /** Shown by the number field when the caller refuses a typed in-range value (by returning false from `onChange`). */
    rejectedHint?: string
    /**
     * A period (for example 360 for degrees): the exact field and the arrow and page keys wrap the value into [0, period) instead of
     * refusing it, so typed 370 gives 10 and ArrowDown at 0 gives 359. The field then has no range hint.
     */
    cyclic?: number
    /** Digits and precision of the exact field when finer than the slider step (for example 2 for a whole-degree slider that accepts 12,5). */
    fieldDecimals?: number
    /** The spacing of the values `onChange` accepts; a typed off-grid value is rounded to the nearest one and the field says so (see `NumberInput`). */
    grid?: number
    /** Why the slider cannot be changed now. The range stays focusable (no native disabled) but inert, and the reason is shown and described. */
    unavailableReason?: string
    /** The text of the range thumb for assistive technology (for example with a unit); the shown value and the exact field are unchanged. */
    valueText?: (value: number) => string
    /** Leaves out the min and max labels, for a cyclic slider whose two ends are neighbours rather than extremes. */
    hideBounds?: boolean
}

/** Decimal places of a step as written (0.05 has 2, 0.015 has 3); a step in exponent notation counts as 6. */
function stepDecimals(step: number): number {
    const text = String(step);
    if (text.includes("e")) return 6;
    return text.split(".")[1]?.length ?? 0;
}

export default function Slider(props: SliderProps) {
    const t = useT();
    const id = useId();
    const language = currentLanguage();
    const {step = (props.max - props.min) / 100} = props;
    const integer = Number.isInteger(step) && step > 0;
    const fieldDecimals = props.fieldDecimals;
    const decimals = props.decimals ?? (integer ? 0 : Math.max(2, stepDecimals(step)));
    const {cyclic, unavailableReason} = props;
    const inert = props.disabled || unavailableReason !== undefined;
    // Rounds before wrapping, so noise just below the period lands on 0 rather than on the period itself.
    const wrap = (value: number) => {
        if (cyclic === undefined) return value;
        const rounded = Math.round(value * 1e9) / 1e9;
        return ((rounded % cyclic) + cyclic) % cyclic + 0;
    };
    const exact = props.formatValue === undefined;
    const show = props.formatValue ?? ((value: number) => formatNumber(value, language, decimals));
    return <Form className="slider-field">
        <div className="slider-label"><Form.Label htmlFor={id}>{props.customText}</Form.Label>
            {exact
                ? <NumberInput label={t("number_field_label", {value0: props.customText})} hideLabel compact value={props.value} min={cyclic === undefined ? props.min : undefined}
                               max={cyclic === undefined ? props.max : undefined} step={step} bigStep={props.bigStep}
                               decimals={fieldDecimals ?? decimals} integer={integer && fieldDecimals === undefined} grid={props.grid} disabled={props.disabled}
                               unavailableReason={unavailableReason} reasonShownElsewhere describedBy={unavailableReason && `${id}-reason`} rejectedHint={props.rejectedHint}
                               onChange={value => (props.onTypedChange ?? props.onChange)(wrap(value))}
                               onStepChange={value => props.onChange(wrap(value))}/>
                : <output htmlFor={id}>{show(props.value)}</output>}</div>
        <Form.Range id={id} aria-describedby={joinIds(!props.hideBounds && `${id}-range`, props.help && `${id}-help`, unavailableReason && `${id}-reason`)} min={props.min}
                    max={props.max} value={props.value} disabled={props.disabled} aria-disabled={unavailableReason !== undefined ? true : undefined}
                    step={step} aria-valuetext={props.valueText ? props.valueText(props.value) : show(props.value)}
                    onKeyDown={e => {
                        // An arrow is the browser's own one step; the big step is ours so that every control shares it.
                        if (inert || (cyclic === undefined && !e.shiftKey && e.key.startsWith("Arrow"))) return;
                        const delta = stepKeyDelta(e, step, props.bigStep, true);
                        if (delta === undefined) return;
                        e.preventDefault();
                        const next = cyclic === undefined
                            ? Math.round(Math.min(props.max, Math.max(props.min, props.value + delta)) * 1e9) / 1e9
                            : wrap(props.value + delta);
                        if (next !== props.value) props.onChange(next);
                    }}
                    onChange={e => { if (!inert) props.onChange(Number(e.target.value)); }}></Form.Range>
        {!props.hideBounds && <div id={`${id}-range`} className="slider-range"><span>{t("min")} {show(props.min)}</span><span>{t("max")} {show(props.max)}</span></div>}
        {unavailableReason && <p id={`${id}-reason`} className="inspector-help">{unavailableReason}</p>}
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
