import React, {useId} from "react";
import {joinIds} from "./describedBy";
import "./BooleanField.css";

interface BooleanFieldProps {
    checked: boolean;
    /** Reports the requested value; the caller owns the state. */
    onChange: (checked: boolean) => void;
    label: string;
    /** `switch` is a compact track at the end of the row, `checkbox` a box; both are the same native checkbox. */
    variant: "switch" | "checkbox";
    disabled?: boolean;
    /** Id of an element that explains the field (for example why it is disabled); joined with the help text. */
    describedBy?: string;
    /** A short explanation shown under the row and linked by aria-describedby. */
    help?: string;
}

/**
 * A controlled boolean field: a native checkbox with its label, in two looks. Native checked, change and Space behaviour are
 * kept and no role is added (the switch is announced as a checkbox). It brings its own appearance and needs no ancestor rules.
 */
export function BooleanField(props: BooleanFieldProps) {
    const id = useId();
    const helpId = `${id}-help`;
    return <div className={`bool-field bool-field-${props.variant}`}>
        <div className="bool-field-row">
            <input id={id} type="checkbox" className="bool-field-input" checked={props.checked} disabled={props.disabled}
                   aria-describedby={joinIds(props.describedBy, props.help && helpId)}
                   // Enter on a checkbox would otherwise submit an enclosing form; Space is the key that toggles it.
                   onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
                   onChange={event => props.onChange(event.target.checked)}/>
            <label htmlFor={id} className="bool-field-label">{props.label}</label>
        </div>
        {props.help && <p id={helpId} className="bool-field-help">{props.help}</p>}
    </div>;
}
