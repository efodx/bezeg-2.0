import {t, useLanguage} from "../localization";
import {useEffect, useId, useState} from "react";
import Form from 'react-bootstrap/Form';

interface SliderProps {
    min: number;
    max: number;
    step?: number;
    initialValue?: number;
    onChange: ((arg: number) => any);
    customText?: string;
    fixedValue?: number
    help?: string
    /** Formats the shown value and the min/max labels (for example as multiples of π); the input itself is unchanged. */
    formatValue?: (value: number) => string
}

export default function Slider(props: SliderProps) {
    useLanguage();
    const id = useId();
    const [value, setValue] = useState(props.initialValue ?? props.min);
    useEffect(() => {setValue(props.initialValue ?? props.min);}, [props.initialValue, props.min]);
    const {step = (props.max - props.min) / 100} = props;
    const show = props.formatValue ?? ((value: number) => value.toFixed(2));
    const renderValue = props.fixedValue !== undefined ? props.fixedValue : value!;
    return <Form>
        <div className="slider-label"><Form.Label htmlFor={id}>{props.customText ?? t("parameter")}</Form.Label>
            <output htmlFor={id}>{show(renderValue)}</output></div>
        <Form.Range id={id} aria-describedby={`${id}-range${props.help ? ` ${id}-help` : ""}`} min={props.min}
                    max={props.max} value={renderValue}
                    step={step}
                    onChange={e => {
                        if (props.fixedValue === undefined) {
                            setValue(Number(e.target.value));
                        }
                        props.onChange(Number(e.target.value));
                    }}></Form.Range>
        <div id={`${id}-range`} className="slider-range"><span>{t("min")} {props.formatValue ? show(props.min) : props.min}</span><span>{t("max")} {props.formatValue ? show(props.max) : props.max}</span></div>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
