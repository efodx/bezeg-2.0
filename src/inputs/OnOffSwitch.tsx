import React from "react";
import {BooleanField} from "./BooleanField";

/** A controlled switch (the switch variant of `BooleanField`): it shows `checked` and reports the requested value; the caller owns the state. */
export function OnOffSwitch(props: {
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    disabled?: boolean,
    describedBy?: string,
    help?: string
}) {
    return <BooleanField variant="switch" {...props}/>;
}
