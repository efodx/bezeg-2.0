import {useT} from "../localization";
import {useId} from "react";
import Form from 'react-bootstrap/Form';

interface SliderProps {
    min: number;
    max: number;
    step?: number;
    /** The shown value. The slider is controlled: the caller updates it in response to `onChange`. */
    value: number;
    onChange: ((arg: number) => any);
    customText?: string;
    help?: string
    /** Formats the shown value and the min/max labels (for example as multiples of π); the input itself is unchanged. */
    formatValue?: (value: number) => string
}

export default function Slider(props: SliderProps) {
    const t = useT();
    const id = useId();
    const {step = (props.max - props.min) / 100} = props;
    const show = props.formatValue ?? ((value: number) => value.toFixed(2));
    return <Form>
        <div className="slider-label"><Form.Label htmlFor={id}>{props.customText ?? t("parameter")}</Form.Label>
            <output htmlFor={id}>{show(props.value)}</output></div>
        <Form.Range id={id} aria-describedby={`${id}-range${props.help ? ` ${id}-help` : ""}`} min={props.min}
                    max={props.max} value={props.value}
                    step={step}
                    onChange={e => props.onChange(Number(e.target.value))}></Form.Range>
        <div id={`${id}-range`} className="slider-range"><span>{t("min")} {props.formatValue ? show(props.min) : props.min}</span><span>{t("max")} {props.formatValue ? show(props.max) : props.max}</span></div>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
