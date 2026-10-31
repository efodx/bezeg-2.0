import React, {useId} from "react";
import {Form} from "react-bootstrap";

/** A controlled switch: it shows `checked` and reports the requested value; the caller owns the state. */
export function OnOffSwitch(props: {
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    disabled?: boolean,
    describedBy?: string
}) {
    const id = useId();
    return <Form> <Form.Check
        disabled={props.disabled}// prettier-ignore
        type="switch"
        id={id}
        aria-describedby={props.describedBy}
        label={props.label}
        checked={props.checked}
        onChange={() => props.onChange(!props.checked)}/>
    </Form>;
}
