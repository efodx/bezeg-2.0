import {useId} from "react";
import Form from "react-bootstrap/Form";
import {useT} from "../localization";

interface ChoiceSelectProps {
    /** Visible label, also the accessible name of the native select. */
    label: string;
    value: string;
    options: readonly { value: string; text: string }[];
    onChange: (value: string) => void;
    help?: string;
}

/** A labelled native select for choosing one of a few named options (keyboard and touch work as for any select). */
export function ChoiceSelect(props: ChoiceSelectProps) {
    useT();
    const id = useId();
    return <Form>
        <Form.Label htmlFor={id}>{props.label}</Form.Label>
        <Form.Select id={id} value={props.value} aria-describedby={props.help ? `${id}-help` : undefined}
                     onChange={event => props.onChange(event.target.value)}>
            {props.options.map(option => <option key={option.value} value={option.value}>{option.text}</option>)}
        </Form.Select>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
