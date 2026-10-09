import React, {useEffect, useId, useState} from "react";
import {Form} from "react-bootstrap";

export function OnOffSwitch(props: {
    initialState?: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    disabled?: boolean
}) {
    const initialState = props.initialState === undefined ? true : props.initialState;
    const [checked, setChecked] = useState(initialState);
    const id = useId();
    useEffect(() => setChecked(initialState), [initialState]);
    return <Form> <Form.Check
        disabled={props.disabled}// prettier-ignore
        type="switch"
        id={id}
        label={props.label}
        checked={checked}
        onChange={() => {
            props.onChange(!checked);
            setChecked(!checked);
        }}/>
    </Form>;
}
