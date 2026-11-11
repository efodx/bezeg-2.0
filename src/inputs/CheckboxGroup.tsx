import React, {useId} from "react";
import {BooleanField} from "./BooleanField";
import "./CheckboxGroup.css";

export interface CheckboxGroupOption {
    key: string;
    label: string;
    checked: boolean;
}

interface CheckboxGroupProps {
    /** Visible label that names the group. */
    label: string;
    options: CheckboxGroupOption[];
    /** Reports the requested value of one option; the caller owns the state. */
    onChange: (key: string, checked: boolean) => void;
    /** Id of an element that explains the group; passed to every checkbox. */
    describedBy?: string;
}

/** A labelled group of independent checkboxes, one `BooleanField` per option. */
export function CheckboxGroup(props: CheckboxGroupProps) {
    const labelId = useId();
    return <div role="group" aria-labelledby={labelId} className="checkbox-group">
        <div id={labelId} className="form-label">{props.label}</div>
        {props.options.map(option => <BooleanField key={option.key} variant="checkbox" label={option.label} checked={option.checked}
                                                   describedBy={props.describedBy} onChange={checked => props.onChange(option.key, checked)}/>)}
    </div>;
}
