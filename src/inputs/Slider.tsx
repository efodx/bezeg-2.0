import {currentLanguage, useT} from "../localization";
import {useId} from "react";
import Form from 'react-bootstrap/Form';
import {formatNumber} from "../analysis/format";
import {NumberInput} from "./NumberInput";

interface SliderProps {
    min: number;
    max: number;
    step?: number;
    /** The shown value. The slider is controlled: the caller updates it in response to `onChange`. */
    value: number;
    onChange: ((arg: number) => any);
    /** The specific name of the parameter (for example "α" or "Število točk"); shown above the slider and used as its accessible name. */
    customText: string;
    help?: string
    /** Digits shown for the value and the bounds. Defaults to 0 for a positive integer step, otherwise to the step's own decimals (at least 2). */
    decimals?: number;
    /** Formats the shown value and the min/max labels (for example as multiples of π) as read-only text; a precise number field is then not offered. */
    formatValue?: (value: number) => string
    /** Disables the slider and its number field; the caller says why (for example in `help`). */
    disabled?: boolean
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
    const decimals = props.decimals ?? (integer ? 0 : Math.max(2, stepDecimals(step)));
    const exact = props.formatValue === undefined;
    const show = props.formatValue ?? ((value: number) => formatNumber(value, language, decimals));
    return <Form>
        <div className="slider-label"><Form.Label htmlFor={id}>{props.customText}</Form.Label>
            {exact
                ? <NumberInput label={t("number_field_label", {value0: props.customText})} hideLabel compact value={props.value} min={props.min} max={props.max}
                               step={step} decimals={decimals} integer={integer} disabled={props.disabled}
                               onChange={value => props.onChange(value)}/>
                : <output htmlFor={id}>{show(props.value)}</output>}</div>
        <Form.Range id={id} aria-describedby={`${id}-range${props.help ? ` ${id}-help` : ""}`} min={props.min}
                    max={props.max} value={props.value} disabled={props.disabled}
                    step={step} aria-valuetext={show(props.value)}
                    onChange={e => props.onChange(Number(e.target.value))}></Form.Range>
        <div id={`${id}-range`} className="slider-range"><span>{t("min")} {show(props.min)}</span><span>{t("max")} {show(props.max)}</span></div>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
