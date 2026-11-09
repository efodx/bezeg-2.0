import {useId, useState} from "react";
import Form from "react-bootstrap/Form";
import {useT} from "../localization";
import {joinIds} from "./describedBy";

interface ChoiceSelectProps {
    /** Visible label, also the accessible name of the native select. */
    label: string;
    value: string;
    options: readonly { value: string; text: string; disabled?: boolean; ariaLabel?: string }[];
    onChange: (value: string) => void;
    help?: string;
    /** Why no choice can be made now (decision 34): shown as a visible line, linked to the select, which is aria-disabled (never native `disabled`, which hides the reason) and ignores changes (a refused change announces the reason once in a polite status line). */
    reason?: string;
}

/** A labelled native select for choosing one of a few named options (keyboard and touch work as for any select). */
export function ChoiceSelect(props: ChoiceSelectProps) {
    useT();
    const id = useId();
    const [refused, setRefused] = useState(0);
    return <Form>
        <Form.Label htmlFor={id}>{props.label}</Form.Label>
        <Form.Select id={id} value={props.value} aria-describedby={joinIds(props.help ? `${id}-help` : undefined, props.reason ? `${id}-reason` : undefined)}
                     aria-disabled={props.reason ? true : undefined}
                     onChange={event => {
                         if (!props.reason) props.onChange(event.target.value);
                         else setRefused(count => count + 1);
                     }}>
            {props.options.map(option => <option key={option.value} value={option.value} disabled={option.disabled} aria-label={option.ariaLabel}>{option.text}</option>)}
        </Form.Select>
        {props.reason && <p id={`${id}-reason`} className="inspector-help" data-choice-reason>{props.reason}</p>}
        <div role="status" aria-live="polite">{props.reason && refused > 0 && <p key={refused} className="inspector-help" data-choice-refused>{props.reason}</p>}</div>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
